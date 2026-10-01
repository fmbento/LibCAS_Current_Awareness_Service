import React, { useState } from 'react';
import { EnrichedBook } from '../types/bibliographic';
import { formatIsbnForDisplay, getOpacUrl, sanitizeCategories, isBoilerplateSummary, optimizeCoverUrl } from '../services/isbnCleaner';
import { generateBookCoverFallback } from '../services/emailHtmlGenerator';
import { Edit2, Sparkles, ExternalLink, Check, Star, RefreshCw, Globe, BookOpen } from 'lucide-react';

interface BookCardProps {
  book: EnrichedBook;
  index: number;
  onToggleSelect: (id: string) => void;
  onEdit: (book: EnrichedBook) => void;
  onEnrichAi: (book: EnrichedBook) => void;
  onReEnrichSingle: (book: EnrichedBook) => void;
  onSearchWeb?: (book: EnrichedBook) => void;
  isAiEnriching?: boolean;
  isWebSearching?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  index,
  onToggleSelect,
  onEdit,
  onEnrichAi,
  onReEnrichSingle,
  onSearchWeb,
  isAiEnriching = false,
  isWebSearching = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const coverUrl = !imgError && optimizeCoverUrl(book.customCoverUrl || book.enriched?.coverUrl);
  const fallbackSvg = generateBookCoverFallback(book.title, book.author);

  const rawSummary = book.customSummary || book.enriched?.summary;
  const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
  const isbnDisplay = formatIsbnForDisplay(book.enriched?.cleanIsbn || book.isbn);
  const rating = book.enriched?.averageRating;
  const ratingsCount = book.enriched?.ratingsCount;
  const cleanCategories = sanitizeCategories(book.enriched?.categories);
  const relevance = isBoilerplateSummary(book.enriched?.aiRelevance) ? undefined : book.enriched?.aiRelevance;

  const opacUrl = book.enriched?.opacUrl || getOpacUrl(book.biblionumber);

  // Identify human-readable source label
  const summarySource = book.customSummarySource || book.enriched?.summarySource;
  const sourceName =
    book.enriched?.sourceDetail ||
    (summarySource === 'goodreads'
      ? 'GoodReads (Catálogo Oficial)'
      : summarySource === 'wook'
      ? 'Wook.pt (Livraria Online)'
      : summarySource === 'bertrand'
      ? 'Bertrand Livreiros'
      : summarySource === 'fnac'
      ? 'FNAC Portugal'
      : summarySource === 'web_search'
      ? 'Pesquisa Web & Editoras'
      : summarySource === 'google_books'
      ? 'Google Books'
      : summarySource === 'open_library'
      ? 'Open Library'
      : summarySource === 'gemini_ai'
      ? 'Síntese Editorial'
      : summarySource === 'manual'
      ? 'Editado Manualmente'
      : null);

  return (
    <article
      className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
        book.selectedForEmail
          ? 'border-[#D6CEBE] shadow-xs ring-1 ring-[#9A3412]/15'
          : 'border-[#E7E3DC] opacity-75 hover:opacity-100 bg-[#FAFAF8]'
      }`}
    >
      <div className="p-5 flex flex-col sm:flex-row gap-5">
        
        {/* Left: Book Cover & Selection Toggle */}
        <div className="shrink-0 flex flex-col items-center sm:items-start gap-3">
          <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-md overflow-hidden bg-[#EAE5DC] border border-[#D6D3CD] shadow-xs group/img">
            <img
              src={coverUrl || fallbackSvg}
              alt={`Capa de ${book.title}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-102"
              loading="lazy"
            />
            {book.enriched?.coverSource && (
              <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-medium">
                {book.enriched.coverSource === 'goodreads'
                  ? 'GoodReads'
                  : book.enriched.coverSource === 'google_books'
                  ? 'G-Books'
                  : book.enriched.coverSource === 'open_library'
                  ? 'OpenLib'
                  : 'Capa'}
              </span>
            )}
          </div>

          {/* Email Inclusion Toggle */}
          <button
            type="button"
            onClick={() => onToggleSelect(book.id)}
            className={`w-full py-1 px-2 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors ${
              book.selectedForEmail
                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                : 'bg-white text-[#78716C] border-[#D6D3CD] hover:border-[#1C1917] hover:text-[#1C1917]'
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${book.selectedForEmail ? 'opacity-100' : 'opacity-0'}`} />
            <span>{book.selectedForEmail ? 'No Boletim' : 'Incluir'}</span>
          </button>
        </div>

        {/* Right: Bibliographic Details, Call Number & Synopsis */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          
          <div>
            {/* Top metadata line: Shelfmark / Cota + Accession number + OPAC availability */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[#1E3A8A] font-semibold bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE]">
                  <span>COTA:</span>
                  <span>{book.itemcallnumber || 'Balcão de Atendimento'}</span>
                  {book.biblionumber && (
                    <>
                      <span className="text-[#93C5FD]">/</span>
                      <span className="text-[#475569] font-normal">Nº {book.biblionumber}</span>
                    </>
                  )}
                </div>

                {opacUrl && (
                  <a
                    href={opacUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] hover:text-[#166534] border border-[#BBF7D0] px-2 py-0.5 rounded transition-colors shadow-2xs"
                    title="Ver disponibilidade em tempo real no Koha OPAC da Universidade de Aveiro"
                  >
                    <span>Ver disponibilidade</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#15803D]" />
                  </a>
                )}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-xs text-[#78716C]">
                {book.status === 'enriching' ? (
                  <span className="text-[#D97706] flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> A consultar catálogos...
                  </span>
                ) : book.status === 'enriched' ? (
                  <span className="text-[#15803D]">Enriquecido</span>
                ) : book.status === 'partial' ? (
                  <span className="text-[#A16207]">Parcial</span>
                ) : book.status === 'error' ? (
                  <span className="text-[#B91C1C]">Não encontrado</span>
                ) : (
                  <span className="text-[#A8A29E]">Pendente</span>
                )}
              </div>
            </div>

            {/* Book Title */}
            <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#1C1917] leading-snug tracking-tight mb-1">
              <span className="text-[#78716C] font-mono text-sm font-normal mr-1.5">
                {String(index + 1).padStart(2, '0')}.
              </span>
              {book.title}
            </h3>

            {/* Author, Publisher, Year (Clean unboxed metadata) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#57534E] mb-2.5">
              <span className="font-medium text-[#1C1917]">{book.author}</span>
              {book.publicationyear && (
                <>
                  <span className="text-[#D6D3CD]">·</span>
                  <span>{book.publicationyear}</span>
                </>
              )}
              {book.enriched?.publisher && (
                <>
                  <span className="text-[#D6D3CD]">·</span>
                  <span className="italic">{book.enriched.publisher}</span>
                </>
              )}
              {book.enriched?.pageCount && (
                <>
                  <span className="text-[#D6D3CD]">·</span>
                  <span>{book.enriched.pageCount} pág.</span>
                </>
              )}
            </div>

            {/* Rating if available */}
            {rating !== undefined && (
              <div className="flex items-center gap-1.5 mb-2.5 text-xs">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(rating) ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-[#1C1917]">{rating.toFixed(1)}</span>
                {ratingsCount ? (
                  <span className="text-[#78716C]">({ratingsCount} avaliações)</span>
                ) : null}
              </div>
            )}

            {/* Categories / Subjects (Zero-pill text tags with separators) */}
            {cleanCategories && cleanCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-[#78350F] mb-3">
                <span className="font-medium text-[#57534E]">Assuntos:</span>
                {cleanCategories.map((cat, i) => (
                  <React.Fragment key={cat}>
                    <span>{cat}</span>
                    {i < cleanCategories.length - 1 && (
                      <span className="text-[#D6D3CD]">/</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Summary / Sinopse */}
            <div className="text-xs text-[#292524] leading-relaxed mb-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#78716C]">
                  <span className="font-bold uppercase tracking-wider text-[#44403C]">Sumário</span>
                  {sourceName && (
                    <>
                      <span>·</span>
                      <span className="text-[#9A3412] font-medium font-sans">
                        {sourceName}
                      </span>
                    </>
                  )}
                </div>

                {onSearchWeb && (
                  <button
                    type="button"
                    onClick={() => onSearchWeb(book)}
                    disabled={isWebSearching}
                    className="text-[11px] text-[#9A3412] hover:text-[#782A0E] font-semibold flex items-center gap-1 transition-colors"
                    title="Pesquisar sinopse na Wook, Bertrand, FNAC e sites de editoras"
                  >
                    <Globe className={`w-3 h-3 ${isWebSearching ? 'animate-spin' : ''}`} />
                    <span>{isWebSearching ? 'A pesquisar...' : 'Procurar na Wook/Web'}</span>
                  </button>
                )}
              </div>

              {summary ? (
                <div>
                  <p className="font-editorial text-[13px] text-[#38332E]">
                    {isExpanded || summary.length <= 260
                      ? summary
                      : `${summary.slice(0, 260)}...`}
                  </p>
                  {summary.length > 260 && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-[11px] text-[#9A3412] hover:underline font-semibold mt-1"
                    >
                      {isExpanded ? 'Ver menos' : 'Ler sumário completo'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-[#FAF7F2] border border-dashed border-[#E2DDD5] rounded-md text-[#78716C] italic text-[11px] flex flex-wrap items-center justify-between gap-2">
                  <span>Sinopse ainda não obtida para este ISBN.</span>
                  <div className="flex items-center gap-2 not-italic">
                    {onSearchWeb && (
                      <button
                        type="button"
                        onClick={() => onSearchWeb(book)}
                        disabled={isWebSearching}
                        className="text-[#9A3412] hover:underline font-semibold flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Wook / Web</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEnrichAi(book)}
                      disabled={isAiEnriching}
                      className="text-[#78350F] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-[#B45309]" />
                      <span>Gerar com IA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Curatorial Relevance Note if generated */}
            {relevance && (
              <div className="p-2 bg-[#F8FAFC] border-l-2 border-[#1E3A8A] text-[11px] text-[#334155] mb-3">
                <strong className="text-[#1E3A8A]">Relevância:</strong> {relevance}
              </div>
            )}
          </div>

          {/* Bottom Card Actions & Footnote Links */}
          <div className="pt-3 border-t border-[#F2EFE9] flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Direct Portuguese Bookshop & Catalog Quick Links */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-[#57534E]">
              <span className="font-mono text-[10px] text-[#78716C] mr-1">
                {isbnDisplay || 'Sem ISBN'}
              </span>

              {book.enriched?.wookLink && (
                <a
                  href={book.enriched.wookLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 text-[#9A3412] hover:bg-[#FDF2E9] rounded font-medium flex items-center gap-0.5 transition-colors"
                  title="Abrir pesquisa na Wook.pt"
                >
                  <span>Wook.pt</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#9A3412]/60" />
                </a>
              )}

              {book.enriched?.bertrandLink && (
                <a
                  href={book.enriched.bertrandLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 text-[#1E3A8A] hover:bg-[#EFF6FF] rounded font-medium flex items-center gap-0.5 transition-colors"
                  title="Abrir pesquisa na Bertrand Livreiros"
                >
                  <span>Bertrand</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#1E3A8A]/60" />
                </a>
              )}

              {book.enriched?.goodreadsLink && (
                <a
                  href={book.enriched.goodreadsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded transition-colors flex items-center gap-0.5"
                  title="Consultar no GoodReads"
                >
                  <span>Goodreads</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#A8A29E]" />
                </a>
              )}
            </div>

            {/* Card Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onReEnrichSingle(book)}
                className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded transition-colors"
                title="Voltar a consultar Google Books / OpenLibrary"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onEnrichAi(book)}
                disabled={isAiEnriching}
                className="px-2 py-1 text-[11px] font-medium text-[#78350F] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] border border-[#FDE68A] rounded transition-colors flex items-center gap-1"
                title="Sintetizar/traduzir sinopse para Português europeu com IA"
              >
                <Sparkles className="w-3 h-3 text-[#B45309]" />
                <span>IA Sinopse</span>
              </button>

              <button
                type="button"
                onClick={() => onEdit(book)}
                className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded transition-colors"
                title="Editar dados da obra e colar sinopse da Wook manualmente"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </article>
  );
};
