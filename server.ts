import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * Extracts and parses JSON from model responses (including markdown ```json ... ``` blocks)
 */
function extractJsonFromText(text: string): any {
  if (!text) return null;
  const trimmed = text.trim();

  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Try markdown ```json ... ```
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // Try finding { ... } boundaries
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}

/**
 * Filters out generic filler subjects like 'Publicações Recentes / Bibliografia', 'Publicações Recentes', 'Bibliografia', or 'Geral'
 */
function cleanSubjects(subjects: any): string[] {
  if (!Array.isArray(subjects)) return [];
  const forbiddenPatterns = [
    /publica[cç][oõ]es\s+recentes/i,
    /bibliografia/i,
    /recent\s+publications/i,
    /bibliography/i,
    /^geral$/i,
    /^sem\s+assunto$/i,
    /^assuntos?$/i,
    /^livros?$/i,
  ];

  const result: string[] = [];

  for (const raw of subjects) {
    if (!raw) continue;
    const str = String(raw).trim();
    const subParts = str.includes('/') || str.includes(';') || str.includes('|')
      ? str.split(/[\/;|]+/)
      : [str];

    for (const part of subParts) {
      const cleanPart = part.trim().replace(/^[-–—•\s]+|[-–—•\s]+$/g, '');
      if (cleanPart.length < 2) continue;
      if (!forbiddenPatterns.some((pattern) => pattern.test(cleanPart))) {
        result.push(cleanPart);
      }
    }
  }

  return Array.from(new Set(result));
}

/**
 * Fetches real book cover, description, publisher, and ratings from Goodreads
 */
async function fetchGoodreadsData(isbn?: string, title?: string): Promise<{
  title?: string;
  coverUrl?: string;
  summary?: string;
  averageRating?: number;
  ratingsCount?: number;
  publisher?: string;
  pageCount?: number;
  goodreadsUrl?: string;
} | null> {
  // Extract primary digits-only ISBN if available (e.g. 978-65-01-17665-9 -> 9786501176659)
  const cleanIsbn = isbn ? isbn.replace(/[^0-9Xx]/g, '') : '';
  const searchQueries: string[] = [];
  if (cleanIsbn) {
    searchQueries.push(cleanIsbn);
  }
  if (title && title.trim()) {
    searchQueries.push(title.trim());
  }
  if (searchQueries.length === 0) return null;

  for (const query of searchQueries) {
    const searchUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
    try {
      const { stdout: html } = await execFileAsync(
        'curl',
        [
          '-s',
          '-L',
          '--max-time',
          '8',
          '-A',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          searchUrl,
        ],
        { maxBuffer: 10 * 1024 * 1024 }
      );

      if (!html) continue;

      let bookTitle: string | undefined;
      let coverUrl: string | undefined;
      let summary: string | undefined;
      let averageRating: number | undefined;
      let ratingsCount: number | undefined;
      let publisher: string | undefined;
      let pageCount: number | undefined;
      let bookUrl = searchUrl;

      // 1. Try Next.js Apollo state from direct search/redirect page
      const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (nextMatch) {
        try {
          const json = JSON.parse(nextMatch[1]);
          const apollo = json.props?.pageProps?.apolloState || {};

          const bookObj = Object.values(apollo).find(
            (v: any) => v && v.__typename === 'Book' && (v.imageUrl || v.description)
          ) as any;

          if (bookObj) {
            bookTitle = bookObj.title;
            coverUrl = bookObj.imageUrl;
            if (bookObj.description) {
              summary = bookObj.description
                .replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
                .replace(/&ndash;/g, '–')
                .replace(/&mdash;/g, '—')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            }
            if (bookObj.details?.publisher) {
              publisher = bookObj.details.publisher;
            }
            if (bookObj.details?.numPages) {
              pageCount = bookObj.details.numPages;
            }
          }

          const workObj = Object.values(apollo).find(
            (v: any) => v && v.__typename === 'Work' && v.stats
          ) as any;
          if (workObj?.stats) {
            averageRating = workObj.stats.averageRating ? Number(workObj.stats.averageRating) : undefined;
            ratingsCount = workObj.stats.ratingsCount ? Number(workObj.stats.ratingsCount) : undefined;
          }
        } catch (err) {
          console.warn('Error parsing Goodreads __NEXT_DATA__:', err);
        }
      }

      // 2. If on search results page with book show link, fetch the book show page
      const bookShowMatch = html.match(/\/book\/show\/(\d+[^"?\s<]+)/);
      if (bookShowMatch) {
        bookUrl = `https://www.goodreads.com${bookShowMatch[0]}`;
        // If we don't have full description or cover yet, fetch the dedicated book page
        if (!summary || !coverUrl) {
          try {
            const { stdout: showHtml } = await execFileAsync(
              'curl',
              [
                '-s',
                '-L',
                '--max-time',
                '8',
                '-A',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                bookUrl,
              ],
              { maxBuffer: 10 * 1024 * 1024 }
            );

            if (showHtml) {
              const showNextMatch = showHtml.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
              if (showNextMatch) {
                const showJson = JSON.parse(showNextMatch[1]);
                const showApollo = showJson.props?.pageProps?.apolloState || {};

                const showBookObj = Object.values(showApollo).find(
                  (v: any) => v && v.__typename === 'Book' && (v.imageUrl || v.description)
                ) as any;

                if (showBookObj) {
                  if (!bookTitle) bookTitle = showBookObj.title;
                  if (!coverUrl) coverUrl = showBookObj.imageUrl;
                  if (showBookObj.description && !summary) {
                    summary = showBookObj.description
                      .replace(/<br\s*[\/]?>/gi, '\n')
                      .replace(/<[^>]+>/g, '')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&amp;/g, '&')
                      .replace(/&ndash;/g, '–')
                      .replace(/&mdash;/g, '—')
                      .replace(/\n{3,}/g, '\n\n')
                      .trim();
                  }
                  if (!publisher && showBookObj.details?.publisher) publisher = showBookObj.details.publisher;
                  if (!pageCount && showBookObj.details?.numPages) pageCount = showBookObj.details.numPages;
                }

                const showWorkObj = Object.values(showApollo).find(
                  (v: any) => v && v.__typename === 'Work' && v.stats
                ) as any;
                if (showWorkObj?.stats) {
                  if (averageRating === undefined && showWorkObj.stats.averageRating) {
                    averageRating = Number(showWorkObj.stats.averageRating);
                  }
                  if (ratingsCount === undefined && showWorkObj.stats.ratingsCount) {
                    ratingsCount = Number(showWorkObj.stats.ratingsCount);
                  }
                }
              }

              // Fallback metadata tags if Next data was incomplete
              if (!summary) {
                const ogDescMatch = showHtml.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                                    showHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
                if (ogDescMatch && ogDescMatch[1] && ogDescMatch[1].length > 30) {
                  summary = ogDescMatch[1]
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&amp;/g, '&')
                    .trim();
                }
              }
              if (!coverUrl) {
                const ogImgMatch = showHtml.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                if (ogImgMatch && ogImgMatch[1]) {
                  coverUrl = ogImgMatch[1];
                }
              }
            }
          } catch (e) {
            console.warn('Error fetching Goodreads show page:', e);
          }
        }
      }

      // 3. Fallback regex for cover image if not found in __NEXT_DATA__
      if (!coverUrl) {
        const imgMatch = html.match(/https:\/\/(?:m\.media-amazon\.com\/images\/S\/compressed\.photo\.goodreads\.com|images-na\.ssl-images-amazon\.com|i\.gr-assets\.com)[^"'\s<>]+\.(?:jpg|jpeg|png)/i) ||
                         html.match(/https:\/\/[^"]*compressed\.photo\.goodreads\.com\/books\/[^"]+/);
        if (imgMatch) {
          coverUrl = imgMatch[0];
        }
      }

      // Filter out nophoto placeholder covers
      if (coverUrl && (coverUrl.includes('nophoto') || coverUrl.includes('placeholder'))) {
        coverUrl = undefined;
      }

      if (coverUrl || summary || averageRating) {
        return {
          title: bookTitle,
          coverUrl,
          summary,
          averageRating,
          ratingsCount,
          publisher,
          pageCount,
          goodreadsUrl: bookUrl,
        };
      }
    } catch (err) {
      console.warn('Goodreads fetch error:', err);
    }
  }

  return null;
}

// Endpoint 0: Dedicated Goodreads Lookup (Covers, Sinopses, Avaliações)
app.post('/api/goodreads-lookup', async (req: Request, res: Response) => {
  try {
    const { isbn, title } = req.body;
    const data = await fetchGoodreadsData(isbn, title);
    if (data) {
      return res.status(200).json({ available: true, data });
    }
    return res.status(200).json({ available: false, data: null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao consultar Goodreads' });
  }
});

// Endpoint 1: Search Web & Portuguese Bookstores (Wook.pt, Bertrand.pt, FNAC.pt, Editoras, Goodreads)
app.post('/api/search-web-sources', async (req: Request, res: Response) => {
  try {
    const { title, author, isbn, publicationYear, subjectArea } = req.body;

    // Step 1: Check Goodreads first for authentic edition data & cover
    const grData = await fetchGoodreadsData(isbn, title);
    let candidateCover = grData?.coverUrl;
    let candidateSummary = grData?.summary;
    let candidatePublisher = grData?.publisher;
    let candidatePageCount = grData?.pageCount;
    let candidateRating = grData?.averageRating;
    let candidateRatingsCount = grData?.ratingsCount;

    // If Goodreads already has an authentic Portuguese synopsis (or extensive description)
    const isPortugueseDesc = candidateSummary && (
      candidateSummary.includes(' e ') ||
      candidateSummary.includes(' de ') ||
      candidateSummary.includes(' dos ') ||
      candidateSummary.includes(' para ')
    );

    // If Gemini is not available, return Goodreads data if found
    if (!ai) {
      if (candidateSummary || candidateCover) {
        return res.status(200).json({
          available: true,
          data: {
            found: true,
            source: 'goodreads',
            sourceName: 'GoodReads (Catálogo Oficial)',
            summary: candidateSummary,
            coverUrl: candidateCover,
            publisher: candidatePublisher,
            pageCount: candidatePageCount,
            averageRating: candidateRating,
            ratingsCount: candidateRatingsCount,
            bookstoreUrl: grData?.goodreadsUrl || `https://www.wook.pt/pesquisa/${encodeURIComponent(isbn || title)}`,
          },
        });
      }
      return res.status(200).json({ available: false, message: 'Sem IA configurada' });
    }

    // Step 2: Formulate prompt for Gemini with Google Search Grounding to find Portuguese bookstore synopsis or translate Goodreads
    const prompt = `Você é um bibliotecário e investigador bibliográfico sénior em Portugal.
Encontre ou elabore a sinopse REAL, substancial e informativa da seguinte obra:

- Título: ${title || 'N/D'}
- Autor(es): ${author || 'N/D'}
- ISBN: ${isbn || 'N/D'}
- Ano: ${publicationYear || 'N/D'}
- Área Temática: ${subjectArea || 'Geral'}
${candidateSummary ? `- Descrição obtida no Goodreads/Editora: """${candidateSummary.slice(0, 1500)}"""` : ''}

REGRAS CRÍTICAS ANTI-ENCHIMENTO (MUITO IMPORTANTE):
1. É TERMINANTEMENTE PROIBIDO gerar texto burocrático ou genérico como:
   "Obra no domínio de...", "Obra recomendada para consulta presencial...", "Título catalogado na biblioteca...".
   Isso NÃO acrescenta qualquer valor.
2. A sinopse DEVE OBRIGATORIAMENTE descrever o CONTEÚDO REAL DA OBRA:
   - Qual é a história, o tema histórico ou o objeto de estudo?
   - O que é abordado nos capítulos ou artigos (e.g. no caso de "Suplemento Juvenil", explicar que comemora os 90 anos do tabloide de 1934 criado por Adolfo Aizen que revolucionou a publicação de quadradinhos/banda desenhada no Brasil)?
   - Quem são os colaboradores, período histórico ou personagens em foco?
3. Se a descrição existente for em inglês, traduza e sintetize com rigor científico para Português de Portugal.
4. Identifique o nome real da editora e páginas.

Retorne ESTRITAMENTE um objeto JSON:
\`\`\`json
{
  "found": true,
  "source": "${candidateSummary ? 'goodreads' : 'wook'}",
  "sourceName": "${candidateSummary ? 'GoodReads / Ficha Editorial' : 'Wook.pt / Bertrand'}",
  "summary": "Sinopse rica e informativa em Português de Portugal descrevendo exatamente o conteúdo do livro",
  "publisher": "${candidatePublisher || ''}",
  "pageCount": ${candidatePageCount || 0},
  "subjects": ["Assunto 1", "Assunto 2", "Assunto 3"],
  "relevance": "Frase substantiva sobre o contributo desta obra para a área de ${subjectArea || 'estudo'}",
  "bookstoreUrl": "${grData?.goodreadsUrl || `https://www.wook.pt/pesquisa/${encodeURIComponent(isbn || title)}`}"
}
\`\`\``;

    let responseText = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        responseText = response.text || '';
        if (responseText) break;
      } catch (err: any) {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
        else console.warn('Web search grounding error:', err?.message || err);
      }
    }

    const parsed = extractJsonFromText(responseText);

    if (parsed && parsed.summary && parsed.summary.length > 40) {
      return res.status(200).json({
        available: true,
        data: {
          ...parsed,
          subjects: cleanSubjects(parsed.subjects || [subjectArea]),
          coverUrl: candidateCover,
          averageRating: candidateRating,
          ratingsCount: candidateRatingsCount,
          publisher: parsed.publisher || candidatePublisher,
          pageCount: parsed.pageCount || candidatePageCount,
        },
      });
    }

    // If model didn't return strict json, but Goodreads had a description, use Goodreads!
    if (candidateSummary) {
      return res.status(200).json({
        available: true,
        data: {
          found: true,
          source: 'goodreads',
          sourceName: 'GoodReads (Catálogo Oficial)',
          summary: candidateSummary,
          coverUrl: candidateCover,
          publisher: candidatePublisher,
          pageCount: candidatePageCount,
          averageRating: candidateRating,
          ratingsCount: candidateRatingsCount,
          bookstoreUrl: grData?.goodreadsUrl,
          subjects: cleanSubjects([subjectArea]),
          relevance: `Obra de referência temática para o estudo de ${subjectArea || 'especialidade'}.`,
        },
      });
    }

    // If model output raw prose without json, use that
    if (responseText && responseText.length > 50 && !responseText.includes('Obra no domínio de')) {
      return res.status(200).json({
        available: true,
        data: {
          found: true,
          source: 'web_search',
          sourceName: 'Pesquisa Bibliográfica',
          summary: responseText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim(),
          coverUrl: candidateCover,
          publisher: candidatePublisher,
          subjects: [subjectArea || 'Banda Desenhada'],
        },
      });
    }

    // Minimal honest response without fake filler
    return res.status(200).json({
      available: true,
      data: {
        found: !!candidateCover,
        source: candidateCover ? 'goodreads' : 'web_search',
        sourceName: candidateCover ? 'GoodReads' : 'Catálogo Online',
        summary: candidateSummary || undefined,
        coverUrl: candidateCover,
        publisher: candidatePublisher,
        pageCount: candidatePageCount,
        averageRating: candidateRating,
        ratingsCount: candidateRatingsCount,
        bookstoreUrl: grData?.goodreadsUrl || `https://www.wook.pt/pesquisa/${encodeURIComponent(isbn || title)}`,
      },
    });
  } catch (error: any) {
    console.error('Error in search-web-sources route:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao pesquisar fontes web',
    });
  }
});

// Endpoint 2: Book summary & academic Portuguese insight enrichment via Gemini
app.post('/api/enrich-book-ai', async (req: Request, res: Response) => {
  try {
    const { title, author, isbn, publicationYear, existingSummary, subjectArea } = req.body;

    // Check if Goodreads has a description we can supply as foundation
    let contextSummary = existingSummary;
    if (!contextSummary || contextSummary.includes('Obra no domínio de')) {
      const gr = await fetchGoodreadsData(isbn, title);
      if (gr?.summary) {
        contextSummary = gr.summary;
      }
    }

    if (!ai) {
      if (contextSummary) {
        return res.status(200).json({
          available: true,
          data: {
            summary: contextSummary,
            relevance: `Contributo relevante para a investigação na área de ${subjectArea || 'especialidade'}.`,
            subjects: cleanSubjects([subjectArea, 'Estudos Críticos']),
          },
        });
      }
      return res.status(200).json({
        available: false,
        message: 'GEMINI_API_KEY não configurada no servidor. Usando dados obtidos dos catálogos.',
      });
    }

    const prompt = `Você é um bibliotecário e investigador bibliográfico sénior em Portugal.
Apresente uma sinopse substantiva, rica e informativa em Português de Portugal para a seguinte obra:
- Título: ${title || 'N/D'}
- Autor(es): ${author || 'N/D'}
- ISBN: ${isbn || 'N/D'}
- Ano: ${publicationYear || 'N/D'}
- Área / Assunto do Boletim: ${subjectArea || 'Banda Desenhada & Cultura Visual'}
${contextSummary ? `- Texto de referência / Descrição original: """${contextSummary.slice(0, 1500)}"""` : ''}

REGRAS DE OURO (SEM ENCHIMENTO GENÉRICO):
1. PROIBIDO USAR CHAVÕES BUROCRÁTICOS como "Obra no domínio de...", "Obra recomendada para consulta...", "Título disponível na biblioteca".
2. A sinopse DEVE DESCREVER O QUE O LIVRO É E CONTEÚDO:
   - Exemplo para "Suplemento Juvenil": Descrever a celebração dos 90 anos do tabloide criado por Adolfo Aizen em 1934 que marcou a história dos quadradinhos, a pesquisa de Francisco Ucha, imagens raras e os grandes heróis e publicações da época.
   - Exemplo para estudos críticos: Descrever os tópicos abordados pelos ensaios (representação, estética, cultura visual, história editorial).
3. Se a informação original for em inglês, traduza e sintetize com rigor e clareza para Português de Portugal.
4. Extensão: 1 a 2 parágrafos densos e informativos (80 a 160 palavras).
5. Nos assuntos/subjects, NUNCA inclua termos genéricos como "Publicações Recentes" ou "Bibliografia". Apenas áreas e tópicos temáticos reais.

Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "summary": "sinopse substancial e informativa em português",
  "relevance": "frase concreta sobre o valor desta obra para quem estuda ${subjectArea || 'esta área'}",
  "subjects": ["Assunto 1", "Assunto 2", "Assunto 3"]
}`;

    // Attempt with retry for resilience against transient spikes
    let responseText = '';
    let success = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        responseText = response.text || '{}';
        success = true;
        break;
      } catch (err: any) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.warn('Gemini enrichment attempt error:', err?.message || err);
        }
      }
    }

    if (!success) {
      if (contextSummary) {
        return res.status(200).json({
          available: true,
          data: {
            summary: contextSummary,
            relevance: `Obra de referência para investigadores no domínio de ${subjectArea || 'especialidade'}.`,
            subjects: cleanSubjects([subjectArea, 'Estudos Críticos']),
          },
        });
      }
      return res.status(200).json({
        available: false,
        message: 'Serviço temporariamente indisponível',
      });
    }

    let data = extractJsonFromText(responseText);
    if (!data) {
      data = { summary: responseText, relevance: '', subjects: [] };
    }
    if (data.subjects) {
      data.subjects = cleanSubjects(data.subjects);
    }

    return res.status(200).json({
      available: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in enrich-book-ai route:', error);
    return res.status(200).json({
      available: false,
      data: null,
      message: 'Não foi possível sintetizar com IA no momento.',
    });
  }
});

// Endpoint 3: Bulletin editorial introduction generation via Gemini
app.post('/api/generate-bulletin-editorial', async (req: Request, res: Response) => {
  try {
    const { libraryName, subjectArea, issueNumber, bookTitles, customTone } = req.body;

    if (!ai) {
      return res.status(200).json({
        available: false,
        editorial: `Estimados utilizadores e investigadores,\n\nApresentamos com satisfação as mais recentes aquisições integradas no acervo da ${libraryName || 'nossa Biblioteca'}. Este boletim reúne títulos de referência na área de ${subjectArea || 'especialidade'}, já disponíveis para consulta e empréstimo domiciliário.\n\nConsulte as cotas indicadas para localização nas estantes ou solicite a sua reserva junto do balcão de atendimento.`,
      });
    }

    const prompt = `Você é o Diretor / Curador de uma prestigiada Biblioteca em Portugal.
Crie um texto de abertura editorial elegante, acolhedor e profissional para o envio por email do "Boletim de Novas Aquisições".

Dados do Boletim:
- Nome da Biblioteca: ${libraryName || 'Biblioteca'}
- Área / Assunto em Destaque: ${subjectArea || 'Estudos Académicos'}
- Edição / Número: ${issueNumber || 'Edição Corrente'}
- Alguns dos títulos em destaque: ${(bookTitles || []).slice(0, 8).join('; ')}
- Tom desejado: ${customTone || 'Institucional, elegante e caloroso'}

Escreva em Português de Portugal (norma europeia), com cerca de 100 a 160 palavras (2 parágrafos curtos). Destaque a importância da actualização bibliográfica nesta área temática e convide os leitores a requisitar ou consultar as obras indicadas com as respectivas cotas. Não use saudações genéricas artificiais.`;

    let editorialText = '';
    let success = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
        editorialText = response.text || '';
        success = true;
        break;
      } catch (err: any) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.warn('Gemini editorial generation attempt error:', err?.message || err);
        }
      }
    }

    if (!success || !editorialText.trim()) {
      editorialText = `Estimados utilizadores e investigadores,\n\nApresentamos com satisfação as mais recentes aquisições integradas no acervo da ${libraryName || 'nossa Biblioteca'}. Este boletim reúne títulos de referência na área de ${subjectArea || 'especialidade'}, já disponíveis para consulta e empréstimo domiciliário.\n\nConsulte as cotas indicadas para localização nas estantes ou solicite a sua reserva junto do balcão de atendimento.`;
    }

    return res.status(200).json({
      available: true,
      editorial: editorialText.trim(),
    });
  } catch (error: any) {
    console.error('Error generating bulletin editorial:', error);
    return res.status(200).json({
      available: false,
      editorial: `Estimados utilizadores,\n\nApresentamos as novas obras na área de ${req.body?.subjectArea || 'especialidade'}, disponíveis para requisição.`,
    });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', hasAi: !!ai });
});

// Dev vs Prod Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LibCAS (Current Awareness Service) server running on port ${PORT}`);
  });
}

startServer();
