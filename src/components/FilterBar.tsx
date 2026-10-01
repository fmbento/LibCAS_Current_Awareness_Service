import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: 'all' | 'selected' | 'has_cover' | 'has_summary' | 'has_rating';
  setStatusFilter: (f: 'all' | 'selected' | 'has_cover' | 'has_summary' | 'has_rating') => void;
  sortBy: 'order' | 'title' | 'author' | 'year_desc' | 'callnumber';
  setSortBy: (s: 'order' | 'title' | 'author' | 'year_desc' | 'callnumber') => void;
  totalFiltered: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  totalFiltered,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
      
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por título, autor, cota (ex: CF-41-31), ISBN..."
          className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D6D3CD] rounded-lg focus:outline-none focus:border-[#9A3412] text-xs text-[#1C1917] placeholder:text-[#A8A29E] transition-colors shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917] text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* Segmented Filter Buttons (Zero-pill compliant interactive button group) */}
      <div className="flex items-center overflow-x-auto pb-1 md:pb-0 gap-1 bg-[#EFECE6] p-1 rounded-lg border border-[#E2DDD5]">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'all'
              ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Todas
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('selected')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'selected'
              ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          No Boletim
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('has_cover')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'has_cover'
              ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Com Capa
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('has_summary')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'has_summary'
              ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Com Sinopse
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('has_rating')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'has_rating'
              ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
              : 'text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Com Avaliações
        </button>
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2 shrink-0">
        <ArrowUpDown className="w-3.5 h-3.5 text-[#78716C]" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-white border border-[#D6D3CD] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#9A3412]"
        >
          <option value="order">Ordem da Lista Original</option>
          <option value="title">Título (A-Z)</option>
          <option value="author">Autor (A-Z)</option>
          <option value="callnumber">Cota de Estante</option>
          <option value="year_desc">Ano Mais Recente</option>
        </select>
        <span className="text-[11px] text-[#78716C] font-mono">
          ({totalFiltered})
        </span>
      </div>

    </div>
  );
};
