import React from 'react';
import { EnrichedBook } from '../types/bibliographic';
import { formatIsbnForDisplay, isBoilerplateSummary, optimizeCoverUrl, sanitizeCategories } from '../services/isbnCleaner';
import { generateBookCoverFallback } from '../services/emailHtmlGenerator';
import { Edit2, Sparkles, RefreshCw, Star, CheckSquare, Square, Globe, ExternalLink } from 'lucide-react';

interface BookTableViewProps {
  books: EnrichedBook[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onEdit: (book: EnrichedBook) => void;
  onEnrichAi: (book: EnrichedBook) => void;
  onReEnrichSingle: (book: EnrichedBook) => void;
  onSearchWeb?: (book: EnrichedBook) => void;
}

export const BookTableView: React.FC<BookTableViewProps> = ({
  books,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onEnrichAi,
  onReEnrichSingle,
  onSearchWeb,
}) => {
  const allSelected = books.length > 0 && books.every((b) => b.selectedForEmail);
  const someSelected = books.some((b) => b.selectedForEmail);

  return (
    <div className="bg-white border border-[#E7E3DC] rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-[#F7F4EE] border-b border-[#E7E3DC] text-[#57534E] font-medium">
              <th className="py-3 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={() => onSelectAll(!allSelected)}
                  className="text-[#1C1917] hover:text-[#9A3412]"
                  title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#9A3412]" />
                  ) : someSelected ? (
                    <div className="w-4 h-4 border border-[#9A3412] bg-[#9A3412]/20 rounded flex items-center justify-center text-[10px] text-[#9A3412] font-bold">
                      -
                    </div>
                  ) : (
                    <Square className="w-4 h-4 text-[#A8A29E]" />
                  )}
                </button>
              </th>
              <th className="py-3 px-2 w-14 text-center">Capa</th>
              <th className="py-3 px-3 font-semibold text-[#1C1917]">Cota & Registo</th>
              <th className="py-3 px-3 font-semibold text-[#1C1917]">Título & Autor</th>
              <th className="py-3 px-3">ISBN & Livrarias</th>
              <th className="py-3 px-3">Ano / Ed.</th>
              <th className="py-3 px-3">Avaliação</th>
              <th className="py-3 px-3">Sumário</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFECE6]">
            {books.map((b, idx) => {
              const coverUrl = optimizeCoverUrl(b.customCoverUrl || b.enriched?.coverUrl) || generateBookCoverFallback(b.title, b.author);
              const rawSummary = b.customSummary || b.enriched?.summary;
              const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
              const isbnFormatted = formatIsbnForDisplay(b.enriched?.cleanIsbn || b.isbn);
              const cleanCats = sanitizeCategories(b.enriched?.categories);

              return (
                <tr
                  key={b.id}
                  className={`hover:bg-[#FCFAF6] transition-colors ${
                    !b.selectedForEmail ? 'opacity-60 bg-[#FAFAF8]' : ''
                  }`}
                >
                  {/* Select */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={b.selectedForEmail}
                      onChange={() => onToggleSelect(b.id)}
                      className="rounded text-[#9A3412] focus:ring-[#9A3412] cursor-pointer"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="py-2.5 px-2 text-center">
                    <img
                      src={coverUrl}
                      alt={b.title}
                      referrerPolicy="no-referrer"
                      className="w-9 h-13 object-cover rounded border border-[#D6D3CD] mx-auto shadow-2xs"
                    />
                  </td>

                  {/* Cota & Biblionumber */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-mono font-semibold text-[#1E3A8A] bg-[#EFF6FF] px-2 py-0.5 rounded text-[11px] inline-block border border-[#DBEAFE]">
                      {b.itemcallnumber || 'Balcão'}
                    </div>
                    {b.biblionumber && (
                      <div className="text-[10px] text-[#78716C] font-mono mt-0.5">
                        Reg: {b.biblionumber}
                      </div>
                    )}
                    {(b.enriched?.opacUrl || b.biblionumber) && (
                      <div className="mt-1">
                        <a
                          href={b.enriched?.opacUrl || `https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber=${encodeURIComponent(b.biblionumber || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#15803D] hover:text-[#166534] hover:underline"
                          title="Ver disponibilidade em tempo real no Koha OPAC da UA"
                        >
                          <span>Ver disponibilidade</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </td>

                  {/* Title & Author */}
                  <td className="py-2.5 px-3 max-w-xs">
                    <div className="font-editorial text-sm font-bold text-[#1C1917] leading-snug line-clamp-1">
                      {idx + 1}. {b.title}
                    </div>
                    <div className="text-xs text-[#57534E] line-clamp-1">
                      {b.author}
                    </div>
                    {cleanCats && cleanCats.length > 0 && (
                      <div className="text-[10px] text-[#78350F] line-clamp-1 mt-0.5">
                        {cleanCats.join(' / ')}
                      </div>
                    )}
                  </td>

                  {/* ISBN & Bookstore Links */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-mono text-[11px] text-[#78350F]">
                      {isbnFormatted || '—'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] mt-1">
                      {b.enriched?.wookLink && (
                        <a
                          href={b.enriched.wookLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#9A3412] hover:underline font-semibold flex items-center gap-0.5"
                          title="Pesquisar na Wook.pt"
                        >
                          <span>Wook</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {b.enriched?.bertrandLink && (
                        <a
                          href={b.enriched.bertrandLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1E3A8A] hover:underline font-medium flex items-center gap-0.5"
                          title="Pesquisar na Bertrand"
                        >
                          <span>Bertrand</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Year / Publisher */}
                  <td className="py-2.5 px-3 text-[#57534E] whitespace-nowrap">
                    <div>{b.publicationyear || '—'}</div>
                    {b.enriched?.publisher && (
                      <div className="text-[10px] text-[#78716C] max-w-[120px] truncate">
                        {b.enriched.publisher}
                      </div>
                    )}
                  </td>

                  {/* Rating */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {b.enriched?.averageRating ? (
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="font-semibold text-xs text-[#1C1917]">
                          {b.enriched.averageRating.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#A8A29E]">—</span>
                    )}
                  </td>

                  {/* Summary preview */}
                  <td className="py-2.5 px-3 max-w-sm">
                    {summary ? (
                      <div>
                        <p className="line-clamp-2 text-[11px] text-[#44403C] font-editorial">
                          {summary}
                        </p>
                        {b.enriched?.summarySource && (
                          <span className="text-[10px] text-[#9A3412] font-sans">
                            {b.enriched.sourceDetail || b.enriched.summarySource}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#A8A29E] italic">Sem sinopse</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {onSearchWeb && (
                        <button
                          onClick={() => onSearchWeb(b)}
                          className="p-1.5 text-[#1E3A8A] hover:bg-[#EFF6FF] rounded"
                          title="Procurar sinopse na Wook e web"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onReEnrichSingle(b)}
                        className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded"
                        title="Recarregar dados online"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEnrichAi(b)}
                        className="p-1.5 text-[#78350F] hover:bg-[#FEF3C7] rounded"
                        title="Gerar sinopse com IA"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(b)}
                        className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
