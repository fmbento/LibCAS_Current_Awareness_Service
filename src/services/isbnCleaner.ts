/**
 * Normalizes and extracts ISBNs from bibliographic records
 */
export function extractCleanIsbns(rawIsbnInput: string | number | undefined | null): string[] {
  if (!rawIsbnInput) return [];
  const text = String(rawIsbnInput).trim();
  if (!text) return [];

  // Split by common delimiters: pipe, comma, semicolon, slash, newline
  const parts = text.split(/[|,;\/\n]/);
  const foundIsbns: string[] = [];

  for (const part of parts) {
    // Remove formatting, hyphens, and non-ISBN chars, keeping digits and 'X'
    const cleaned = part.replace(/[^0-9Xx]/g, '').toUpperCase();
    
    // Check if it matches ISBN-13 (13 digits starting with 978 or 979) or ISBN-10 (10 chars)
    if (cleaned.length === 13 && (cleaned.startsWith('978') || cleaned.startsWith('979'))) {
      foundIsbns.push(cleaned);
    } else if (cleaned.length === 10) {
      foundIsbns.push(cleaned);
    } else if (cleaned.length > 13) {
      // Sometimes multiple ISBNs are glued or have extra numbers, extract sub-patterns
      const match13 = cleaned.match(/(97[89]\d{10})/g);
      if (match13) {
        foundIsbns.push(...match13);
      }
    }
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(foundIsbns));
}

/**
 * Returns the primary clean ISBN (prefers ISBN-13 if available)
 */
export function getPrimaryIsbn(rawIsbnInput: string | number | undefined | null): string {
  const isbns = extractCleanIsbns(rawIsbnInput);
  if (isbns.length === 0) {
    // If no strict ISBN pattern matches, return digits only as best effort
    const digitsOnly = String(rawIsbnInput || '').replace(/[^0-9Xx]/g, '');
    return digitsOnly.slice(0, 13);
  }
  // Prefer 13 digits
  const isbn13 = isbns.find((i) => i.length === 13);
  return isbn13 || isbns[0];
}

/**
 * Formats a clean 13-digit ISBN with standard hyphens for display
 * e.g. 9780814255636 -> 978-0-8142-5563-6
 */
export function formatIsbnForDisplay(isbn: string): string {
  if (!isbn) return '';
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  if (clean.length === 13) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  }
  return isbn;
}

/**
 * Transforms low-res thumbnail URLs (Goodreads, Amazon, Google Books) to crisp, high-resolution covers
 */
export function optimizeCoverUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  let clean = url.trim();
  if (clean.includes('nophoto') || clean.includes('placeholder')) return undefined;
  // Goodreads / Amazon image thumbnail resize removal: e.g. ._SX50_.jpg -> .jpg
  clean = clean.replace(/\._[A-Za-z0-9_]+_\.(jpg|jpeg|png|webp)$/i, '.$1');
  // Google Books: secure https and remove curl/low-zoom constraints
  if (clean.includes('books.google.com')) {
    clean = clean.replace(/&edge=curl/g, '');
    clean = clean.replace(/^http:\/\//i, 'https://');
  }
  return clean;
}

export const DEFAULT_OPAC_BASE_URL = 'https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber=';

/**
 * Builds direct Koha OPAC URL for checking real-time shelf availability and reservations
 */
export function getOpacUrl(
  biblionumber: string | number | undefined,
  baseUrl: string = DEFAULT_OPAC_BASE_URL
): string | undefined {
  if (!biblionumber) return undefined;
  const clean = String(biblionumber).trim();
  if (!clean) return undefined;
  return `${baseUrl}${encodeURIComponent(clean)}`;
}

/**
 * Filters out generic filler subjects like 'Publicações Recentes / Bibliografia', 'Publicações Recentes', 'Bibliografia', or 'Geral'
 */
export function sanitizeCategories(categories: (string | undefined | null)[] | undefined): string[] | undefined {
  if (!categories || !Array.isArray(categories)) return undefined;
  const forbiddenPatterns = [
    /publica[cç][oõ]es\s+recentes/i,
    /bibliografia/i,
    /recent\s+publications/i,
    /bibliography/i,
    /^geral$/i,
    /^sem\s+assunto$/i,
    /^assuntos?$/i,
    /^livros?$/i,
  ];

  const result: string[] = [];

  for (const raw of categories) {
    if (!raw) continue;
    const str = String(raw).trim();
    // Split sub-elements if combined with slash, pipe, or semicolon
    const subParts = str.includes('/') || str.includes(';') || str.includes('|')
      ? str.split(/[\/;|]+/)
      : [str];

    for (const part of subParts) {
      const cleanPart = part.trim().replace(/^[-–—•\s]+|[-–—•\s]+$/g, '');
      if (cleanPart.length < 2) continue;
      const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(cleanPart));
      if (!isForbidden) {
        result.push(cleanPart);
      }
    }
  }

  const unique = Array.from(new Set(result));
  return unique.length > 0 ? unique : undefined;
}

/**
 * Detects generic canned boilerplate summaries that add zero value
 */
export function isBoilerplateSummary(summary?: string | null): boolean {
  if (!summary) return false;
  const lower = summary.toLowerCase();
  return (
    lower.includes('obra no domínio de') ||
    lower.includes('obra recomendada para consulta') ||
    lower.includes('título catalogado e disponível') ||
    lower.includes('disponível para consulta presencial') ||
    lower.includes('requisição domiciliária na biblioteca')
  );
}

