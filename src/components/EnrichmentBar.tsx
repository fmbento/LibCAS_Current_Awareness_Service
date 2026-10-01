import React from 'react';
import { Sparkles, RefreshCw, BookCheck, CheckSquare, Square, Layers, Globe } from 'lucide-react';

interface EnrichmentBarProps {
  totalCount: number;
  enrichedCount: number;
  selectedCount: number;
  isEnriching: boolean;
  enrichmentProgress: { current: number; total: number; title: string } | null;
  onStartEnrichment: () => void;
  onEnrichAllAi: () => void;
  onSearchAllWebBookstores: () => void;
  isAiEnrichingAll: boolean;
  isSearchingAllWeb: boolean;
  onSelectAll: (select: boolean) => void;
  allSelected: boolean;
  subjectArea: string;
}

export const EnrichmentBar: React.FC<EnrichmentBarProps> = ({
  totalCount,
  enrichedCount,
  selectedCount,
  isEnriching,
  enrichmentProgress,
  onStartEnrichment,
  onEnrichAllAi,
  onSearchAllWebBookstores,
  isAiEnrichingAll,
  isSearchingAllWeb,
  onSelectAll,
  allSelected,
  subjectArea,
}) => {
  const percent = totalCount > 0 ? Math.round((enrichedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white border border-[#E7E3DC] rounded-xl p-4 shadow-xs space-y-3.5">
      {/* Top row: Subject Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <span className="font-semibold uppercase tracking-wider text-[#9A3412]">
              Lote de Aquisições
            </span>
            <span>·</span>
            <span>{subjectArea || 'Assunto Geral'}</span>
          </div>
          <h2 className="font-editorial text-xl font-bold text-[#1C1917] mt-0.5">
            {subjectArea ? `Obras em: ${subjectArea}` : 'Catálogo de Novas Aquisições'}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Google Books & Open Library */}
          <button
            type="button"
            onClick={onStartEnrichment}
            disabled={isEnriching || isSearchingAllWeb || totalCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#9A3412] hover:bg-[#782A0E] disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            title="Consulta Google Books e Open Library para obter capas, sumários e avaliações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
            <span>{isEnriching ? 'A Enriquecer...' : 'Consultar Catálogos'}</span>
          </button>

          {/* 2. Portuguese Bookstores (Wook.pt, Bertrand, FNAC) & Web Search */}
          <button
            type="button"
            onClick={onSearchAllWebBookstores}
            disabled={isSearchingAllWeb || isEnriching || totalCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            title="Pesquisa sumários oficiais na Wook.pt, Bertrand, FNAC e sites de editoras de língua portuguesa"
          >
            <Globe className={`w-3.5 h-3.5 text-[#1E3A8A] ${isSearchingAllWeb ? 'animate-spin' : ''}`} />
            <span>{isSearchingAllWeb ? 'A Pesquisar na Web...' : 'Livrarias PT (Wook/Web)'}</span>
          </button>

          {/* 3. AI Academic Synthesis */}
          <button
            type="button"
            onClick={onEnrichAllAi}
            disabled={isAiEnrichingAll || isEnriching || isSearchingAllWeb || totalCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#78350F] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#FDE68A] disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            title="Gera sinopses académicas em Português e notas de relevância com o Gemini"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#B45309] ${isAiEnrichingAll ? 'animate-pulse' : ''}`} />
            <span>{isAiEnrichingAll ? 'A Sintetizar com IA...' : 'Sintetizar com IA'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar (if active) */}
      {(isEnriching || isSearchingAllWeb) && enrichmentProgress && (
        <div className="p-3 bg-[#FAF7F2] border border-[#E7E3DC] rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#57534E]">
            <span className="font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9A3412]" />
              A consultar: <em className="text-[#1C1917] truncate max-w-md">{enrichmentProgress.title}</em>
            </span>
            <span className="font-mono text-[#78350F] font-semibold">
              {enrichmentProgress.current} de {enrichmentProgress.total} ({Math.round((enrichmentProgress.current / enrichmentProgress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-[#E5E0D8] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#9A3412] h-full transition-all duration-300"
              style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom stats row (Zero-pill text separators) */}
      <div className="pt-2 border-t border-[#F2EFE9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#57534E]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            className="flex items-center gap-1.5 text-[#1C1917] hover:text-[#9A3412] font-medium"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-[#9A3412]" />
            ) : (
              <Square className="w-4 h-4 text-[#A8A29E]" />
            )}
            <span>{allSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}</span>
          </button>

          <span className="text-[#D6D3CD]">·</span>

          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#78716C]" />
            <span>Total: <strong>{totalCount}</strong> obras</span>
          </span>

          <span className="text-[#D6D3CD]">·</span>

          <span className="flex items-center gap-1">
            <BookCheck className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Enriquecidas: <strong>{enrichedCount}</strong> ({percent}%)</span>
          </span>
        </div>

        <div className="text-[11px] text-[#78716C]">
          <span>Selecionadas para o email: </span>
          <strong className="text-[#9A3412] font-mono text-xs">{selectedCount}</strong>
          <span> de {totalCount}</span>
        </div>
      </div>
    </div>
  );
};
