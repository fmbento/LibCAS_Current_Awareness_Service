export interface RawBookRecord {
  id: string;
  biblionumber?: string;
  title: string;
  author: string;
  isbn: string;
  publicationyear?: string | number;
  itemcallnumber?: string; // Cota de localização
  subjectArea?: string;
  rawRowData?: Record<string, any>;
}

export type BookSummarySource =
  | 'goodreads'
  | 'wook'
  | 'bertrand'
  | 'fnac'
  | 'google_books'
  | 'open_library'
  | 'web_search'
  | 'gemini_ai'
  | 'manual';

export interface AlternativeSummary {
  source: BookSummarySource;
  label: string;
  text: string;
  url?: string;
}

export interface EnrichedData {
  cleanIsbn: string;
  coverUrl?: string;
  coverSource?: 'goodreads' | 'google_books' | 'open_library' | 'wook' | 'custom' | 'fallback';
  summary?: string;
  summarySource?: BookSummarySource;
  sourceDetail?: string; // e.g. "Wook.pt - Sinopse Oficial" or "Bertrand Livreiros"
  alternativeSummaries?: AlternativeSummary[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  previewLink?: string;
  infoLink?: string;
  goodreadsLink?: string;
  wookLink?: string;
  bertrandLink?: string;
  fnacLink?: string;
  porbaseLink?: string;
  opacUrl?: string; // Link para Koha OPAC (Universidade de Aveiro)
  aiRelevance?: string;
}

export type EnrichmentStatus = 'pending' | 'enriching' | 'enriched' | 'partial' | 'error';

export interface EnrichedBook extends RawBookRecord {
  enriched?: EnrichedData;
  status: EnrichmentStatus;
  selectedForEmail: boolean;
  userNotes?: string;
  customCoverUrl?: string;
  customSummary?: string;
  customSummarySource?: BookSummarySource;
  errorDetails?: string;
  lastUpdated?: number;
}

export type EmailTemplateStyle = 'outlook_clean' | 'compact_catalog' | 'modern_grid' | 'classic';

export interface BulletinSettings {
  subjectArea: string;
  libraryName: string;
  issueNumber: string;
  editorialIntroduction: string;
  loanInstructions: string;
  libraryEmail: string;
  libraryWebsite: string;
  style: EmailTemplateStyle;
  showRatings: boolean;
  showSynopsis: boolean;
  showCallNumber: boolean;
  showCover: boolean;
  showGoodreadsLink: boolean;
  showWookLink: boolean;
  showBertrandLink: boolean;
  showOpacAvailability: boolean;
  opacBaseUrl: string;
}

export interface ImportPreviewResult {
  headers: string[];
  sampleRows: Record<string, any>[];
  detectedMapping: {
    biblionumber?: string;
    title: string;
    author: string;
    isbn: string;
    publicationyear?: string;
    itemcallnumber?: string;
  };
  totalRecords: number;
}
