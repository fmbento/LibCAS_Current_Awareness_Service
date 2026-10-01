import React, { useState } from 'react';
import { EnrichedBook } from '../types/bibliographic';
import { getPrimaryIsbn } from '../services/isbnCleaner';
import { X, Plus, Sparkles } from 'lucide-react';

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (book: EnrichedBook, autoEnrich: boolean) => void;
  defaultSubjectArea: string;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  isOpen,
  onClose,
  onAddBook,
  defaultSubjectArea,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [itemcallnumber, setItemcallnumber] = useState('');
  const [biblionumber, setBiblionumber] = useState('');
  const [publicationyear, setPublicationyear] = useState(String(new Date().getFullYear()));
  const [autoEnrich, setAutoEnrich] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !isbn.trim()) return;

    const cleanIsbn = getPrimaryIsbn(isbn);
    const newBook: EnrichedBook = {
      id: `book-manual-${Date.now()}`,
      title: title.trim() || 'Obra sem título',
      author: author.trim() || 'Autor não especificado',
      isbn: isbn.trim(),
      itemcallnumber: itemcallnumber.trim() || undefined,
      biblionumber: biblionumber.trim() || undefined,
      publicationyear: publicationyear.trim() || undefined,
      subjectArea: defaultSubjectArea,
      status: 'pending',
      selectedForEmail: true,
      enriched: {
        cleanIsbn,
      },
    };

    onAddBook(newBook, autoEnrich);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E7E3DC] rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E3DC] bg-[#FCFAF6]">
          <div>
            <h2 className="font-editorial text-xl font-bold text-[#1C1917]">
              Adicionar Obra Manualmente
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Insira o título ou ISBN para obter os restantes dados automaticamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#1C1917] mb-1">
              Título da Obra <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Comics and stuff"
              className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                Autor(es) / Organizador
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="ex: Henry Jenkins"
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs focus:outline-none focus:border-[#9A3412]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                ISBN (10 ou 13 dígitos)
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="ex: 978-1-4798-0093-3"
                className="w-full px-2.5 py-1.5 bg-[#FAFAF7] border border-[#D6D3CD] rounded text-xs font-mono focus:outline-none focus:border-[#9A3412]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#1E3A8A] mb-1">
                Cota de Estante
              </label>
              <input
                type="text"
                value={itemcallnumber}
                onChange={(e) => setItemcallnumber(e.target.value)}
                placeholder="ex: CF-41-32"
                className="w-full px-2.5 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-xs font-mono text-[#1E3A8A] font-semibold focus:outline-none"
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

          <label className="flex items-center gap-2 p-2.5 bg-[#FAF7F2] border border-[#E7E3DC] rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={autoEnrich}
              onChange={(e) => setAutoEnrich(e.target.checked)}
              className="rounded text-[#9A3412] focus:ring-[#9A3412]"
            />
            <span className="text-xs text-[#44403C]">
              Consultar capa e sumário no Google Books logo após guardar
            </span>
          </label>

          <div className="pt-3 border-t border-[#E7E3DC] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Obra</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
