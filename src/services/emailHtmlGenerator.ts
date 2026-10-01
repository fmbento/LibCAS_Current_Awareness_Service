import { EnrichedBook, BulletinSettings } from '../types/bibliographic';
import { formatIsbnForDisplay, sanitizeCategories, isBoilerplateSummary, optimizeCoverUrl } from './isbnCleaner';

/**
 * Generates an SVG data URI or styled placeholder for books without a cover
 */
export function generateBookCoverFallback(title: string, author: string): string {
  const safeTitle = (title.length > 40 ? title.slice(0, 38) + '...' : title).replace(/[<>&"]/g, '');
  const safeAuthor = (author.length > 30 ? author.slice(0, 28) + '...' : author).replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="340" viewBox="0 0 240 340">
    <rect width="240" height="340" fill="#292524" rx="4"/>
    <rect x="8" y="8" width="224" height="324" fill="#38332E" rx="2" stroke="#57534E" stroke-width="1"/>
    <line x1="28" y1="8" x2="28" y2="332" stroke="#1C1917" stroke-width="3"/>
    <line x1="32" y1="8" x2="32" y2="332" stroke="#78716C" stroke-width="1"/>
    <text x="130" y="110" fill="#FBF9F5" font-family="Georgia, serif" font-size="14" font-weight="bold" text-anchor="middle" width="180">
      ${safeTitle}
    </text>
    <text x="130" y="210" fill="#D6CEBE" font-family="sans-serif" font-size="11" text-anchor="middle">
      ${safeAuthor}
    </text>
    <rect x="70" y="270" width="120" height="24" fill="#1C1917" rx="3"/>
    <text x="130" y="286" fill="#A8A29E" font-family="monospace" font-size="10" text-anchor="middle">
      BIBLIOTECA
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Renders star rating visual for emails
 */
function renderEmailStars(rating: number | undefined): string {
  if (!rating) return '';
  const full = Math.round(rating);
  const stars = '★'.repeat(Math.min(5, full)) + '☆'.repeat(Math.max(0, 5 - full));
  return `<span style="color: #D97706; font-size: 13px; margin-right: 6px;">${stars}</span><span style="color: #78716C; font-size: 12px; font-family: sans-serif;">${rating.toFixed(1)}/5</span>`;
}

/**
 * Resolves the Koha OPAC URL for checking availability
 */
export function resolveOpacUrl(book: EnrichedBook, settings: BulletinSettings): string | undefined {
  if (book.enriched?.opacUrl) return book.enriched.opacUrl;
  if (book.biblionumber) {
    const base = settings.opacBaseUrl || 'https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber=';
    return `${base}${encodeURIComponent(String(book.biblionumber).trim())}`;
  }
  return undefined;
}

/**
 * Generates an email-safe, inline-styled HTML newsletter for email clients
 */
export function generateEmailHtml(books: EnrichedBook[], settings: BulletinSettings): string {
  const selectedBooks = books.filter((b) => b.selectedForEmail);
  const totalCount = selectedBooks.length;
  const introParagraphs = settings.editorialIntroduction
    .split(/\n\n+/)
    .map((p) => `<p style="margin: 0 0 12px 0; font-family: 'Georgia', serif; font-size: 15px; line-height: 1.6; color: #292524;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const loanInfo = settings.loanInstructions
    ? `<div style="background-color: #F5F2EB; border-left: 3px solid #78350F; padding: 12px 16px; margin: 20px 0; font-family: sans-serif; font-size: 13px; color: #44403C; line-height: 1.5;">
        <strong style="color: #1C1917;">Informação de Empréstimo & Consulta:</strong><br/>
        ${settings.loanInstructions.replace(/\n/g, '<br/>')}
      </div>`
    : '';

  // Render books according to selected layout style
  let booksContent = '';

/**
 * Renders the table content for the selected books according to the chosen template style
 */
export function renderBooksTableContent(selectedBooks: EnrichedBook[], settings: BulletinSettings): string {
  let booksContent = '';

  if (settings.style === 'outlook_clean') {
    // 100% Word-HTML and Outlook Classic compatible format with explicit dividing lines
    const rows = selectedBooks
      .map((b, idx) => {
        const cover = optimizeCoverUrl(b.customCoverUrl || b.enriched?.coverUrl);
        const rawSummary = b.customSummary || b.enriched?.summary;
        const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
        const isbnDisplay = formatIsbnForDisplay(b.enriched?.cleanIsbn || b.isbn);
        const starsHtml = settings.showRatings && b.enriched?.averageRating ? renderEmailStars(b.enriched.averageRating) : '';
        const opacUrl = resolveOpacUrl(b, settings);
        const cleanCats = sanitizeCategories(b.enriched?.categories);
        const isLast = idx === selectedBooks.length - 1;

        return `
          <!-- Registo #${idx + 1}: ${b.title.replace(/[<>&"]/g, '')} -->
          <tr>
            <td style="padding: 16px 0; vertical-align: top; font-family: Calibri, Arial, Helvetica, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%;">
                <tr>
                  ${settings.showCover ? `
                  <td width="95" valign="top" style="width: 95px; padding-right: 16px; vertical-align: top;">
                    ${cover ? `
                      <img src="${cover}" alt="${b.title.replace(/"/g, '&quot;')}" width="90" style="width: 90px; height: auto; max-width: 90px; display: block; border: 1px solid #CBD5E1;" border="0" />
                    ` : `
                      <table width="90" height="120" cellpadding="0" cellspacing="0" border="0" style="width: 90px; height: 120px; background-color: #F1F5F9; border: 1px solid #CBD5E1;">
                        <tr>
                          <td align="center" valign="middle" style="font-family: Calibri, Arial, sans-serif; font-size: 10px; color: #64748B; text-align: center; vertical-align: middle;">
                            Sem Capa
                          </td>
                        </tr>
                      </table>
                    `}
                  </td>` : ''}
                  <td valign="top" style="vertical-align: top; font-family: Calibri, Arial, Helvetica, sans-serif;">
                    
                    <!-- Título Numerado -->
                    <div style="font-family: Calibri, Arial, sans-serif; font-size: 16px; font-weight: bold; color: #0F172A; line-height: 1.35; margin-bottom: 4px;">
                      ${idx + 1}. ${b.title}
                    </div>

                    <!-- Autoria e Detalhes da Edição -->
                    <div style="font-family: Calibri, Arial, sans-serif; font-size: 13px; color: #475569; margin-bottom: 7px; line-height: 1.4;">
                      <strong>Autor:</strong> ${b.author}
                      ${b.publicationyear ? ` &nbsp;|&nbsp; <strong>Ano:</strong> ${b.publicationyear}` : ''}
                      ${b.enriched?.publisher ? ` &nbsp;|&nbsp; <strong>Editora:</strong> ${b.enriched.publisher}` : ''}
                    </div>

                    <!-- Caixa de Cota e Registo Koha (Destaque seguro para Outlook) -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px; border-collapse: collapse;">
                      <tr>
                        <td style="background-color: #F1F5F9; border: 1px solid #CBD5E1; padding: 4px 10px; font-family: Consolas, 'Courier New', monospace; font-size: 12px; color: #0F172A;">
                          <strong>COTA:</strong> <span style="color: #B91C1C; font-weight: bold;">${b.itemcallnumber || 'Consultar Biblioteca'}</span>
                          ${b.biblionumber ? ` &nbsp;|&nbsp; <strong>Nº Registo:</strong> ${b.biblionumber}` : ''}
                          ${isbnDisplay ? ` &nbsp;|&nbsp; <strong>ISBN:</strong> ${isbnDisplay}` : ''}
                        </td>
                      </tr>
                    </table>

                    <!-- Ligação Direta ao Catálogo Koha -->
                    ${settings.showOpacAvailability !== false && opacUrl ? `
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px; border-collapse: collapse;">
                      <tr>
                        <td style="background-color: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px;">
                          <a href="${opacUrl}" style="color: #047857; font-weight: bold; text-decoration: underline; font-family: Calibri, Arial, sans-serif; font-size: 12px;" target="_blank">
                            &#9658; Ver disponibilidade no Catálogo Koha (Clique para consultar)
                          </a>
                        </td>
                      </tr>
                    </table>` : ''}

                    <!-- Avaliação com Estrelas -->
                    ${starsHtml ? `<div style="margin-bottom: 6px;">${starsHtml}</div>` : ''}

                    <!-- Assuntos Limpos (sem Publicações Recentes / Bibliografia) -->
                    ${cleanCats && cleanCats.length > 0 ? `
                    <div style="font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #64748B; margin-bottom: 6px;">
                      <strong>Assuntos:</strong> ${cleanCats.slice(0, 4).join(' &bull; ')}
                    </div>` : ''}

                    <!-- Sinopse Formatada em Caixa com Borda Lateral -->
                    ${settings.showSynopsis && summary ? `
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 10px 0; border-collapse: collapse;">
                      <tr>
                        <td style="border-left: 3px solid #0284C7; background-color: #F8FAFC; padding: 9px 13px; font-family: Calibri, Arial, sans-serif; font-size: 13px; color: #334155; line-height: 1.5;">
                          <strong>Sinopse:</strong> ${summary}
                        </td>
                      </tr>
                    </table>` : ''}

                    <!-- Ligações Rápidas Externas -->
                    <div style="font-family: Calibri, Arial, sans-serif; font-size: 11px; color: #64748B;">
                      ${settings.showOpacAvailability !== false && opacUrl ? `<a href="${opacUrl}" style="color: #047857; font-weight: bold; text-decoration: underline;" target="_blank">Catálogo Koha</a> &nbsp;|&nbsp; ` : ''}
                      ${isbnDisplay ? `<span>ISBN ${isbnDisplay}</span>` : ''}
                      ${settings.showWookLink && b.enriched?.wookLink ? ` &nbsp;|&nbsp; <a href="${b.enriched.wookLink}" style="color: #C2410C; font-weight: bold; text-decoration: underline;" target="_blank">Wook.pt</a>` : ''}
                      ${settings.showBertrandLink && b.enriched?.bertrandLink ? ` &nbsp;|&nbsp; <a href="${b.enriched.bertrandLink}" style="color: #1D4ED8; text-decoration: underline;" target="_blank">Bertrand</a>` : ''}
                      ${settings.showGoodreadsLink && b.enriched?.goodreadsLink ? ` &nbsp;|&nbsp; <a href="${b.enriched.goodreadsLink}" style="color: #854D0E; text-decoration: underline;" target="_blank">GoodReads</a>` : ''}
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${!isLast ? `
          <!-- Linha Divisória de Registos (100% Compatível com Word/Outlook Classic) -->
          <tr>
            <td style="padding: 0; margin: 0; line-height: 1px; font-size: 1px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td style="border-top: 2px solid #CBD5E1; height: 2px; font-size: 1px; line-height: 1px; background-color: #CBD5E1;" height="2">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
        `;
      })
      .join('');

    booksContent = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 10px;">
        ${rows}
      </table>
    `;
  } else if (settings.style === 'compact_catalog') {
    // Compact row list with clear call number & Koha OPAC availability link
    const rows = selectedBooks
      .map((b, idx) => {
        const cover = optimizeCoverUrl(b.customCoverUrl || b.enriched?.coverUrl);
        const rawSummary = b.customSummary || b.enriched?.summary;
        const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
        const isbnDisplay = formatIsbnForDisplay(b.enriched?.cleanIsbn || b.isbn);
        const starsHtml = settings.showRatings && b.enriched?.averageRating ? renderEmailStars(b.enriched.averageRating) : '';
        const opacUrl = resolveOpacUrl(b, settings);
        const isLast = idx === selectedBooks.length - 1;

        return `
          <tr style="${idx % 2 === 1 ? 'background-color: #FAFAF7;' : ''}">
            ${settings.showCover ? `
            <td style="padding: 12px; width: 60px; vertical-align: top; border-bottom: 1px solid #E5E0D8;">
              ${cover ? `<img src="${cover}" alt="${b.title.replace(/"/g, '&quot;')}" width="54" style="width: 54px; height: auto; border: 1px solid #D6D3CD; display: block;" border="0" />` : `<div style="width: 50px; height: 70px; background-color: #E7E3DC; border: 1px solid #D6D3CD; font-size: 9px; text-align: center; padding-top: 25px; color: #78716C;">Sem Capa</div>`}
            </td>` : ''}
            <td style="padding: 12px; vertical-align: top; border-bottom: 1px solid #E5E0D8;">
              <div style="font-family: 'Georgia', serif; font-size: 16px; font-weight: bold; color: #1C1917; margin-bottom: 3px;">
                ${idx + 1}. ${b.title}
              </div>
              <div style="font-family: sans-serif; font-size: 13px; color: #57534E; margin-bottom: 6px;">
                <strong>Autor(es):</strong> ${b.author}
                ${b.publicationyear ? ` &middot; <strong>Ano:</strong> ${b.publicationyear}` : ''}
                ${b.enriched?.publisher ? ` &middot; <strong>Editora:</strong> ${b.enriched.publisher}` : ''}
              </div>
              <div style="font-family: monospace, sans-serif; font-size: 12px; color: #1E3A8A; background-color: #EFF6FF; display: inline-block; padding: 2px 8px; border-radius: 3px; border: 1px solid #BFDBFE; margin-bottom: 6px;">
                <strong>COTA:</strong> ${b.itemcallnumber || 'A atribuir'}
                ${b.biblionumber ? ` &middot; <strong>Registo:</strong> ${b.biblionumber}` : ''}
                ${isbnDisplay ? ` &middot; <strong>ISBN:</strong> ${isbnDisplay}` : ''}
              </div>
              ${settings.showOpacAvailability !== false && opacUrl ? `
                <div style="margin-bottom: 6px;">
                  <a href="${opacUrl}" style="color: #15803D; font-weight: bold; text-decoration: underline; font-family: sans-serif; font-size: 12px;" target="_blank">
                    &rarr; Ver disponibilidade (Catálogo Koha)
                  </a>
                </div>` : ''}
              ${starsHtml ? `<div style="margin-bottom: 6px;">${starsHtml}</div>` : ''}
              ${settings.showSynopsis && summary ? `
                <div style="font-family: sans-serif; font-size: 12px; color: #44403C; line-height: 1.5; margin-top: 4px;">
                  ${summary.length > 240 ? summary.slice(0, 235) + '...' : summary}
                </div>` : ''}
            </td>
          </tr>
          ${!isLast ? `
          <tr>
            <td colspan="${settings.showCover ? 2 : 1}" style="height: 1px; background-color: #CBD5E1; font-size: 1px; line-height: 1px;" height="1">&nbsp;</td>
          </tr>` : ''}
        `;
      })
      .join('');

    booksContent = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 15px; border-top: 2px solid #292524;">
        ${rows}
      </table>
    `;
  } else if (settings.style === 'modern_grid') {
    // 2-column or stacked card layout with prominent cover showcase and Outlook-safe table margins
    booksContent = selectedBooks
      .map((b, idx) => {
        const cover = optimizeCoverUrl(b.customCoverUrl || b.enriched?.coverUrl) || generateBookCoverFallback(b.title, b.author);
        const rawSummary = b.customSummary || b.enriched?.summary;
        const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
        const isbnDisplay = formatIsbnForDisplay(b.enriched?.cleanIsbn || b.isbn);
        const starsHtml = settings.showRatings && b.enriched?.averageRating ? renderEmailStars(b.enriched.averageRating) : '';
        const opacUrl = resolveOpacUrl(b, settings);

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #CBD5E1; background-color: #FFFFFF; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 18px; vertical-align: top;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    ${settings.showCover ? `
                    <td width="130" style="width: 130px; vertical-align: top; padding-right: 18px;">
                      <img src="${cover}" alt="${b.title.replace(/"/g, '&quot;')}" width="125" style="width: 125px; height: auto; max-height: 190px; border: 1px solid #D6D3CD; display: block;" border="0" />
                    </td>` : ''}
                    <td style="vertical-align: top;">
                      <div style="font-family: monospace, sans-serif; font-size: 11px; text-transform: uppercase; color: #78350F; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px;">
                        COTA: ${b.itemcallnumber || 'Balcão de Atendimento'} &middot; REGISTO: ${b.biblionumber || 'N/D'}
                        ${settings.showOpacAvailability !== false && opacUrl ? ` &middot; <a href="${opacUrl}" style="color: #15803D; text-decoration: underline;" target="_blank">Ver disponibilidade</a>` : ''}
                      </div>
                      <h3 style="margin: 0 0 6px 0; font-family: 'Georgia', serif; font-size: 18px; font-weight: 600; color: #1C1917; line-height: 1.3;">
                        ${idx + 1}. ${b.title}
                      </h3>
                      <div style="font-family: sans-serif; font-size: 13px; color: #57534E; margin-bottom: 8px;">
                        Por <strong>${b.author}</strong>
                        ${b.publicationyear ? ` &middot; ${b.publicationyear}` : ''}
                        ${b.enriched?.publisher ? ` &middot; <em>${b.enriched.publisher}</em>` : ''}
                      </div>
                      ${starsHtml ? `<div style="margin-bottom: 8px;">${starsHtml}</div>` : ''}
                      ${settings.showSynopsis && summary ? `
                        <div style="font-family: 'Georgia', serif; font-size: 13px; color: #44403C; line-height: 1.55; margin-bottom: 10px; background-color: #FAFAF7; padding: 10px; border-left: 2px solid #D6CEBE;">
                          ${summary}
                        </div>` : ''}
                      <div style="font-family: sans-serif; font-size: 11px; color: #78716C;">
                        ${settings.showOpacAvailability !== false && opacUrl ? `<a href="${opacUrl}" style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; font-weight: bold; text-decoration: none; padding: 2px 8px; border-radius: 3px; margin-right: 6px;" target="_blank">Ver disponibilidade</a> &middot; ` : ''}
                        ${isbnDisplay ? `<span><strong>ISBN:</strong> ${isbnDisplay}</span>` : ''}
                        ${b.enriched?.pageCount ? ` &middot; <span>${b.enriched.pageCount} págs.</span>` : ''}
                        ${settings.showWookLink && b.enriched?.wookLink ? ` &middot; <a href="${b.enriched.wookLink}" style="color: #9A3412; font-weight: bold; text-decoration: underline;" target="_blank">Ver na Wook</a>` : ''}
                        ${settings.showBertrandLink && b.enriched?.bertrandLink ? ` &middot; <a href="${b.enriched.bertrandLink}" style="color: #1E3A8A; text-decoration: underline;" target="_blank">Bertrand</a>` : ''}
                        ${settings.showGoodreadsLink && b.enriched?.goodreadsLink ? ` &middot; <a href="${b.enriched.goodreadsLink}" style="color: #1E3A8A; text-decoration: underline;" target="_blank">GoodReads</a>` : ''}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      })
      .join('');
  } else {
    // Classic Editorial Library Bulletin (Institutional Standard) with explicit table dividing lines
    const rows = selectedBooks
      .map((b, idx) => {
        const cover = optimizeCoverUrl(b.customCoverUrl || b.enriched?.coverUrl) || generateBookCoverFallback(b.title, b.author);
        const rawSummary = b.customSummary || b.enriched?.summary;
        const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
        const isbnDisplay = formatIsbnForDisplay(b.enriched?.cleanIsbn || b.isbn);
        const starsHtml = settings.showRatings && b.enriched?.averageRating ? renderEmailStars(b.enriched.averageRating) : '';
        const opacUrl = resolveOpacUrl(b, settings);
        const relevance = isBoilerplateSummary(b.enriched?.aiRelevance) ? undefined : b.enriched?.aiRelevance;
        const cleanCats = sanitizeCategories(b.enriched?.categories);
        const isLast = idx === selectedBooks.length - 1;

        return `
          <tr>
            <td style="padding: 16px 0; vertical-align: top;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  ${settings.showCover ? `
                  <td width="115" style="width: 115px; vertical-align: top; padding-right: 16px;">
                    <img src="${cover}" alt="${b.title.replace(/"/g, '&quot;')}" width="105" style="width: 105px; height: auto; max-height: 160px; display: block; border: 1px solid #D6D3CD;" border="0" />
                  </td>` : ''}
                  <td style="vertical-align: top;">
                    <div style="font-family: monospace, sans-serif; font-size: 11px; color: #9A3412; font-weight: bold; margin-bottom: 2px;">
                      COTA: ${b.itemcallnumber || 'Consultar Biblioteca'} ${b.biblionumber ? ` &middot; REG: ${b.biblionumber}` : ''}
                      ${settings.showOpacAvailability !== false && opacUrl ? ` &middot; <a href="${opacUrl}" style="color: #15803D; font-weight: bold; text-decoration: underline;" target="_blank">Ver disponibilidade</a>` : ''}
                    </div>
                    <h3 style="margin: 0 0 4px 0; font-family: 'Georgia', serif; font-size: 17px; font-weight: bold; color: #1C1917; line-height: 1.3;">
                      ${idx + 1}. ${b.title}
                    </h3>
                    <div style="font-family: sans-serif; font-size: 13px; color: #44403C; margin-bottom: 6px;">
                      <strong>Autor:</strong> ${b.author}
                      ${b.publicationyear ? ` &middot; <strong>Ano:</strong> ${b.publicationyear}` : ''}
                      ${b.enriched?.publisher ? ` &middot; <strong>Editor:</strong> ${b.enriched.publisher}` : ''}
                    </div>
                    ${starsHtml ? `<div style="margin-bottom: 6px;">${starsHtml}</div>` : ''}
                    ${settings.showSynopsis && summary ? `
                      <div style="font-family: 'Georgia', serif; font-size: 13px; color: #292524; line-height: 1.5; margin-bottom: 6px;">
                        ${summary}
                      </div>` : ''}
                    ${relevance ? `
                      <div style="font-family: sans-serif; font-size: 11px; color: #1E3A8A; font-style: italic; margin-bottom: 6px;">
                        <strong>Nota Curatorial:</strong> ${relevance}
                      </div>` : ''}
                    <div style="font-family: sans-serif; font-size: 11px; color: #78716C;">
                      ${settings.showOpacAvailability !== false && opacUrl ? `<a href="${opacUrl}" style="color: #15803D; font-weight: bold; text-decoration: underline;" target="_blank">Ver disponibilidade</a> &middot; ` : ''}
                      ${isbnDisplay ? `<span>ISBN ${isbnDisplay}</span>` : ''}
                      ${cleanCats && cleanCats.length > 0 ? ` &middot; <span>Assuntos: ${cleanCats.slice(0, 3).join(', ')}</span>` : ''}
                      ${settings.showWookLink && b.enriched?.wookLink ? ` &middot; <a href="${b.enriched.wookLink}" style="color: #9A3412; font-weight: bold; text-decoration: underline;" target="_blank">Consultar na Wook</a>` : ''}
                      ${settings.showBertrandLink && b.enriched?.bertrandLink ? ` &middot; <a href="${b.enriched.bertrandLink}" style="color: #1E3A8A; text-decoration: underline;" target="_blank">Bertrand</a>` : ''}
                      ${settings.showGoodreadsLink && b.enriched?.goodreadsLink ? ` &middot; <a href="${b.enriched.goodreadsLink}" style="color: #78350F; text-decoration: underline;" target="_blank">GoodReads</a>` : ''}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${!isLast ? `
          <tr>
            <td style="padding: 0; margin: 0; line-height: 1px; font-size: 1px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td style="border-top: 1px solid #D6D3CD; height: 1px; font-size: 1px; line-height: 1px; background-color: #D6D3CD;" height="1">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
        `;
      })
      .join('');

    booksContent = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%;">
        ${rows}
      </table>
    `;
  }

  return booksContent;
}

/**
 * Generates an email-safe, inline-styled HTML newsletter for email clients
 */
export function generateEmailHtml(books: EnrichedBook[], settings: BulletinSettings): string {
  const selectedBooks = books.filter((b) => b.selectedForEmail);
  const totalCount = selectedBooks.length;
  const isOutlook = settings.style === 'outlook_clean';
  const primaryFont = isOutlook ? "Calibri, 'Segoe UI', Arial, sans-serif" : "'Georgia', serif";

  const introParagraphs = settings.editorialIntroduction
    .split(/\n\n+/)
    .map((p) => `<p style="margin: 0 0 12px 0; font-family: ${primaryFont}; font-size: ${isOutlook ? '14px' : '15px'}; line-height: 1.6; color: #1E293B;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const loanInfo = settings.loanInstructions
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border-collapse: collapse;">
        <tr>
          <td style="background-color: ${isOutlook ? '#F0F9FF' : '#F5F2EB'}; border-left: 4px solid ${isOutlook ? '#0284C7' : '#78350F'}; padding: 12px 16px; font-family: Calibri, Arial, sans-serif; font-size: 13px; color: #334155; line-height: 1.5;">
            <strong style="color: #0F172A;">Informação de Empréstimo & Consulta:</strong><br/>
            ${settings.loanInstructions.replace(/\n/g, '<br/>')}
          </td>
        </tr>
      </table>`
    : '';

  // Render books according to selected layout style
  const booksContent = renderBooksTableContent(selectedBooks, settings);

  // Full email wrapper with 620px container width optimal for all email clients
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${settings.subjectArea} - ${settings.libraryName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${isOutlook ? '#F1F5F9' : '#FBF9F5'}; font-family: ${primaryFont}; color: #1C1917; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <center style="width: 100%; background-color: ${isOutlook ? '#F1F5F9' : '#FBF9F5'}; padding: 24px 0;">
    <!-- Container 620px -->
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="620" style="max-width: 620px; width: 100%; background-color: #FFFFFF; border: 1px solid ${isOutlook ? '#CBD5E1' : '#E7E3DC'}; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-collapse: collapse;">
      
      <!-- Institutional Top Header -->
      <tr>
        <td style="background-color: ${isOutlook ? '#0F172A' : '#1C1917'}; padding: 24px 30px; text-align: left; border-bottom: 3px solid ${isOutlook ? '#0284C7' : '#9A3412'};">
          <div style="font-family: Calibri, Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${isOutlook ? '#94A3B8' : '#D6CEBE'}; margin-bottom: 6px;">
            ${settings.libraryName || 'Biblioteca Central'} &middot; ${settings.issueNumber || 'Boletim de Aquisições'}
          </div>
          <h1 style="margin: 0; font-family: ${isOutlook ? "Calibri, 'Segoe UI', Arial, sans-serif" : "'Georgia', serif"}; font-size: 22px; font-weight: bold; color: #FFFFFF; line-height: 1.25;">
            Novas Aquisições: ${settings.subjectArea}
          </h1>
          <div style="font-family: Calibri, Arial, sans-serif; font-size: 12px; color: ${isOutlook ? '#CBD5E1' : '#A8A29E'}; margin-top: 6px;">
            Total de obras selecionadas: ${totalCount} &middot; Acervo Disponível para Empréstimo
          </div>
        </td>
      </tr>

      <!-- Editorial Intro -->
      <tr>
        <td style="padding: 24px 30px 10px 30px; background-color: #FFFFFF;">
          ${introParagraphs}
          ${loanInfo}
        </td>
      </tr>

      <!-- Book List Header -->
      <tr>
        <td style="padding: 10px 30px 4px 30px;">
          <div style="font-family: Calibri, Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748B; border-bottom: 1px solid #CBD5E1; padding-bottom: 8px;">
            Relação Bibliográfica das Novas Obras
          </div>
        </td>
      </tr>

      <!-- Books Content -->
      <tr>
        <td style="padding: 0 30px 24px 30px;">
          ${booksContent}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: ${isOutlook ? '#F8FAFC' : '#F5F2EB'}; padding: 22px 30px; border-top: 1px solid ${isOutlook ? '#CBD5E1' : '#E7E3DC'}; text-align: center;">
          <div style="font-family: ${primaryFont}; font-size: 14px; font-weight: bold; color: #1E293B; margin-bottom: 6px;">
            ${settings.libraryName}
          </div>
          <div style="font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #64748B; line-height: 1.6;">
            ${settings.libraryEmail ? `Email: <a href="mailto:${settings.libraryEmail}" style="color: ${isOutlook ? '#0284C7' : '#9A3412'}; text-decoration: none;">${settings.libraryEmail}</a>` : ''}
            ${settings.libraryWebsite ? ` &middot; Website: <a href="${settings.libraryWebsite}" style="color: ${isOutlook ? '#0284C7' : '#9A3412'}; text-decoration: none;">${settings.libraryWebsite}</a>` : ''}
            <br/>
            Este boletim bibliográfico foi preparado para visualização e consulta rápida no Outlook Classic, Gmail e Webmail.
          </div>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;
}

/**
 * Generates only the HTML table of selected book records (without email headers/footers)
 * Perfectly styled and self-contained for inserting into an existing Outlook message draft
 */
export function generateRecordsOnlyHtml(books: EnrichedBook[], settings: BulletinSettings): string {
  const selectedBooks = books.filter((b) => b.selectedForEmail);
  const booksContent = renderBooksTableContent(selectedBooks, settings);

  return `<!-- Bibliotrack: Lista de Obras Formatada para Outlook Classic & Webmail -->
<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; width: 100%; border-collapse: collapse; font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #1C1917;">
  <tr>
    <td style="padding: 10px 0 20px 0; vertical-align: top;">
      ${booksContent}
    </td>
  </tr>
</table>`;
}

/**
 * Generates Plain Text / Markdown version for email
 */
export function generatePlainTextEmail(books: EnrichedBook[], settings: BulletinSettings): string {
  const selectedBooks = books.filter((b) => b.selectedForEmail);

  let out = `========================================================================\n`;
  out += `${settings.libraryName.toUpperCase()}\n`;
  out += `BOLETIM DE NOVAS AQUISIÇÕES: ${settings.subjectArea.toUpperCase()}\n`;
  out += `${settings.issueNumber}\n`;
  out += `========================================================================\n\n`;

  out += `${settings.editorialIntroduction}\n\n`;

  if (settings.loanInstructions) {
    out += `--- INFORMAÇÕES DE EMPRÉSTIMO & RESERVA ---\n`;
    out += `${settings.loanInstructions}\n\n`;
  }

  out += `--- LISTA DE OBRAS ADQUIRIDAS (${selectedBooks.length} títulos) ---\n\n`;

  selectedBooks.forEach((b, idx) => {
    out += `${idx + 1}. ${b.title.toUpperCase()}\n`;
    out += `   Autor(es): ${b.author}\n`;
    if (b.itemcallnumber) out += `   COTA: ${b.itemcallnumber}\n`;
    if (b.biblionumber) out += `   Nº Registo: ${b.biblionumber}\n`;
    const opacUrl = resolveOpacUrl(b, settings);
    if (settings.showOpacAvailability !== false && opacUrl) {
      out += `   Ver disponibilidade: ${opacUrl}\n`;
    }
    if (b.isbn) out += `   ISBN: ${formatIsbnForDisplay(b.enriched?.cleanIsbn || b.isbn)}\n`;
    if (b.publicationyear) out += `   Ano: ${b.publicationyear}\n`;
    if (b.enriched?.publisher) out += `   Editora: ${b.enriched.publisher}\n`;
    if (b.enriched?.averageRating) out += `   Avaliação: ${b.enriched.averageRating}/5 (${b.enriched.ratingsCount || 0} avaliações)\n`;

    const cleanCats = sanitizeCategories(b.enriched?.categories);
    if (cleanCats && cleanCats.length > 0) {
      out += `   Assuntos: ${cleanCats.join(', ')}\n`;
    }

    const rawSummary = b.customSummary || b.enriched?.summary;
    const summary = isBoilerplateSummary(rawSummary) ? undefined : rawSummary;
    if (summary) {
      out += `   Sinopse: ${summary.replace(/\n+/g, ' ')}\n`;
    }
    if (settings.showWookLink && b.enriched?.wookLink) {
      out += `   Wook.pt: ${b.enriched.wookLink}\n`;
    }
    if (settings.showBertrandLink && b.enriched?.bertrandLink) {
      out += `   Bertrand: ${b.enriched.bertrandLink}\n`;
    }
    if (settings.showGoodreadsLink && b.enriched?.goodreadsLink) {
      out += `   Goodreads: ${b.enriched.goodreadsLink}\n`;
    }
    out += `\n`;
  });

  out += `========================================================================\n`;
  out += `${settings.libraryName}\n`;
  if (settings.libraryEmail) out += `Contacto: ${settings.libraryEmail}\n`;
  if (settings.libraryWebsite) out += `Catálogo Online: ${settings.libraryWebsite}\n`;
  out += `========================================================================\n`;

  return out;
}

/**
 * Copies rich HTML to clipboard so user can paste formatted content into Gmail/Outlook
 */
export async function copyHtmlToClipboard(html: string, plainText: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    } else {
      // Fallback
      await navigator.clipboard.writeText(html);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write error, trying fallback:', err);
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}
