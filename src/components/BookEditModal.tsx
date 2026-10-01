import React, { useState } from 'react';
import { EnrichedBook, BookSummarySource } from '../types/bibliographic';
import { X, Check, Trash2, Image, Sparkles, Globe, ExternalLink } from 'lucide-react';
import { generateBookCoverFallback } from '../services/emailHtmlGenerator';
import { getOpacUrl, sanitizeCategories, isBoilerplateSummary, optimizeCoverUrl } from '../services/isbnCleaner';

interface BookEditModalProps {
  book: EnrichedBook | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBook: EnrichedBook) => void;
  onDelete?: (id: string) => void;
  onEnrichAi?: (book: EnrichedBook) => void;
  onSearchWeb?: (book: EnrichedBook) => Promise<void> | void;
}

export const BookEditModal: React.FC<BookEditModalProps> = ({
  book,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onEnrichAi,
  onSearchWeb,
}) => {
  if (!isOpen || !book) return null;

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [isbn, setIsbn] = useState(book.isbn);
  const [itemcallnumber, setItemcallnumber] = useState(book.itemcallnumber || '');
  const [biblionumber, setBiblionumber] = useState(book.biblionumber || '');
  const [publicationyear, setPublicationyear] = useState(book.publicationyear ? String(book.publicationyear) : '');
  const [coverUrl, setCoverUrl] = useState(optimizeCoverUrl(book.customCoverUrl || book.enriched?.coverUrl) || '');
  
  const rawInitialSummary = book.customSummary || book.enriched?.summary || '';
  const initialSummary = isBoilerplateSummary(rawInitialSummary) ? '' : rawInitialSummary;
  const [summary, setSummary] = useState(initialSummary);
  
  const [categoriesText, setCategoriesText] = useState(
    sanitizeCategories(book.enriched?.categories)?.join(', ') || ''
  );
  const [summarySource, setSummarySource] = useState<BookSummarySource>(
    book.customSummarySource || book.enriched?.summarySource || 'manual'
  );
  const [sourceDetail, setSourceDetail] = useState(book.enriched?.sourceDetail || '');
  const [aiRelevance, setAiRelevance] = useState(
    isBoilerplateSummary(book.enriched?.aiRelevance) ? '' : book.enriched?.aiRelevance || ''
  );
  const [publisher, setPublisher] = useState(book.enriched?.publisher || '');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  const fallbackSvg = generateBookCoverFallback(title, author);

  const cleanIsbn = isbn.replace(/[^0-9Xx]/g, '');
  const queryParam = cleanIsbn || encodeURIComponent(title);
  const wookUrl = `https://www.wook.pt/pesquisa/${queryParam}`;
  const bertrandUrl = `https://www.bertrand.pt/pesquisa/${queryParam}`;
  const fnacUrl = `https://www.fnac.pt/SearchResult/ResultList.aspx?Search=${queryParam}`;

  const handleSave = () => {
    const parsedCats = sanitizeCategories(categoriesText ? categoriesText.split(/[,;\/]+/) : book.enriched?.categories);
    const optimizedCover = optimizeCoverUrl(coverUrl.trim()) || undefined;
    const finalSummary = isBoilerplateSummary(summary.trim()) ? undefined : summary.trim() || undefined;

    const updated: EnrichedBook = {
      ...book,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      itemcallnumber: itemcallnumber.trim() || undefined,
      biblionumber: biblionumber.trim() || undefined,
      publicationyear: publicationyear.trim() || undefined,
      customCoverUrl: optimizedCover,
      customSummary: finalSummary,
      customSummarySource: summarySource,
      enriched: {
        ...(book.enriched || { cleanIsbn: isbn }),
        coverUrl: optimizedCover || book.enriched?.coverUrl,
        publisher: publisher.trim() || undefined,
        aiRelevance: isBoilerplateSummary(aiRelevance.trim()) ? undefined : aiRelevance.trim() || undefined,
        summary: finalSummary || book.enriched?.summary,
        summarySource,
        sourceDetail: sourceDetail.trim() || undefined,
        categories: parsedCats,
        opacUrl: getOpacUrl(biblionumber) || book.enriched?.opacUrl,
        wookLink: wookUrl,
        bertrandLink: bertrandUrl,
        fnacLink: fnacUrl,
      },
    };
    onSave(updated);
    onClose();
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerWebSearch = async () => {
    if (!onSearchWeb) return;
    setIsSearchingWeb(true);
    try {
      await onSearchWeb(book);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E7E3DC] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E3DC] bg-[#FCFAF6]">
          <div>
            <h2 className="font-editorial text-xl font-bold text-[#1C1917]">
              Editar Ficha da Obra
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Consulte fontes portuguesas (Wook, Bertrand) e ajuste a sinopse e cota
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Quick Bookstore Consult Strip */}
          <div className="p-3 bg-[#FAF7F2] border border-[#E7E3DC] rounded-lg flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-xs text-[#57534E] font-medium">
              Consultar sumário original nas livrarias portuguesas:
            </span>
            <div className="flex items-center gap-2">
              <a
                href={wookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#9A3412] hover:bg-[#782A0E] rounded flex items-center gap-1 transition-colors"
              >
                <span>Abrir na Wook.pt</span>
                <ExternalLink className="w-3 h-3 text-white/80" />
              </a>
              <a
                href={bertrandUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded flex items-center gap-1 transition-colors"
              >
                <span>Bertrand</span>
                <ExternalLink className="w-3 h-3 text-white/80" />
              </a>
              <a
                href={fnacUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs font-medium text-[#44403C] bg-white border border-[#D6D3CD] hover:border-[#1C1917] rounded flex items-center gap-1 transition-colors"
              >
                <span>FNAC</span>
                <ExternalLink className="w-2.5 h-2.5 text-[#78716C]" />
              </a>
            </div>
          </div>

          {/* Top row: Cover preview & URLs */}
          <div className="flex flex-col sm:flex-row gap-4 p-3 bg-[#FAFAF7] border border-[#E7E3DC] rounded-lg">
            <div className="w-24 aspect-[2/3] shrink-0 rounded overflow-hidden bg-[#EAE5DC] border border-[#D6D3CD] shadow-xs">
              <img
                src={coverUrl || fallbackSvg}
                alt="Capa"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#44403C] uppercase mb-1">
                  URL da Capa
                </label>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://... ou carregar imagem"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D6D3CD] hover:border-[#1C1917] rounded text-[11px] font-medium text-[#44403C] transition-colors">
                  <Image className="w-3.5 h-3.5 text-[#78716C]" />
                  <span>Carregar Imagem Local</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </label>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className="text-[11px] text-[#B91C1C] hover:underline"
                  >
                    Remover Imagem
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Title & Author */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                Título da Obra <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-sm font-editorial font-bold focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#1C1917] mb-1">
                  Autor(es) / Responsabilidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1C1917] mb-1">
                  Editora
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="ex: Bertrand, Gradiva, Bloomsbury..."
                  className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
                />
              </div>
            </div>
          </div>

          {/* Cota, Biblionumber, ISBN, Year */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-[#1E3A8A] mb-1">
                Cota de Estante
              </label>
              <input
                type="text"
                value={itemcallnumber}
                onChange={(e) => setItemcallnumber(e.target.value)}
                placeholder="ex: CF-41-32"
                className="w-full px-2.5 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-xs font-mono font-semibold text-[#1E3A8A] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                Nº de Registo
              </label>
              <input
                type="text"
                value={biblionumber}
                onChange={(e) => setBiblionumber(e.target.value)}
                placeholder="ex: 305614"
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs font-mono focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                ISBN
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-..."
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs font-mono focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                Ano de Publicação
              </label>
              <input
                type="text"
                value={publicationyear}
                onChange={(e) => setPublicationyear(e.target.value)}
                placeholder="ex: 2024"
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
              />
            </div>
          </div>

          {/* Synopsis with Source selector */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-semibold text-[#1C1917]">
                Sumário / Sinopse da Obra
              </label>
              <div className="flex items-center gap-2">
                {onSearchWeb && (
                  <button
                    type="button"
                    onClick={handleTriggerWebSearch}
                    disabled={isSearchingWeb}
                    className="text-[11px] text-[#9A3412] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{isSearchingWeb ? 'A procurar...' : 'Procurar na Wook/Web'}</span>
                  </button>
                )}
                {onEnrichAi && (
                  <button
                    type="button"
                    onClick={() => onEnrichAi(book)}
                    className="text-[11px] text-[#78350F] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#B45309]" />
                    <span>Sintetizar com IA</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Cole a sinopse da Wook.pt, Bertrand ou escreva a descrição da obra..."
              className="w-full p-2.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs font-editorial leading-relaxed focus:outline-none focus:border-[#9A3412]"
            />

            {/* Source label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Origem do Sumário:
                </label>
                <select
                  value={summarySource}
                  onChange={(e) => setSummarySource(e.target.value as BookSummarySource)}
                  className="w-full px-2 py-1.5 bg-white border border-[#D6D3CD] rounded text-xs focus:outline-none"
                >
                  <option value="wook">Wook.pt (Livraria Online)</option>
                  <option value="bertrand">Bertrand Livreiros</option>
                  <option value="fnac">FNAC Portugal</option>
                  <option value="web_search">Pesquisa Web & Catálogos</option>
                  <option value="google_books">Google Books</option>
                  <option value="open_library">Open Library</option>
                  <option value="gemini_ai">Síntese Editorial IA</option>
                  <option value="manual">Manual / Biblioteca</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Nota / Detalhe da Fonte:
                </label>
                <input
                  type="text"
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  placeholder="ex: Sinopse da contra-capa (Wook.pt)"
                  className="w-full px-2 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Curatorial Note */}
          <div>
            <label className="block font-semibold text-[#1E3A8A] mb-1">
              Nota Curatorial / Relevância da Obra
            </label>
            <input
              type="text"
              value={aiRelevance}
              onChange={(e) => setAiRelevance(e.target.value)}
              placeholder="ex: Obra fundamental de referência sobre a evolução dos quadradinhos..."
              className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          {/* Subjects / Categories */}
          <div>
            <label className="block font-semibold text-[#78350F] mb-1">
              Assuntos / Tópicos Temáticos (separados por vírgula)
            </label>
            <input
              type="text"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              placeholder="ex: Banda Desenhada, Cultura Visual, História dos Quadrinhos..."
              className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#78350F]"
            />
            <span className="text-[10px] text-[#78716C] mt-0.5 block">
              Termos genéricos como &quot;Publicações Recentes&quot; ou &quot;Bibliografia&quot; são automaticamente omitidos.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FCFAF6] border-t border-[#E7E3DC] flex items-center justify-between">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Tem a certeza que deseja remover esta obra da listagem?')) {
                  onDelete(book.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Obra</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Alterações</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
