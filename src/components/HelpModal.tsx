import React from 'react';
import { X, BookOpen, FileSpreadsheet, Check, Sparkles, Mail, Database } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E7E3DC] rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E3DC] bg-[#FCFAF6]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#9A3412] flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-editorial text-lg font-bold text-[#1C1917]">
                Guia de Utilização & Formato de Dados
              </h2>
              <p className="text-xs text-[#78716C]">
                Como importar listas da biblioteca, enriquecer e enviar boletins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-[#44403C] leading-relaxed">
          
          {/* Section 1: Workflow Overview */}
          <div className="space-y-2">
            <h3 className="font-editorial text-base font-bold text-[#1C1917] flex items-center gap-1.5">
              <span>01. Fluxo de Trabalho do Bibliotecário</span>
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[#57534E]">
              <li>
                <strong>Exportação no SIGB:</strong> Exporte no seu software de biblioteca (Koha, Aleph, Porbase, Millennium) um ficheiro CSV ou Excel com as novas aquisições de uma determinada área.
              </li>
              <li>
                <strong>Carregamento:</strong> Arraste o ficheiro ou cole o texto na opção <em>&quot;Importar CSV / XLS&quot;</em>.
              </li>
              <li>
                <strong>Enriquecimento Automático:</strong> O sistema pesquisa capas, sumários, número de páginas, editoras e avaliações no <strong>Google Books</strong> e <strong>Open Library</strong>.
              </li>
              <li>
                <strong>Revisão Curatorial:</strong> Selecione as obras a incluir, edite cotas ou gere sumários académicos em Português com recurso à IA.
              </li>
              <li>
                <strong>Envio Offline por Email:</strong> Clique em <em>&quot;Boletim para Email&quot;</em> &rarr; <em>&quot;Copiar HTML para Email&quot;</em> e cole diretamente (Ctrl+V) no seu Gmail, Outlook ou cliente de correio.
              </li>
            </ol>
          </div>

          {/* Section 2: Expected Columns */}
          <div className="space-y-2 pt-2 border-t border-[#E7E3DC]">
            <h3 className="font-editorial text-base font-bold text-[#1C1917] flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#9A3412]" />
              <span>02. Colunas Recomendadas no Ficheiro</span>
            </h3>
            <p className="text-[#57534E]">
              O leitor aceita cabeçalhos em português ou inglês e faz correspondência automática:
            </p>
            <div className="border border-[#E7E3DC] rounded-lg overflow-hidden font-mono text-[11px]">
              <table className="w-full border-collapse">
                <thead className="bg-[#F7F4EE] text-[#1C1917] border-b border-[#E7E3DC]">
                  <tr>
                    <th className="p-2 text-left">Coluna</th>
                    <th className="p-2 text-left">Nomes Aceites</th>
                    <th className="p-2 text-left">Exemplo Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6] bg-white">
                  <tr>
                    <td className="p-2 font-bold text-[#1C1917]">biblionumber</td>
                    <td className="p-2 text-[#78716C]">biblio, registo, id</td>
                    <td className="p-2 text-[#57534E]">305614</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#1C1917]">title</td>
                    <td className="p-2 text-[#78716C]">título, obra, livro</td>
                    <td className="p-2 text-[#57534E]">Comics and stuff</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#1C1917]">author</td>
                    <td className="p-2 text-[#78716C]">autor, org., autores</td>
                    <td className="p-2 text-[#57534E]">Henry Jenkins</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#9A3412]">isbn</td>
                    <td className="p-2 text-[#78716C]">isbn13, isbn10, ean</td>
                    <td className="p-2 text-[#9A3412]">978-1-4798-0093-3</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#1E3A8A]">itemcallnumber</td>
                    <td className="p-2 text-[#78716C]">cota, call_number, estante</td>
                    <td className="p-2 text-[#1E3A8A]">CF-41-32</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#1C1917]">publicationyear</td>
                    <td className="p-2 text-[#78716C]">ano, year, data</td>
                    <td className="p-2 text-[#57534E]">2020</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#78716C] italic">
              * Nota: Se um registo contiver múltiplos ISBNs separados por barra ou vírgula (ex: <code>978-0-8142-5563-6 | 0814214185</code>), o sistema analisa cada um automaticamente.
            </p>
          </div>

          {/* Section 3: Email Sending */}
          <div className="space-y-2 pt-2 border-t border-[#E7E3DC]">
            <h3 className="font-editorial text-base font-bold text-[#1C1917] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#9A3412]" />
              <span>03. Como Colar no Gmail, Outlook e Outros Clientes</span>
            </h3>
            <p className="text-[#57534E]">
              O botão <strong>&quot;Copiar HTML para Email&quot;</strong> coloca na área de transferência um bloco com estilos inline e links absolutos de imagens. Quando cola numa nova mensagem:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#57534E] pl-1">
              <li>No <strong>Gmail</strong>: Abra <em>&quot;Escrever&quot;</em> e prima <code>Ctrl+V</code> no corpo da mensagem. As capas, títulos e cotas aparecem imediatamente formatados.</li>
              <li>No <strong>Outlook Web ou Desktop</strong>: Cole diretamente na caixa de mensagem formatada (HTML).</li>
              <li>No <strong>Apple Mail / Thunderbird</strong>: Cole no compositor de mensagem em modo rich text.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FCFAF6] border-t border-[#E7E3DC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
