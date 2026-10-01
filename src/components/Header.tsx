import React from 'react';
import { BookOpen, Upload, Mail, Sparkles, Plus, Printer } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
  onOpenEmailBuilder: () => void;
  onLoadSample: () => void;
  onOpenManualAdd: () => void;
  onOpenHelp: () => void;
  activeTab: 'catalog' | 'table';
  setActiveTab: (tab: 'catalog' | 'table') => void;
  selectedCount: number;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onOpenEmailBuilder,
  onLoadSample,
  onOpenManualAdd,
  onOpenHelp,
  activeTab,
  setActiveTab,
  selectedCount,
  totalCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FCFAF6]/95 backdrop-blur-md border-b border-[#E7E3DC] px-6 py-3.5 transition-all no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-[#1C1917] flex items-center justify-center text-[#FBF9F5] shadow-sm">
              <BookOpen className="w-4 h-4 text-[#D6CEBE]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-xl font-bold tracking-tight text-[#1C1917] group-hover:text-[#9A3412] transition-colors">
                  LibCAS
                </span>
                <span className="hidden sm:inline-block text-[10px] text-[#78716C] font-mono tracking-tight bg-[#EFECE6] px-1.5 py-0.5 rounded border border-[#E2DDD5]">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-[#78716C] font-medium leading-none -mt-0.5 hidden sm:block">
                Current Awareness Service
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Navigation Links (Clean text links & view tabs) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]">
          <div className="flex items-center bg-[#EFECE6] p-0.5 rounded-lg border border-[#E2DDD5]">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white text-[#1C1917] shadow-xs font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Grelha Editorial
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-[#1C1917] shadow-xs font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Tabela de Registo ({totalCount})
            </button>
          </div>

          <button
            onClick={onOpenImport}
            className="hover:text-[#1C1917] transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-[#78716C]" />
            <span>Importar CSV / XLS</span>
          </button>

          <button
            onClick={onOpenManualAdd}
            className="hover:text-[#1C1917] transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4 text-[#78716C]" />
            <span>Nova Obra</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="hover:text-[#1C1917] transition-colors"
          >
            Guia & Colunas
          </button>
        </nav>

        {/* Zone 3: Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          {totalCount === 0 && (
            <button
              onClick={onLoadSample}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#78350F] bg-[#FEF3C7]/80 hover:bg-[#FEF3C7] border border-[#FDE68A] rounded-lg transition-colors shadow-xs"
              title="Carrega os 9 registos de exemplo sobre Banda Desenhada fornecidos"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Carregar Exemplo (BD)</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1C1917] bg-[#EFECE6] hover:bg-[#E5E0D8] border border-[#D6D3CD] rounded-lg transition-all shadow-xs"
            title="Imprimir catálogo em PDF (Ctrl+P / Cmd+P) com layout otimizado"
          >
            <Printer className="w-3.5 h-3.5 text-[#57534E]" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>

          <button
            onClick={onOpenEmailBuilder}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] rounded-lg transition-all shadow-xs"
          >
            <Mail className="w-3.5 h-3.5 text-[#D6CEBE]" />
            <span>Boletim para Email</span>
            {selectedCount > 0 && (
              <span className="bg-[#9A3412] text-white px-1.5 py-0.2 rounded text-[10px] font-mono">
                {selectedCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
