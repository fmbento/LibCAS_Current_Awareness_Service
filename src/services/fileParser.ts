import * as XLSX from 'xlsx';
import { RawBookRecord, EnrichedBook } from '../types/bibliographic';
import { getPrimaryIsbn, getOpacUrl } from './isbnCleaner';

// Known column aliases for intelligent auto-detection
const ALIASES: Record<string, string[]> = {
  biblionumber: ['biblionumber', 'biblio', 'registo', 'registro', 'n_registo', 'num_registo', 'recid', 'id', 'sys_id', 'numero'],
  title: ['title', 'título', 'titulo', 'obra', 'denominacao', 'livro', 'nome_livro'],
  author: ['author', 'autor', 'autores', 'autoria', 'responsabilidade', 'org', 'editor', 'criador'],
  isbn: ['isbn', 'isbn13', 'isbn10', 'ean', 'codigo_barras'],
  publicationyear: ['publicationyear', 'ano', 'year', 'data_publicacao', 'ano_pub', 'data', 'pubyear'],
  itemcallnumber: ['itemcallnumber', 'cota', 'callnumber', 'call_number', 'localizacao', 'classificacao', 'estante', 'shelfmark'],
};

/**
 * Matches a header string to one of our standard bibliographic fields
 */
export function matchHeaderToField(header: string): string | null {
  const normalized = header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      const normAlias = alias.replace(/[^a-z0-9]/g, '');
      if (normalized === normAlias || normalized.includes(normAlias)) {
        return field;
      }
    }
  }
  return null;
}

/**
 * Detects mapping from an array of header names
 */
export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const h of headers) {
    const matched = matchHeaderToField(h);
    if (matched && !mapping[matched]) {
      mapping[matched] = h;
    }
  }

  return mapping;
}

/**
 * Parse an Excel file (ArrayBuffer) or CSV/TSV text into raw JSON rows
 */
export async function parseFileToRows(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    const text = await file.text();
    return parseTextToRows(text);
  }

  // Parse Excel (XLSX, XLS) using sheetjs
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(jsonData[0]);
  return { headers, rows: jsonData };
}

/**
 * Parse raw text (CSV, TSV, or tab-delimited paste)
 */
export function parseTextToRows(rawText: string): { headers: string[]; rows: Record<string, any>[] } {
  const trimmed = rawText.trim();
  if (!trimmed) return { headers: [], rows: [] };

  // Detect delimiter: tab, semicolon, comma
  const firstLine = trimmed.split('\n')[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0)) {
    delimiter = ';';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  }

  const workbook = XLSX.read(trimmed, { type: 'string', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  if (jsonData.length > 0) {
    const headers = Object.keys(jsonData[0]);
    return { headers, rows: jsonData };
  }

  // Manual fallback split
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] !== undefined ? cells[idx] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Transforms raw rows + column mapping into EnrichedBook instances
 */
export function convertRowsToBooks(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  subjectAreaDefault: string = ''
): EnrichedBook[] {
  return rows
    .map((row, index) => {
      const title = String(row[mapping.title || 'title'] || row['Title'] || row['Título'] || '').trim();
      const author = String(row[mapping.author || 'author'] || row['Author'] || row['Autor'] || '').trim();
      const isbnRaw = String(row[mapping.isbn || 'isbn'] || row['ISBN'] || '').trim();
      const biblionumber = String(
        row[mapping.biblionumber || 'biblionumber'] || row['Biblionumber'] || row['Nº Registo'] || ''
      ).trim();
      const itemcallnumber = String(
        row[mapping.itemcallnumber || 'itemcallnumber'] || row['Itemcallnumber'] || row['Cota'] || ''
      ).trim();
      const publicationyear = String(
        row[mapping.publicationyear || 'publicationyear'] || row['Publicationyear'] || row['Ano'] || ''
      ).trim();

      if (!title && !isbnRaw) {
        return null; // Skip completely empty rows
      }

      const cleanIsbn = getPrimaryIsbn(isbnRaw);

      const book: EnrichedBook = {
        id: `book-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        biblionumber: biblionumber || undefined,
        title: title || 'Título não especificado',
        author: author || 'Autor Desconhecido',
        isbn: isbnRaw,
        publicationyear: publicationyear || undefined,
        itemcallnumber: itemcallnumber || undefined,
        subjectArea: subjectAreaDefault,
        rawRowData: row,
        status: 'pending',
        selectedForEmail: true,
        enriched: {
          cleanIsbn,
          opacUrl: getOpacUrl(biblionumber),
          wookLink: cleanIsbn ? `https://www.wook.pt/pesquisa/${encodeURIComponent(cleanIsbn)}` : undefined,
          bertrandLink: cleanIsbn ? `https://www.bertrand.pt/pesquisa/${encodeURIComponent(cleanIsbn)}` : undefined,
        },
      };

      return book;
    })
    .filter((b): b is EnrichedBook => b !== null);
}
