/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { EnrichmentBar } from './components/EnrichmentBar';
import { FilterBar } from './components/FilterBar';
import { BookCard } from './components/BookCard';
import { BookTableView } from './components/BookTableView';
import { ImportModal } from './components/ImportModal';
import { BookEditModal } from './components/BookEditModal';
import { EmailBuilderModal } from './components/EmailBuilderModal';
import { ManualAddModal } from './components/ManualAddModal';
import { HelpModal } from './components/HelpModal';
import { EnrichedBook } from './types/bibliographic';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { sanitizeCategories, isBoilerplateSummary, optimizeCoverUrl } from './services/isbnCleaner';
import {
  enrichBooksBatch,
  enrichSingleBook,
  enrichBookWithAi,
  searchWebBookstores,
} from './services/enrichmentService';
import {
  BookOpen,
  Sparkles,
  Upload,
  Plus,
  Mail,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

const STORAGE_KEY = 'bibliotrack_books_v4';
const SUBJECT_STORAGE_KEY = 'bibliotrack_subject_v4';

export default function App() {
  // Load initial books from localStorage, or start with sample books so user has instant rich experience
  const [books, setBooks] = useState<EnrichedBook[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('bibliotrack_books_v3') || localStorage.getItem('bibliotrack_books_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b) => {
            const hasBoilerplateSummary = isBoilerplateSummary(b.enriched?.summary);
            const hasBoilerplateCustom = isBoilerplateSummary(b.customSummary);
            const isSample = SAMPLE_BOOKS.find((s) => s.id === b.id || (s.isbn && b.isbn && s.isbn === b.isbn));

            const cleanCats = sanitizeCategories(b.enriched?.categories) || isSample?.enriched?.categories;
            const cleanSummary = hasBoilerplateSummary
              ? (isSample?.enriched?.summary || undefined)
              : b.enriched?.summary;
            const cleanCustom = hasBoilerplateCustom ? undefined : b.customSummary;

            return {
              ...b,
              subjectArea: b.subjectArea && !/publica[cç][oõ]es\s+recentes/i.test(b.subjectArea) && !/bibliografia/i.test(b.subjectArea)
                ? b.subjectArea
                : 'Estudos sobre Banda Desenhada & Cultura Visual',
              customSummary: cleanCustom,
              enriched: b.enriched
                ? {
                    ...b.enriched,
                    coverUrl: optimizeCoverUrl(b.enriched.coverUrl) || isSample?.enriched?.coverUrl,
                    coverSource: b.enriched.coverUrl ? b.enriched.coverSource : (isSample?.enriched?.coverSource || 'goodreads'),
                    summary: cleanSummary,
                    categories: cleanCats,
                    aiRelevance: isBoilerplateSummary(b.enriched.aiRelevance) ? undefined : b.enriched.aiRelevance,
                  }
                : (isSample?.enriched ? { ...isSample.enriched } : undefined),
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return SAMPLE_BOOKS;
  });

  const [subjectArea, setSubjectArea] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SUBJECT_STORAGE_KEY) || localStorage.getItem('bibliotrack_subject_v3');
      if (saved && !/publica[cç][oõ]es\s+recentes/i.test(saved) && !/bibliografia/i.test(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'Estudos sobre Banda Desenhada & Cultura Visual';
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'catalog' | 'table'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selected' | 'has_cover' | 'has_summary' | 'has_rating'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'title' | 'author' | 'year_desc' | 'callnumber'>('order');

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEmailBuilderOpen, setIsEmailBuilderOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<EnrichedBook | null>(null);

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [isAiEnrichingAll, setIsAiEnrichingAll] = useState(false);
  const [activeAiBookId, setActiveAiBookId] = useState<string | null>(null);
  const [isSearchingAllWeb, setIsSearchingAllWeb] = useState(false);
  const [activeWebSearchBookId, setActiveWebSearchBookId] = useState<string | null>(null);

  // Save to localStorage when books change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.warn('Failed to save books to localStorage:', e);
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(SUBJECT_STORAGE_KEY, subjectArea);
    } catch {
      // ignore
    }
  }, [subjectArea]);

  // Initial auto-enrichment on first load if books are pending
  useEffect(() => {
    const pending = books.filter((b) => b.status === 'pending');
    if (pending.length > 0 && !isEnriching) {
      // Trigger background enrichment of the sample data smoothly
      handleStartBatchEnrichment();
    }
  }, []);

  // Handler: Start batch enrichment with Google Books & Open Library
  const handleStartBatchEnrichment = async (booksToEnrich: EnrichedBook[] = books) => {
    if (isEnriching) return;
    setIsEnriching(true);

    try {
      const updated = await enrichBooksBatch(booksToEnrich, (current, total, title) => {
        setEnrichmentProgress({ current, total, title });
      });

      // Merge updated books into state
      setBooks((prev) => {
        const map = new Map(updated.map((b) => [b.id, b]));
        return prev.map((old) => (map.has(old.id) ? map.get(old.id)! : old));
      });
    } catch (error) {
      console.error('Batch enrichment error:', error);
    } finally {
      setIsEnriching(false);
      setEnrichmentProgress(null);
    }
  };

  // Handler: Re-enrich single book
  const handleReEnrichSingle = async (book: EnrichedBook) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === book.id ? { ...b, status: 'enriching' } : b))
    );

    try {
      const enriched = await enrichSingleBook(book);
      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? enriched : b))
      );
    } catch {
      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, status: 'error' } : b))
      );
    }
  };

  // Handler: AI Portuguese Synopsis & Insight for a single book
  const handleEnrichAi = async (book: EnrichedBook) => {
    setActiveAiBookId(book.id);
    try {
      const aiData = await enrichBookWithAi(book, subjectArea);
      if (aiData) {
        setBooks((prev) =>
          prev.map((b) => {
            if (b.id !== book.id) return b;
            return {
              ...b,
              customSummary: aiData.summary || b.customSummary || b.enriched?.summary,
              enriched: {
                ...(b.enriched || { cleanIsbn: b.isbn }),
                aiRelevance: aiData.relevance || b.enriched?.aiRelevance,
                categories: sanitizeCategories(aiData.subjects && aiData.subjects.length > 0 ? aiData.subjects : b.enriched?.categories),
              },
            };
          })
        );
      }
    } catch (e) {
      console.error('AI single enrichment error:', e);
    } finally {
      setActiveAiBookId(null);
    }
  };

  // Handler: AI Portuguese Synopsis for all selected books lacking summary
  const handleEnrichAllAi = async () => {
    if (isAiEnrichingAll) return;
    setIsAiEnrichingAll(true);

    const targets = books.filter((b) => b.selectedForEmail && (!b.customSummary && !b.enriched?.summary));
    const toProcess = targets.length > 0 ? targets : books.filter((b) => b.selectedForEmail);

    for (const book of toProcess) {
      await handleEnrichAi(book);
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsAiEnrichingAll(false);
  };

  // Handler: Search web & Portuguese bookstores (Wook, Bertrand, FNAC, GoodReads) for a single book
  const handleSearchWeb = async (book: EnrichedBook) => {
    setActiveWebSearchBookId(book.id);
    try {
      const webData = await searchWebBookstores(book, subjectArea);
      if (webData) {
        setBooks((prev) =>
          prev.map((b) => {
            if (b.id !== book.id) return b;
            const updatedSummary = webData.summary || b.customSummary || b.enriched?.summary;
            const updatedCover = webData.coverUrl || b.enriched?.coverUrl;
            return {
              ...b,
              customSummary: webData.summary || b.customSummary,
              customSummarySource: webData.summary ? ((webData.source as any) || 'goodreads') : b.customSummarySource,
              status: (updatedSummary || updatedCover) ? 'enriched' : b.status,
              enriched: {
                ...(b.enriched || { cleanIsbn: b.isbn }),
                coverUrl: updatedCover,
                coverSource: webData.coverUrl ? 'goodreads' : b.enriched?.coverSource,
                summary: updatedSummary,
                summarySource: webData.summary ? ((webData.source as any) || 'goodreads') : b.enriched?.summarySource,
                sourceDetail: webData.sourceName || b.enriched?.sourceDetail || 'GoodReads / Livrarias Online',
                publisher: webData.publisher || b.enriched?.publisher,
                pageCount: webData.pageCount || b.enriched?.pageCount,
                averageRating: webData.averageRating || b.enriched?.averageRating,
                ratingsCount: webData.ratingsCount || b.enriched?.ratingsCount,
                aiRelevance: webData.relevance || b.enriched?.aiRelevance,
                categories: sanitizeCategories(webData.subjects && webData.subjects.length > 0 ? webData.subjects : b.enriched?.categories),
                goodreadsLink: webData.bookstoreUrl?.includes('goodreads') ? webData.bookstoreUrl : b.enriched?.goodreadsLink,
              },
            };
          })
        );
      }
    } catch (err) {
      console.error('Web bookstore search error:', err);
    } finally {
      setActiveWebSearchBookId(null);
    }
  };

  // Handler: Batch search Portuguese bookstores for all selected books
  const handleSearchAllWebBookstores = async () => {
    if (isSearchingAllWeb) return;
    setIsSearchingAllWeb(true);

    const targets = books.filter((b) => b.selectedForEmail);
    const total = targets.length;

    for (let i = 0; i < total; i++) {
      const book = targets[i];
      setEnrichmentProgress({ current: i + 1, total, title: `${book.title} (Wook/Web)` });
      await handleSearchWeb(book);
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsSearchingAllWeb(false);
    setEnrichmentProgress(null);
  };

  // Handler: Import complete
  const handleImportComplete = (
    newBooks: EnrichedBook[],
    newSubject: string,
    startEnrichmentImmediately: boolean
  ) => {
    setBooks(newBooks);
    setSubjectArea(newSubject);
    if (startEnrichmentImmediately) {
      setTimeout(() => {
        handleStartBatchEnrichment(newBooks);
      }, 100);
    }
  };

  // Handler: Load supplied sample data
  const handleLoadSample = () => {
    setBooks(SAMPLE_BOOKS);
    setSubjectArea('Estudos sobre Banda Desenhada & Cultura Visual');
    setTimeout(() => {
      handleStartBatchEnrichment(SAMPLE_BOOKS);
    }, 100);
  };

  // Handler: Manual add
  const handleManualAddBook = (book: EnrichedBook, autoEnrich: boolean) => {
    setBooks((prev) => [book, ...prev]);
    if (autoEnrich) {
      setTimeout(() => {
        handleReEnrichSingle(book);
      }, 100);
    }
  };

  // Handler: Toggle selection
  const handleToggleSelect = (id: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, selectedForEmail: !b.selectedForEmail } : b))
    );
  };

  // Handler: Select all / Deselect all
  const handleSelectAll = (select: boolean) => {
    setBooks((prev) => prev.map((b) => ({ ...b, selectedForEmail: select })));
  };

  // Handler: Save edited book
  const handleSaveEditedBook = (updated: EnrichedBook) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  // Handler: Delete book
  const handleDeleteBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  // Filter & Sort calculation
  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.itemcallnumber && b.itemcallnumber.toLowerCase().includes(q)) ||
            (b.biblionumber && b.biblionumber.toLowerCase().includes(q)) ||
            b.isbn.toLowerCase().includes(q) ||
            (b.enriched?.publisher && b.enriched.publisher.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Status Filter
        if (statusFilter === 'selected') return b.selectedForEmail;
        if (statusFilter === 'has_cover') return !!(b.customCoverUrl || b.enriched?.coverUrl);
        if (statusFilter === 'has_summary') return !!(b.customSummary || b.enriched?.summary);
        if (statusFilter === 'has_rating') return !!b.enriched?.averageRating;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'author') return a.author.localeCompare(b.author);
        if (sortBy === 'callnumber') return (a.itemcallnumber || '').localeCompare(b.itemcallnumber || '');
        if (sortBy === 'year_desc') {
          const yA = parseInt(String(a.publicationyear || '0'), 10) || 0;
          const yB = parseInt(String(b.publicationyear || '0'), 10) || 0;
          return yB - yA;
        }
        return 0; // Default original list order
      });
  }, [books, searchQuery, statusFilter, sortBy]);

  const selectedCount = books.filter((b) => b.selectedForEmail).length;
  const enrichedCount = books.filter((b) => b.status === 'enriched' || b.enriched?.coverUrl || b.enriched?.summary).length;
  const allSelected = books.length > 0 && books.every((b) => b.selectedForEmail);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
      {/* Top Bar Header */}
      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onOpenEmailBuilder={() => setIsEmailBuilderOpen(true)}
        onLoadSample={handleLoadSample}
        onOpenManualAdd={() => setIsManualAddOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCount={selectedCount}
        totalCount={books.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Curatorial Hero Banner & Batch Controls */}
        <EnrichmentBar
          totalCount={books.length}
          enrichedCount={enrichedCount}
          selectedCount={selectedCount}
          isEnriching={isEnriching}
          enrichmentProgress={enrichmentProgress}
          onStartEnrichment={() => handleStartBatchEnrichment()}
          onEnrichAllAi={handleEnrichAllAi}
          onSearchAllWebBookstores={handleSearchAllWebBookstores}
          isAiEnrichingAll={isAiEnrichingAll}
          isSearchingAllWeb={isSearchingAllWeb}
          onSelectAll={handleSelectAll}
          allSelected={allSelected}
          subjectArea={subjectArea}
        />

        {/* Filters, Search & Sort Bar */}
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          totalFiltered={filteredBooks.length}
        />

        {/* Content Display: Editorial Card Grid or Table */}
        {books.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center bg-white border border-[#E7E3DC] rounded-xl shadow-xs space-y-4 max-w-xl mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#E7E3DC] flex items-center justify-center text-[#9A3412] mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-2xl font-bold text-[#1C1917]">
              Nenhuma Obra Carregada
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Carregue um ficheiro CSV ou folha de cálculo Excel da sua biblioteca, ou teste de imediato carregando o conjunto de dados fornecido de estudos sobre banda desenhada.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9A3412] hover:bg-[#782A0E] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Carregar Exemplo (9 Obras)</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-[#1C1917] bg-[#EFECE6] hover:bg-[#E5E0D8] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar CSV / XLS</span>
              </button>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          /* Zero Results for Search */
          <div className="p-8 text-center bg-white border border-[#E7E3DC] rounded-xl text-xs text-[#78716C]">
            <p className="font-semibold text-sm text-[#1C1917] mb-1">Nenhum resultado encontrado</p>
            <p>Tente ajustar os termos de pesquisa ou remover os filtros aplicados.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-3 px-3 py-1 text-xs font-medium text-[#9A3412] hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        ) : activeTab === 'catalog' ? (
          /* Editorial Grid of Book Cards */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredBooks.map((book, idx) => (
              <BookCard
                key={book.id}
                book={book}
                index={idx}
                onToggleSelect={handleToggleSelect}
                onEdit={(b) => setEditingBook(b)}
                onEnrichAi={handleEnrichAi}
                onReEnrichSingle={handleReEnrichSingle}
                onSearchWeb={handleSearchWeb}
                isAiEnriching={activeAiBookId === book.id}
                isWebSearching={activeWebSearchBookId === book.id}
              />
            ))}
          </div>
        ) : (
          /* Tabular Spreadsheet View */
          <BookTableView
            books={filteredBooks}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onEdit={(b) => setEditingBook(b)}
            onEnrichAi={handleEnrichAi}
            onReEnrichSingle={handleReEnrichSingle}
            onSearchWeb={handleSearchWeb}
          />
        )}

      </main>

      {/* Floating Bottom Quick Action for Email Dispatch */}
      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-20 max-w-xl mx-auto px-4 w-full no-print">
          <div className="bg-[#1C1917] text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-4 border border-[#38332E]">
            <div className="flex items-center gap-2.5 text-xs pl-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>{selectedCount}</strong> {selectedCount === 1 ? 'obra selecionada' : 'obras selecionadas'} para o boletim
              </span>
            </div>
            <button
              onClick={() => setIsEmailBuilderOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#9A3412] hover:bg-[#B45309] rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gerar e Copiar para Email</span>
            </button>
          </div>
        </div>
      )}

      {/* Institutional Editorial Footer */}
      <footer className="mt-12 border-t border-[#E7E3DC] bg-[#FCFAF6] py-8 text-xs text-[#78716C] no-print">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-sm font-bold text-[#1C1917]">Bibliotrack</span>
            <span>·</span>
            <span>Curadoria Bibliográfica & Enriquecimento de Catálogo</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Google Books API</span>
            <span>·</span>
            <span>Open Library Books</span>
            <span>·</span>
            <span>Exportação para Email (HTML / Texto)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
        currentSubjectArea={subjectArea}
      />

      <BookEditModal
        book={editingBook}
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSave={handleSaveEditedBook}
        onDelete={handleDeleteBook}
        onEnrichAi={handleEnrichAi}
        onSearchWeb={handleSearchWeb}
      />

      <EmailBuilderModal
        isOpen={isEmailBuilderOpen}
        onClose={() => setIsEmailBuilderOpen(false)}
        books={books}
        subjectArea={subjectArea}
      />

      <ManualAddModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onAddBook={handleManualAddBook}
        defaultSubjectArea={subjectArea}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
