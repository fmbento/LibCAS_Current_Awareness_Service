import { EnrichedBook, EnrichedData } from '../types/bibliographic';
import { extractCleanIsbns, getPrimaryIsbn, getOpacUrl, sanitizeCategories, optimizeCoverUrl, isBoilerplateSummary } from './isbnCleaner';

export interface EnrichmentProgressCallback {
  (current: number, total: number, currentBookTitle: string): void;
}

/**
 * Normalizes image URL to HTTPS and improves zoom quality for Google Books
 */
export function optimizeGoogleCoverUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let optimized = url.replace(/^http:\/\//i, 'https://');
  // If it's a google books URL, remove edge curl and request clean resolution
  if (optimized.includes('books.google.com')) {
    optimized = optimized.replace('&edge=curl', '');
    // Replace zoom=5 or zoom=1 with zoom=1 (or zoom=2 if available)
    if (!optimized.includes('&zoom=')) {
      optimized += '&zoom=1';
    }
  }
  return optimized;
}

/**
 * Searches Google Books API by ISBN or Title+Author
 */
async function fetchGoogleBooksData(isbn: string, title?: string, author?: string): Promise<any | null> {
  // 1. Try by ISBN
  if (isbn && isbn.length >= 9) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.totalItems > 0 && data.items?.[0]?.volumeInfo) {
          return data.items[0].volumeInfo;
        }
      }
    } catch (e) {
      console.warn('Google Books ISBN fetch error:', e);
    }
  }

  // 2. Fallback to title + author query if title is given
  if (title) {
    try {
      // Clean author name: remove "org.", "ed. by", etc.
      const cleanAuthor = (author || '')
        .replace(/\borg\.?\b/gi, '')
        .replace(/\bed\.?(\s+by)?\b/gi, '')
        .replace(/\bcoords?\.?\b/gi, '')
        .trim();

      const queryParts = [`intitle:${encodeURIComponent(title)}`];
      if (cleanAuthor) {
        queryParts.push(`inauthor:${encodeURIComponent(cleanAuthor)}`);
      }
      const query = queryParts.join('+');
      const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.totalItems > 0 && data.items?.[0]?.volumeInfo) {
          return data.items[0].volumeInfo;
        }
      }
    } catch (e) {
      console.warn('Google Books Title/Author fallback fetch error:', e);
    }
  }

  return null;
}

/**
 * Searches Open Library by ISBN
 */
async function fetchOpenLibraryData(isbn: string): Promise<any | null> {
  if (!isbn) return null;
  
  // 1. Try direct ISBN edition endpoint
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          publishers: data.publishers ? data.publishers.map((p: string) => ({ name: p })) : [],
          publish_date: data.publish_date,
          number_of_pages: data.number_of_pages,
          subjects: data.subjects || [],
          cover: data.covers?.length ? { large: `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg` } : undefined,
        };
      }
    }
  } catch (e) {
    // fallback
  }

  // 2. Try jscmd=data endpoint
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const key = `ISBN:${isbn}`;
      if (data[key]) {
        return data[key];
      }
    }
  } catch (e) {
    console.warn('Open Library fetch error:', e);
  }

  return null;
}

/**
 * Checks if OpenLibrary cover image exists
 */
async function checkOpenLibraryCoverExists(isbn: string): Promise<string | null> {
  if (!isbn) return null;
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
  try {
    const res = await fetch(coverUrl, { method: 'HEAD' });
    if (res.ok && res.status !== 404) {
      return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Cleans HTML tags from summaries
 */
export function stripHtmlTags(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<p.*?>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Queries server endpoint for Goodreads data (high-resolution covers, authentic synopses, ratings)
 */
export async function fetchGoodreadsLookup(
  isbn: string,
  title?: string
): Promise<{
  title?: string;
  coverUrl?: string;
  summary?: string;
  averageRating?: number;
  ratingsCount?: number;
  publisher?: string;
  pageCount?: number;
  goodreadsUrl?: string;
} | null> {
  try {
    const res = await fetch('/api/goodreads-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn, title }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.available && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Goodreads lookup error:', err);
  }
  return null;
}

/**
 * Enriches a single book using Goodreads, Google Books and Open Library
 */
export async function enrichSingleBook(book: EnrichedBook): Promise<EnrichedBook> {
  const candidateIsbns = extractCleanIsbns(book.isbn);
  const primaryIsbn = getPrimaryIsbn(book.isbn);

  let gBooksInfo: any = null;
  let usedIsbn = primaryIsbn;

  // Try each candidate ISBN with Google Books
  for (const isbn of candidateIsbns) {
    gBooksInfo = await fetchGoogleBooksData(isbn, book.title, book.author);
    if (gBooksInfo) {
      usedIsbn = isbn;
      break;
    }
  }

  // If still not found, try title + author
  if (!gBooksInfo && book.title) {
    gBooksInfo = await fetchGoogleBooksData('', book.title, book.author);
  }

  // Query Goodreads directly for cover image, authentic synopsis and ratings
  const grData = await fetchGoodreadsLookup(usedIsbn || primaryIsbn, book.title);

  // Also query Open Library for extra fallback data / covers
  const olData = await fetchOpenLibraryData(usedIsbn || primaryIsbn);

  // Extract Cover: prioritize Goodreads if available, then Google Books
  let coverUrl: string | undefined = undefined;
  let coverSource: 'goodreads' | 'google_books' | 'open_library' | 'custom' | 'fallback' = 'fallback';

  if (grData?.coverUrl) {
    coverUrl = grData.coverUrl;
    coverSource = 'goodreads';
  } else if (gBooksInfo?.imageLinks?.thumbnail || gBooksInfo?.imageLinks?.smallThumbnail) {
    coverUrl = optimizeGoogleCoverUrl(
      gBooksInfo.imageLinks.large ||
      gBooksInfo.imageLinks.medium ||
      gBooksInfo.imageLinks.thumbnail ||
      gBooksInfo.imageLinks.smallThumbnail
    );
    coverSource = 'google_books';
  } else if (olData?.cover?.large || olData?.cover?.medium) {
    coverUrl = olData.cover.large || olData.cover.medium;
    coverSource = 'open_library';
  } else if (usedIsbn) {
    // Test OpenLibrary direct cover endpoint
    const olCover = await checkOpenLibraryCoverExists(usedIsbn);
    if (olCover) {
      coverUrl = olCover;
      coverSource = 'open_library';
    }
  }

  // Extract Summary: prioritize authentic Goodreads description or Google Books
  let summary: string | undefined = undefined;
  let summarySource: 'goodreads' | 'google_books' | 'open_library' | 'gemini_ai' | 'manual' = 'google_books';
  let sourceDetail: string | undefined = undefined;

  if (grData?.summary && grData.summary.length > 50) {
    summary = grData.summary;
    summarySource = 'goodreads';
    sourceDetail = 'GoodReads (Catálogo Oficial)';
  } else if (gBooksInfo?.description) {
    summary = stripHtmlTags(gBooksInfo.description);
    summarySource = 'google_books';
    sourceDetail = 'Google Books';
  } else if (olData?.description) {
    summary = typeof olData.description === 'string' ? olData.description : olData.description?.value;
    summarySource = 'open_library';
    sourceDetail = 'Open Library';
  } else if (olData?.excerpts?.[0]?.text) {
    summary = olData.excerpts[0].text;
    summarySource = 'open_library';
    sourceDetail = 'Open Library';
  }

  // Categories / Subjects
  const categories: string[] = [];
  if (gBooksInfo?.categories && Array.isArray(gBooksInfo.categories)) {
    categories.push(...gBooksInfo.categories);
  } else if (olData?.subjects && Array.isArray(olData.subjects)) {
    categories.push(...olData.subjects.slice(0, 4).map((s: any) => (typeof s === 'string' ? s : s.name)));
  }

  // Ratings: prefer Goodreads community rating or Google Books
  const averageRating = grData?.averageRating || gBooksInfo?.averageRating || undefined;
  const ratingsCount = grData?.ratingsCount || gBooksInfo?.ratingsCount || undefined;

  // Publisher & Publication Year
  const publisher = grData?.publisher || gBooksInfo?.publisher || olData?.publishers?.[0]?.name || undefined;
  const publishedDate = gBooksInfo?.publishedDate || olData?.publish_date || undefined;
  const pageCount = grData?.pageCount || gBooksInfo?.pageCount || olData?.number_of_pages || undefined;

  // Links
  const previewLink = gBooksInfo?.previewLink || undefined;
  const infoLink = gBooksInfo?.infoLink || undefined;
  const queryParam = usedIsbn || encodeURIComponent(book.title);
  const wookLink = `https://www.wook.pt/pesquisa/${queryParam}`;
  const bertrandLink = `https://www.bertrand.pt/pesquisa/${queryParam}`;
  const fnacLink = `https://www.fnac.pt/SearchResult/ResultList.aspx?Search=${queryParam}`;
  const porbaseLink = usedIsbn
    ? `https://porbase.bnportugal.gov.pt/ipac20/ipac.jsp?profile=porbase&index=ISBN&term=${encodeURIComponent(usedIsbn)}`
    : undefined;
  const goodreadsLink = grData?.goodreadsUrl || `https://www.goodreads.com/search?q=${queryParam}`;

  const cleanExistingSummary = isBoilerplateSummary(book.enriched?.summary) ? undefined : book.enriched?.summary;
  const finalCoverUrl = optimizeCoverUrl(coverUrl || book.enriched?.coverUrl);
  const finalCoverSource = coverUrl ? coverSource : (book.enriched?.coverSource || undefined);
  const finalSummary = summary || cleanExistingSummary;
  const finalSummarySource = summary ? summarySource : (cleanExistingSummary ? book.enriched?.summarySource : undefined);
  const opacUrl = book.enriched?.opacUrl || getOpacUrl(book.biblionumber);

  const enrichedData: EnrichedData = {
    cleanIsbn: usedIsbn || primaryIsbn,
    coverUrl: finalCoverUrl,
    coverSource: finalCoverUrl ? finalCoverSource : undefined,
    summary: finalSummary,
    summarySource: finalSummary ? finalSummarySource : undefined,
    sourceDetail: book.enriched?.sourceDetail,
    alternativeSummaries: book.enriched?.alternativeSummaries,
    aiRelevance: isBoilerplateSummary(book.enriched?.aiRelevance) ? undefined : book.enriched?.aiRelevance,
    publisher: publisher || book.enriched?.publisher,
    publishedDate: publishedDate || book.enriched?.publishedDate,
    pageCount: pageCount || book.enriched?.pageCount,
    categories: sanitizeCategories(categories.length > 0 ? categories : book.enriched?.categories),
    averageRating: averageRating || book.enriched?.averageRating,
    ratingsCount: ratingsCount || book.enriched?.ratingsCount,
    previewLink,
    infoLink,
    goodreadsLink,
    wookLink,
    bertrandLink,
    fnacLink,
    porbaseLink,
    opacUrl,
  };

  const hasData = !!(coverUrl || summary || averageRating || publisher);

  return {
    ...book,
    enriched: enrichedData,
    status: hasData ? 'enriched' : 'partial',
    lastUpdated: Date.now(),
  };
}

/**
 * Enriches a batch of books with throttling to be gentle with external APIs
 */
export async function enrichBooksBatch(
  books: EnrichedBook[],
  onProgress?: EnrichmentProgressCallback
): Promise<EnrichedBook[]> {
  const results: EnrichedBook[] = [];
  const total = books.length;

  for (let i = 0; i < total; i++) {
    const book = books[i];
    if (onProgress) {
      onProgress(i + 1, total, book.title);
    }

    try {
      const enriched = await enrichSingleBook(book);
      results.push(enriched);
    } catch (e: any) {
      console.error(`Error enriching book ${book.title}:`, e);
      results.push({
        ...book,
        status: 'error',
        errorDetails: e?.message || 'Erro ao consultar catálogos',
      });
    }

    // Small courteous pause between queries (150ms)
    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return results;
}

/**
 * Calls server Gemini AI to generate academic synopsis in Portuguese and relevance note
 */
export async function enrichBookWithAi(
  book: EnrichedBook,
  subjectArea: string = ''
): Promise<{ summary?: string; relevance?: string; subjects?: string[] } | null> {
  try {
    const res = await fetch('/api/enrich-book-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: book.title,
        author: book.author,
        isbn: book.enriched?.cleanIsbn || book.isbn,
        publicationYear: book.publicationyear,
        existingSummary: book.customSummary || book.enriched?.summary,
        subjectArea,
      }),
    });

    if (!res.ok) throw new Error('Falha no pedido ao servidor');
    const json = await res.json();
    if (json.available && json.data) {
      return json.data;
    }
  } catch (error) {
    console.warn('AI enrichment endpoint error:', error);
  }
  return null;
}

/**
 * Calls server Gemini AI to write an editorial intro letter for the bulletin
 */
export async function generateBulletinEditorialWithAi(
  libraryName: string,
  subjectArea: string,
  issueNumber: string,
  bookTitles: string[],
  customTone?: string
): Promise<string> {
  try {
    const res = await fetch('/api/generate-bulletin-editorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        libraryName,
        subjectArea,
        issueNumber,
        bookTitles,
        customTone,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.editorial) {
        return json.editorial;
      }
    }
  } catch (e) {
    console.warn('Editorial generation endpoint error:', e);
  }

  // Graceful fallback text if AI or server is offline
  return `Estimados utilizadores e comunidade de leitores,\n\nApresentamos as mais recentes obras integradas no acervo da ${libraryName || 'nossa Biblioteca'}, dedicadas à área temática de ${subjectArea || 'especialidade'}. Todos os títulos listados encontram-se disponíveis para consulta presencial e requisição domiciliária.\n\nPara requisitar qualquer uma das obras, tome nota da respectiva Cota e contacte os serviços da biblioteca.`;
}

/**
 * Searches the web and Portuguese bookstores (Wook.pt, Bertrand.pt, FNAC.pt, Editoras)
 */
export async function searchWebBookstores(
  book: EnrichedBook,
  subjectArea: string = ''
): Promise<{
  summary?: string;
  source?: 'wook' | 'bertrand' | 'fnac' | 'web_search' | 'gemini_ai' | 'goodreads';
  sourceName?: string;
  publisher?: string;
  pageCount?: number;
  subjects?: string[];
  relevance?: string;
  bookstoreUrl?: string;
  coverUrl?: string;
  averageRating?: number;
  ratingsCount?: number;
} | null> {
  const cleanIsbn = book.enriched?.cleanIsbn || getPrimaryIsbn(book.isbn);
  try {
    const res = await fetch('/api/search-web-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: book.title,
        author: book.author,
        isbn: cleanIsbn,
        publicationYear: book.publicationyear,
        subjectArea,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.available && json.data) {
        if (json.data.summary && isBoilerplateSummary(json.data.summary)) {
          json.data.summary = undefined;
        }
        if (json.data.coverUrl) {
          json.data.coverUrl = optimizeCoverUrl(json.data.coverUrl);
        }
        if (json.data.subjects) {
          json.data.subjects = sanitizeCategories(json.data.subjects);
        }
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Web bookstore search fetch error:', err);
  }

  // Graceful fallback without fake boilerplate
  const cleanSummary = isBoilerplateSummary(book.enriched?.summary) ? undefined : book.enriched?.summary;
  return {
    source: 'wook',
    sourceName: 'Wook.pt / Bertrand',
    bookstoreUrl: `https://www.wook.pt/pesquisa/${encodeURIComponent(cleanIsbn || book.title)}`,
    summary: cleanSummary,
    relevance: isBoilerplateSummary(book.enriched?.aiRelevance) ? undefined : book.enriched?.aiRelevance,
  };
}

