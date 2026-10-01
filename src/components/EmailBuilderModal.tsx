import React, { useState, useEffect } from 'react';
import { EnrichedBook, BulletinSettings, EmailTemplateStyle } from '../types/bibliographic';
import {
  generateEmailHtml,
  generatePlainTextEmail,
  copyHtmlToClipboard,
} from '../services/emailHtmlGenerator';
import { generateBulletinEditorialWithAi } from '../services/enrichmentService';
import {
  X,
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  Eye,
  Code,
  FileText,
  Mail,
  Sliders,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface EmailBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: EnrichedBook[];
  subjectArea: string;
}

export const EmailBuilderModal: React.FC<EmailBuilderModalProps> = ({
  isOpen,
  onClose,
  books,
  subjectArea,
}) => {
  const [settings, setSettings] = useState<BulletinSettings>({
    subjectArea: subjectArea || 'Banda Desenhada & Cultura Visual',
    libraryName: 'Biblioteca Central & Centro de Documentação',
    issueNumber: `Boletim de Aquisições nº ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
    editorialIntroduction:
      'Estimados utilizadores e investigadores,\n\nApresentamos as mais recentes obras integradas no acervo da biblioteca na nossa área de especialidade. Todos os títulos já se encontram catalogados e disponíveis para consulta presencial e empréstimo domiciliário.\n\nConsulte a Cota indicada em cada registo para localizar os volumes nas estantes ou solicite o seu empréstimo junto da equipa da biblioteca.',
    loanInstructions:
      'Para requisitar ou reservar qualquer uma das obras, anote a respectiva COTA e dirija-se ao balcão de empréstimo ou responda a este email indicando o seu número de leitor.',
    libraryEmail: 'biblioteca@instituicao.pt',
    libraryWebsite: 'https://catalogo.biblioteca.pt',
    style: 'classic',
    showRatings: true,
    showSynopsis: true,
    showCallNumber: true,
    showCover: true,
    showGoodreadsLink: true,
    showWookLink: true,
    showBertrandLink: false,
    showOpacAvailability: true,
    opacBaseUrl: 'https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber=',
  });

  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'text'>('preview');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [activePanel, setActivePanel] = useState<'settings' | 'preview'>('preview');

  // Sync subject area when changed in main app
  useEffect(() => {
    if (subjectArea && subjectArea !== settings.subjectArea) {
      setSettings((prev) => ({ ...prev, subjectArea }));
    }
  }, [subjectArea]);

  if (!isOpen) return null;

  const selectedBooks = books.filter((b) => b.selectedForEmail);
  const renderedHtml = generateEmailHtml(books, settings);
  const plainText = generatePlainTextEmail(books, settings);

  const handleCopyRichHtml = async () => {
    const success = await copyHtmlToClipboard(renderedHtml, plainText);
    if (success) {
      setIsCopied(true);
      setCopiedType('html');
      setTimeout(() => {
        setIsCopied(false);
        setCopiedType(null);
      }, 3500);
    }
  };

  const handleCopyPlainText = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setCopiedType('text');
      setTimeout(() => {
        setIsCopied(false);
        setCopiedType(null);
      }, 3500);
    } catch {
      // fallback
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([renderedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boletim-aquisicoes-${settings.subjectArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(renderedHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleGenerateEditorialAi = async () => {
    setIsGeneratingAi(true);
    try {
      const bookTitles = selectedBooks.map((b) => b.title);
      const editorial = await generateBulletinEditorialWithAi(
        settings.libraryName,
        settings.subjectArea,
        settings.issueNumber,
        bookTitles
      );
      if (editorial) {
        setSettings((prev) => ({ ...prev, editorialIntroduction: editorial }));
      }
    } catch (e) {
      console.warn('AI editorial generation error:', e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-[#FAF8F5] border border-[#E7E3DC] rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E7E3DC] bg-[#FCFAF6] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#1C1917] flex items-center justify-center text-white">
              <Mail className="w-4 h-4 text-[#D6CEBE]" />
            </div>
            <div>
              <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#1C1917]">
                Gerador de Boletim para Email
              </h2>
              <p className="text-xs text-[#78716C]">
                {selectedBooks.length} obras selecionadas · Pronto para colar no Gmail, Outlook, Apple Mail ou Thunderbird
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action Button: Copiar HTML para Email */}
            <button
              type="button"
              onClick={handleCopyRichHtml}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${
                isCopied && copiedType === 'html'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#9A3412] hover:bg-[#782A0E] text-white'
              }`}
              title="Copia formato HTML rico. Basta colar (Ctrl+V) no corpo do email"
            >
              {isCopied && copiedType === 'html' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado para o Email!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar HTML para Email</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner if Copied */}
        {isCopied && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900 transition-all">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Pronto a enviar!</strong> O boletim formatado foi copiado para a área de transferência. Abra o seu email (Gmail, Outlook, etc.) e prima <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono text-[10px]">Ctrl+V</kbd> ou <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono text-[10px]">Cmd+V</kbd>.
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Imagens e estilos preservados</span>
          </div>
        )}

        {/* Modal Center Layout: Split Screen (Settings on left, Live preview on right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Configuration & Editorial Controls */}
          <div className="w-full md:w-80 lg:w-96 border-r border-[#E7E3DC] bg-white overflow-y-auto p-5 space-y-4 shrink-0 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E3DC]">
              <span className="font-semibold text-[#1C1917] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#9A3412]" />
                Personalização do Boletim
              </span>
            </div>

            {/* Template Style */}
            <div>
              <label className="block font-semibold text-[#44403C] mb-1.5">
                Estilo Visual do Boletim
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#F7F4EE] p-1 rounded-lg border border-[#E5E0D8]">
                {(
                  [
                    { id: 'classic', label: 'Editorial' },
                    { id: 'modern_grid', label: 'Revista' },
                    { id: 'compact_catalog', label: 'Cota' },
                  ] as { id: EmailTemplateStyle; label: string }[]
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, style: st.id })}
                    className={`py-1 text-[11px] font-medium rounded transition-colors ${
                      settings.style === st.id
                        ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
                        : 'text-[#78716C] hover:text-[#1C1917]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Area */}
            <div>
              <label className="block font-semibold text-[#44403C] mb-1">
                Área / Assunto em Destaque
              </label>
              <input
                type="text"
                value={settings.subjectArea}
                onChange={(e) => setSettings({ ...settings, subjectArea: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            {/* Library Name */}
            <div>
              <label className="block font-semibold text-[#44403C] mb-1">
                Nome da Biblioteca
              </label>
              <input
                type="text"
                value={settings.libraryName}
                onChange={(e) => setSettings({ ...settings, libraryName: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            {/* Issue Number */}
            <div>
              <label className="block font-semibold text-[#44403C] mb-1">
                Número / Edição do Boletim
              </label>
              <input
                type="text"
                value={settings.issueNumber}
                onChange={(e) => setSettings({ ...settings, issueNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            {/* Editorial Introduction with AI Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-[#44403C]">
                  Texto Editorial de Abertura
                </label>
                <button
                  type="button"
                  onClick={handleGenerateEditorialAi}
                  disabled={isGeneratingAi}
                  className="text-[11px] text-[#78350F] hover:underline font-semibold flex items-center gap-1"
                  title="Gera um texto editorial acolhedor em Português usando o Gemini"
                >
                  <Sparkles className={`w-3 h-3 text-[#B45309] ${isGeneratingAi ? 'animate-pulse' : ''}`} />
                  <span>{isGeneratingAi ? 'A Gerar...' : 'Gerar com IA'}</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={settings.editorialIntroduction}
                onChange={(e) => setSettings({ ...settings, editorialIntroduction: e.target.value })}
                className="w-full p-2.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs font-editorial leading-relaxed focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            {/* Loan Instructions */}
            <div>
              <label className="block font-semibold text-[#44403C] mb-1">
                Instruções de Empréstimo & Consulta
              </label>
              <textarea
                rows={2}
                value={settings.loanInstructions}
                onChange={(e) => setSettings({ ...settings, loanInstructions: e.target.value })}
                className="w-full p-2 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            {/* Email and Website */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-[#44403C] mb-1">
                  Email Biblioteca
                </label>
                <input
                  type="email"
                  value={settings.libraryEmail}
                  onChange={(e) => setSettings({ ...settings, libraryEmail: e.target.value })}
                  className="w-full px-2 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#44403C] mb-1">
                  Website / Catálogo
                </label>
                <input
                  type="text"
                  value={settings.libraryWebsite}
                  onChange={(e) => setSettings({ ...settings, libraryWebsite: e.target.value })}
                  className="w-full px-2 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
                />
              </div>
            </div>

            {/* Element visibility toggles */}
            <div className="pt-2 border-t border-[#E7E3DC] space-y-2">
              <span className="block font-semibold text-[#44403C] uppercase tracking-wider text-[10px]">
                Elementos Visíveis no Email
              </span>
              <div className="space-y-1.5 text-xs text-[#57534E]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showCover}
                    onChange={(e) => setSettings({ ...settings, showCover: e.target.checked })}
                    className="rounded text-[#9A3412] focus:ring-[#9A3412]"
                  />
                  <span>Capas das obras</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showSynopsis}
                    onChange={(e) => setSettings({ ...settings, showSynopsis: e.target.checked })}
                    className="rounded text-[#9A3412] focus:ring-[#9A3412]"
                  />
                  <span>Sumários / Sinopses</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showRatings}
                    onChange={(e) => setSettings({ ...settings, showRatings: e.target.checked })}
                    className="rounded text-[#9A3412] focus:ring-[#9A3412]"
                  />
                  <span>Avaliações por estrelas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showGoodreadsLink}
                    onChange={(e) => setSettings({ ...settings, showGoodreadsLink: e.target.checked })}
                    className="rounded text-[#9A3412] focus:ring-[#9A3412]"
                  />
                  <span>Links para GoodReads / Catálogo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showWookLink}
                    onChange={(e) => setSettings({ ...settings, showWookLink: e.target.checked })}
                    className="rounded text-[#9A3412] focus:ring-[#9A3412]"
                  />
                  <span>Links diretos para <strong>Wook.pt</strong></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showBertrandLink}
                    onChange={(e) => setSettings({ ...settings, showBertrandLink: e.target.checked })}
                    className="rounded text-[#9A3412] focus:ring-[#9A3412]"
                  />
                  <span>Links diretos para <strong>Bertrand</strong></span>
                </label>
                <div className="pt-1.5 border-t border-[#EAE5DC]">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-[#15803D]">
                    <input
                      type="checkbox"
                      checked={settings.showOpacAvailability !== false}
                      onChange={(e) => setSettings({ ...settings, showOpacAvailability: e.target.checked })}
                      className="rounded text-[#15803D] focus:ring-[#15803D]"
                    />
                    <span>Ligação <strong>"Ver disponibilidade" (Koha OPAC)</strong></span>
                  </label>
                  {settings.showOpacAvailability !== false && (
                    <div className="pl-6 pt-1">
                      <label className="block text-[10px] text-[#78716C] mb-0.5">
                        URL Base do Catálogo Koha UA:
                      </label>
                      <input
                        type="text"
                        value={settings.opacBaseUrl || 'https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber='}
                        onChange={(e) => setSettings({ ...settings, opacBaseUrl: e.target.value })}
                        className="w-full px-2 py-1 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-[10px] font-mono focus:outline-none focus:border-[#15803D]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Live Preview & Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#F3F0EA] overflow-hidden">
            
            {/* View switcher & utility bar */}
            <div className="px-5 py-2.5 bg-[#FAF8F5] border-b border-[#E7E3DC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center bg-[#EAE5DC] p-0.5 rounded-lg border border-[#DDD7CD]">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pré-visualização de Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('html')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'html'
                      ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Código HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'text'
                      ? 'bg-white text-[#1C1917] shadow-2xs font-semibold'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Texto Simples</span>
                </button>
              </div>

              {/* Utility actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPlainText}
                  className="px-2.5 py-1 text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE5DC] rounded transition-colors flex items-center gap-1"
                  title="Copiar versão em texto simples"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-2.5 py-1 text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE5DC] rounded transition-colors flex items-center gap-1"
                  title="Descarregar ficheiro .html"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descarregar .html</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 py-1 text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE5DC] rounded transition-colors flex items-center gap-1"
                  title="Imprimir ou Guardar em PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF / Imprimir</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center">
              {activeTab === 'preview' ? (
                <div className="w-full max-w-[660px]">
                  {/* Mock Email Client Header */}
                  <div className="bg-white border border-[#E7E3DC] rounded-t-xl p-3 shadow-sm border-b-0 text-xs text-[#57534E] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1C1917]">Assunto:</span>
                      <span className="text-[#1C1917]">
                        {settings.subjectArea} — Novas Aquisições ({settings.libraryName})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#78716C]">
                      <span>De: {settings.libraryName} &lt;{settings.libraryEmail}&gt;</span>
                      <span>·</span>
                      <span>Para: Lista de Destinatários / Investigadores</span>
                    </div>
                  </div>

                  {/* Rendered Email HTML in Sandbox */}
                  <div
                    className="bg-white border border-[#E7E3DC] rounded-b-xl shadow-md overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </div>
              ) : activeTab === 'html' ? (
                <div className="w-full h-full bg-[#1C1917] rounded-xl p-4 overflow-auto font-mono text-xs text-[#D6CEBE]">
                  <pre className="whitespace-pre-wrap">{renderedHtml}</pre>
                </div>
              ) : (
                <div className="w-full max-w-3xl bg-white border border-[#E7E3DC] rounded-xl p-6 shadow-sm overflow-auto font-mono text-xs text-[#1C1917] leading-relaxed">
                  <pre className="whitespace-pre-wrap">{plainText}</pre>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
