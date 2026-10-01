import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Check, AlertCircle, ArrowRight, Table, Sparkles } from 'lucide-react';
import { parseFileToRows, parseTextToRows, detectColumnMapping, convertRowsToBooks } from '../services/fileParser';
import { EnrichedBook } from '../types/bibliographic';
import { SAMPLE_RAW_TSV } from '../data/sampleBooks';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (books: EnrichedBook[], subjectArea: string, startEnrichmentImmediately: boolean) => void;
  currentSubjectArea: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  currentSubjectArea,
}) => {
  const [activeMode, setActiveMode] = useState<'file' | 'paste'>('file');
  const [subjectArea, setSubjectArea] = useState(currentSubjectArea || 'Banda Desenhada & Cultura Visual');
  const [pastedText, setPastedText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [startEnrichment, setStartEnrichment] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessRawData = (headers: string[], rows: Record<string, any>[]) => {
    if (rows.length === 0) {
      setErrorMsg('Não foram encontrados registos válidos no ficheiro ou texto.');
      return;
    }
    const detected = detectColumnMapping(headers);
    setParsedHeaders(headers);
    setParsedRows(rows);
    setMapping(detected);
    setErrorMsg(null);
    setStep('mapping');
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { headers, rows } = await parseFileToRows(file);
      handleProcessRawData(headers, rows);
    } catch (e: any) {
      setErrorMsg(`Erro ao ler o ficheiro: ${e?.message || 'Formato não suportado'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Por favor cole o texto com os dados bibliográficos.');
      return;
    }
    try {
      const { headers, rows } = parseTextToRows(pastedText);
      handleProcessRawData(headers, rows);
    } catch (e: any) {
      setErrorMsg(`Erro ao processar texto: ${e?.message || 'Verifique o formato'}`);
    }
  };

  const handleLoadSample = () => {
    setPastedText(SAMPLE_RAW_TSV);
    const { headers, rows } = parseTextToRows(SAMPLE_RAW_TSV);
    setSubjectArea('Estudos sobre Banda Desenhada & Narrativa Gráfica');
    handleProcessRawData(headers, rows);
  };

  const handleFinalImport = () => {
    const books = convertRowsToBooks(parsedRows, mapping, subjectArea);
    if (books.length === 0) {
      setErrorMsg('Nenhuma obra pôde ser criada. Certifique-se de que a coluna de Título ou ISBN está mapeada.');
      return;
    }
    onImportComplete(books, subjectArea, startEnrichment);
    onClose();
  };

  const standardFields = [
    { key: 'title', label: 'Título da Obra', required: true, desc: 'ex: Comics and stuff' },
    { key: 'author', label: 'Autor / Responsabilidade', required: true, desc: 'ex: Henry Jenkins ou org. Francisco Ucha' },
    { key: 'isbn', label: 'ISBN (10 ou 13)', required: true, desc: 'ex: 978-1-4798-0093-3 (essencial para obter capa e sumário)' },
    { key: 'itemcallnumber', label: 'Cota de Localização', required: false, desc: 'ex: CF-41-32 (localização na estante)' },
    { key: 'biblionumber', label: 'Nº Registo / Catálogo', required: false, desc: 'ex: 305614 (código do sistema Koha/Aleph)' },
    { key: 'publicationyear', label: 'Ano de Publicação', required: false, desc: 'ex: 2020' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] border border-[#E7E3DC] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E3DC] bg-[#FCFAF6]">
          <div>
            <h2 className="font-editorial text-xl font-bold text-[#1C1917]">
              {step === 'upload' ? 'Carregar Obras Adquiridas' : 'Verificar Correspondência de Colunas'}
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              {step === 'upload'
                ? 'Ficheiros CSV, TSV, TXT, Excel (.xlsx, .xls) ou colagem directa de dados'
                : `Detectados ${parsedRows.length} registos no ficheiro`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'upload' ? (
            <>
              {/* Subject / Area Input */}
              <div>
                <label className="block text-xs font-semibold text-[#44403C] uppercase tracking-wider mb-1.5">
                  Área Temática / Assunto do Lote
                </label>
                <input
                  type="text"
                  value={subjectArea}
                  onChange={(e) => setSubjectArea(e.target.value)}
                  placeholder="ex: Banda Desenhada & Estudos de Narrativa Gráfica, História Medieval..."
                  className="w-full px-3.5 py-2 text-sm bg-[#FAFAF7] border border-[#D6D3CD] rounded-lg focus:outline-none focus:border-[#9A3412] focus:ring-1 focus:ring-[#9A3412] transition-colors"
                />
                <span className="text-[11px] text-[#78716C] mt-1 block">
                  Identifica o assunto comum das obras e dará o título ao boletim a enviar por email.
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="flex border-b border-[#E7E3DC] gap-6 text-sm">
                <button
                  onClick={() => setActiveMode('file')}
                  className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-2 ${
                    activeMode === 'file'
                      ? 'border-[#9A3412] text-[#9A3412]'
                      : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Ficheiro CSV / Excel</span>
                </button>
                <button
                  onClick={() => setActiveMode('paste')}
                  className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-2 ${
                    activeMode === 'paste'
                      ? 'border-[#9A3412] text-[#9A3412]'
                      : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Colar Texto Tabulado</span>
                </button>
              </div>

              {activeMode === 'file' ? (
                <div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#D6D3CD] hover:border-[#9A3412] bg-[#FAFAF7] hover:bg-[#F7F4EE] rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                      }}
                    />
                    <div className="w-12 h-12 rounded-full bg-[#EFECE6] group-hover:bg-[#EAE4D9] flex items-center justify-center text-[#78716C] group-hover:text-[#9A3412] mb-3 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-[#1C1917] mb-1">
                      Arraste ou clique para selecionar ficheiro
                    </span>
                    <span className="text-xs text-[#78716C]">
                      Suporta ficheiros .CSV, .TSV, .XLSX ou .XLS da sua biblioteca
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E7E3DC] flex items-center justify-between text-xs text-[#78716C]">
                    <span>Quer testar de imediato?</span>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="flex items-center gap-1.5 text-[#9A3412] hover:text-[#78350F] font-semibold underline decoration-dotted"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Carregar os 9 registos de exemplo (Banda Desenhada)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#78716C]">
                      Cole o conteúdo copiado do Excel ou de um ficheiro CSV/TSV:
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="text-xs text-[#9A3412] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      Colar Exemplo Fornecido
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`biblionumber\ttitle\tauthor\tisbn\tpublicationyear\titemcallnumber\n328281\tSuplemento juvenil\torg. Francisco Ucha\t978-65-01-17665-9\t2024\tCF-41-100\n...`}
                    className="w-full p-3 font-mono text-xs bg-[#FAFAF7] border border-[#D6D3CD] rounded-lg focus:outline-none focus:border-[#9A3412] text-[#1C1917]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasteSubmit}
                      disabled={!pastedText.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>Analisar Colunas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Mapping Step */
            <div className="space-y-4">
              <div className="bg-[#F7F4EE] border border-[#E7E3DC] p-3 rounded-lg text-xs text-[#44403C] flex items-center justify-between">
                <span>
                  O sistema associou automaticamente as colunas do seu ficheiro. Confirme os campos:
                </span>
                <span className="font-mono font-semibold text-[#1C1917]">
                  {parsedRows.length} registos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {standardFields.map((field) => (
                  <div key={field.key} className="p-3 bg-[#FAFAF7] border border-[#E7E3DC] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#1C1917] flex items-center gap-1">
                        <span>{field.label}</span>
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <span className="text-[10px] text-[#78716C]">{field.desc}</span>
                    </div>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6D3CD] rounded-md focus:outline-none focus:border-[#9A3412]"
                    >
                      <option value="">-- Ignorar ou Não Existe --</option>
                      {parsedHeaders.map((header) => (
                        <option key={header} value={header}>
                          Coluna do Ficheiro: &quot;{header}&quot;
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample preview table of first 2 rows */}
              <div className="border border-[#E7E3DC] rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[#EFECE6] text-[11px] font-semibold text-[#57534E] flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5" />
                  <span>Pré-visualização dos 2 Primeiros Registos</span>
                </div>
                <div className="overflow-x-auto text-[11px] p-2 bg-white">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#E7E3DC] text-left text-[#78716C]">
                        <th className="p-1">Título</th>
                        <th className="p-1">Autor</th>
                        <th className="p-1">ISBN</th>
                        <th className="p-1">Cota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 2).map((row, i) => (
                        <tr key={i} className="border-b border-[#F5F2EB]">
                          <td className="p-1 font-medium text-[#1C1917]">
                            {row[mapping.title] || row['title'] || '—'}
                          </td>
                          <td className="p-1 text-[#57534E]">
                            {row[mapping.author] || row['author'] || '—'}
                          </td>
                          <td className="p-1 font-mono text-[#78350F]">
                            {row[mapping.isbn] || row['isbn'] || '—'}
                          </td>
                          <td className="p-1 font-mono text-[#1E3A8A]">
                            {row[mapping.itemcallnumber] || row['itemcallnumber'] || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Enrichment Checkbox */}
              <label className="flex items-start gap-2.5 p-3 bg-[#FEF3C7]/40 border border-[#FDE68A] rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={startEnrichment}
                  onChange={(e) => setStartEnrichment(e.target.checked)}
                  className="mt-0.5 rounded text-[#9A3412] focus:ring-[#9A3412]"
                />
                <div className="text-xs">
                  <strong className="text-[#78350F]">Iniciar Enriquecimento Automático Imediatamente</strong>
                  <p className="text-[#92400E] mt-0.5">
                    Procurará logo capas de alta resolução, sumários e avaliações no Google Books e Open Library.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#FCFAF6] border-t border-[#E7E3DC] flex items-center justify-between">
          {step === 'mapping' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-3.5 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFECE6] rounded-lg transition-colors"
            >
              Voltar ao Carregamento
            </button>
          ) : (
            <div className="text-[11px] text-[#78716C]">
              Formatos aceites: .csv, .tsv, .xlsx, .xls
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {step === 'mapping' && (
              <button
                type="button"
                onClick={handleFinalImport}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9A3412] hover:bg-[#782A0E] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Importar {parsedRows.length} Obras</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
