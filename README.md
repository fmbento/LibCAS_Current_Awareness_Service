# LibCAS 📚 — Current Awareness Service
> **Boletim de Novas Aquisições & Enriquecimento Bibliográfico para Bibliotecas**

[![Language](https://img.shields.io/badge/Language-Portugu%C3%AAs%20%7C%20English-blue.svg)](#índice--table-of-contents)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)

## Visão Geral

O **LibCAS** (*Current Awareness Service*) é uma aplicação web concebida para bibliotecas e serviços de documentação universitários ou municipais. Permite carregar ficheiros bibliográficos (CSV, TSV, XLS ou XLSX) correspondentes às últimas aquisições de uma determinada área temática, enriquecer automaticamente cada registo através de múltiplos catálogos online (capa em alta resolução, sinopse informativa real, editora, páginas, cota e avaliações) e gerar um **boletim de novidades em HTML inline**, pronto a copiar e colar em qualquer cliente de correio eletrónico (Outlook, Gmail, Thunderbird, Apple Mail) para divulgação junto de investigadores, docentes e leitores.

---
## Overview

**LibCAS** (*Current Awareness Service*) is a specialized web application built for university, research, and public libraries. It allows librarians to upload bibliographic datasets (CSV, TSV, XLS, or XLSX) containing newly acquired books for a specific subject area, automatically enrich every record via multiple online catalog sources (full-resolution book covers, authentic synopses, publishers, page counts, call numbers, and ratings), and generate an **inline-styled HTML newsletter** ready to be copied and pasted directly into any email client (Outlook, Gmail, Thunderbird, Apple Mail) for dissemination to researchers, faculty, and patrons.

---
<img width="835" height="512" alt="image" src="https://github.com/user-attachments/assets/2e6fc622-6076-480a-9ffb-69ae12c87362" />
<img width="827" height="512" alt="image" src="https://github.com/user-attachments/assets/3773be75-3262-47bb-a3d5-2afe420dc8d7" />
<img width="838" height="511" alt="image" src="https://github.com/user-attachments/assets/ff04a513-9073-4140-84ef-8f601fc204b9" />
<img width="811" height="511" alt="image" src="https://github.com/user-attachments/assets/797de532-3f86-4a28-83d8-b3777116d6cd" />

---

## Índice / Table of Contents

- [Versão em Português (PT)](#versão-em-português)
  - [Visão Geral](#visão-geral)
  - [Funcionalidades Principais](#funcionalidades-principais)
  - [Formato dos Dados de Entrada](#formato-dos-dados-de-entrada)
  - [Fontes de Dados & Enriquecimento](#fontes-de-dados--enriquecimento)
  - [Modelos de Boletim por Email](#modelos-de-boletim-por-email)
  - [Arquitetura & Estrutura de Ficheiros](#arquitetura--estrutura-de-ficheiros)
  - [Instalação e Execução](#instalação-e-execução)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
- [English Version (EN)](#english-version)
  - [Overview](#overview)
  - [Key Features](#key-features)
  - [Input Data Format](#input-data-format)
  - [Data Sources & Enrichment](#data-sources--enrichment)
  - [Email Newsletter Templates](#email-newsletter-templates)
  - [Architecture & Directory Structure](#architecture--directory-structure)
  - [Installation & Setup](#installation--setup)
  - [Environment Variables](#environment-variables)

---

# Versão em Português

## Funcionalidades Principais

- 📥 **Importação Flexível e Inteligente**:
  - Suporta ficheiros Excel (`.xlsx`, `.xls`), CSV, TSV e texto delimitado colado diretamente da área de transferência.
  - Reconhecimento e mapeamento automático de colunas para campos bibliográficos padrão (`biblionumber`, `title`, `author`, `isbn`, `publicationyear`, `itemcallnumber`).
  - Amostra pré-carregada para exploração imediata de estudos sobre Banda Desenhada & Cultura Visual.

- 🔍 **Enriquecimento Bibliográfico Multinível**:
  - **GoodReads**: Pesquisa por ISBN limpo com obtenção da capa original em alta definição dos servidores CDN (eliminando miniaturas redimensionadas `_SX50_`), sinopse autêntica e substancial, número de páginas, editora, classificação e contagem de avaliações.
  - **Google Books API**: Metadados adicionais, capas complementares e ligações de pré-visualização.
  - **Open Library**: Metadados abertos internacionais e identificadores de capa alternativos.
  - **Livrarias Portuguesas**: Ligações diretas de pesquisa por ISBN para Wook.pt, Bertrand Livreiros, FNAC Portugal e Porbase (Base Nacional de Dados Bibliográficos).
  - **Gemini com Google Search Grounding**: Capacidade de síntese editorial e tradução para Português de Portugal para obras estrangeiras.

- 📍 **Ligação Direta ao Koha OPAC ("Ver disponibilidade")**:
  - Integração nativa com o catálogo Koha (por exemplo, Universidade de Aveiro):
    `https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber=<biblionumber>`
  - Permite aos leitores verificar a disponibilidade em prateleira e efetuar reservas com um único clique.
  - URL base customizável nas configurações do boletim.

- 🛡️ **Sanitização Anti-Enchimento de Assuntos & Sinopses**:
  - Filtro rigoroso (`sanitizeCategories` / `cleanSubjects`) que expurga sistematicamente termos genéricos de classificação como *"Publicações Recentes"*, *"Bibliografia"*, *"Publicações Recentes / Bibliografia"*, *"Geral"*, etc., preservando apenas tópicos temáticos reais.
  - Deteção e descarte de textos burocráticos repetitivos (*"Obra no domínio de..."*, *"Título disponível na biblioteca..."*), assegurando que o sumário descreve o conteúdo informativo real da obra.

- ✉️ **Gerador de Boletim para Email (HTML Inline & Texto Simples)**:
  - Criação de código HTML 100% inline, testado e otimizado para o motor Word do **Outlook Classic**, Gmail, Apple Mail e Thunderbird.
  - **4 Estilos de Layout**:
    1. **Outlook (Linhas)** *(Recomendado para Outlook Classic)*: Tabelas puras com linhas divisórias horizontais nítidas e inquebráveis entre registos, caixas de COTA e ligação direta ao Koha OPAC.
    2. **Editorial Clássico**: Tipografia tradicional serifada de boletim académico com notas curatoriais.
    3. **Catálogo Cota**: Tabela densa de apresentação sequencial com destaque de cotas e localização.
    4. **Revista Moderna**: Cartões visuais individuais com destaque para capas em alta resolução.
  - **Opção "Copiar Só Registos"**: Permite copiar apenas a tabela dos livros formatada com linhas para colar no corpo de uma mensagem já iniciada no Outlook Classic.
  - **Versão em Texto Simples**: Para mailing lists ou destinatários com leitores de texto puro.
  - Copiar com 1 clique para a área de transferência ou transferir ficheiro `.html`.

- ✏️ **Edição e Gestão Manual**:
  - Vista em cartões visuais (Grelha) e vista em Tabela densa.
  - Edição individual de cada campo (capa via URL ou upload local de ficheiro, sinopse, cota, ano, editora, assuntos separados por vírgula).
  - Seleção/deseleção granular de títulos a incluir no boletim final.
  - Persistência automática em `localStorage` para não perder edições entre sessões.

---

## Formato dos Dados de Entrada

A aplicação aceita exportações de sistemas integrados de gestão de bibliotecas (SIGB / ILS) como Koha, Aleph ou DSpace. Exemplo de estrutura em TSV/CSV:

```tsv
biblionumber	title	author	isbn	publicationyear	itemcallnumber
328281	Suplemento juvenil	org. Francisco Ucha	978-65-01-17665-9	2024	CF-41-100
305653	Unstable masks	ed. by Sean Guynes and Martin Lund	978-0-8142-5563-6 | 0814214185	2020	CF-41-31
305614	Comics and stuff	Henry Jenkins	978-1-4798-0093-3	2020	CF-41-32
313518	Critical directions in comics studies	ed. Thomas Giddens	978-1-4968-2899-6	2020	CF-41-36
305728	John Jennings	ed. Donna-lyn Washington	978-1-4968-2939-9	2020	CF-41-46
305658	Rereading childhood books	Alison Waller	978-1-3501-7823-6	2020	CF-41-47
313822	Comics studies	ed. by Charles Hatfield, Bart Beaty	978-0-8135-9141-4	2020	CF-41-49
305831	Monstrous women in comics	ed. Samantha Langsdale and Elizabeth Rae Coody	978-1-4968-2763-0	2020	CF-41-53
305382	Children's and young adult comics	Gwen Athene Tarbox	978-1-3500-0919-6	2020	CF-41-55
```

---

## Fontes de Dados & Enriquecimento

| Fonte | Dados Obtidos | Notas |
|---|---|---|
| **GoodReads** | Capa HD, Sinopse oficial, Editora, Páginas, Avaliação (★), Contagem de avaliações | Extração via ISBN limpo, consulta direta de página de obra |
| **Google Books API** | Capa, Metadados editoriais, Categorias, Links | Consulta por ISBN e Título/Autor |
| **Open Library** | Capa e dados bibliográficos mundiais | Identificadores de obra e edição |
| **Koha OPAC** | Ligação de disponibilidade em tempo real | URL construída a partir do `biblionumber` |
| **Wook / Bertrand / FNAC** | Links de consulta direta em livrarias portuguesas | Pesquisa direta baseada no ISBN limpo |
| **Gemini AI Grounding** | Síntese contextualizada e tradução para Português | Usado para introduções curatoriais e traduções |

---

## Modelos de Boletim por Email

1. **Catálogo Compacto**: Ideal para newsletters de bibliotecas académicas onde a **Cota** e o **Registo** têm de estar imediatamente visíveis para requisição rápida.
2. **Grelha Editorial Moderna**: Foco visual no impacto gráfico das capas, sinopse estruturada em caixa destacada e botões de ação para disponibilidade e livrarias.
3. **Boletim Clássico Institucional**: Visual tradicional de boletim bibliográfico universitário, com tipografia legível e notas curatoriais da biblioteca.
4. **Texto Simples**: Formatação em blocos de texto monoespaçados com separadores, adequada a mailing lists puras.

---

## Arquitetura & Estrutura de Ficheiros

```
├── server.ts                       # Servidor Express (proxy de enriquecimento, GoodReads scraper, rotas de IA)
├── index.html                      # Ponto de entrada HTML com fontes editoriais
├── metadata.json                   # Metadados e permissões da aplicação
├── package.json                    # Dependências e scripts
├── tsconfig.json                   # Configuração de TypeScript
├── vite.config.ts                  # Configuração do Vite e Tailwind CSS
└── src/
    ├── main.tsx                    # Bootstrap do React 19
    ├── App.tsx                     # Componente principal, gestão de estado e sincronização
    ├── index.css                   # Tailwind v4 import e estilos globais
    ├── types/
    │   └── bibliographic.ts        # Interfaces TypeScript (EnrichedBook, BulletinSettings, etc.)
    ├── data/
    │   └── sampleBooks.ts          # Dados de exemplo pré-carregados com ISBNs reais e capas GoodReads
    ├── services/
    │   ├── isbnCleaner.ts          # Normalização de ISBN, URL do Koha OPAC, sanitização de categorias e capas
    │   ├── fileParser.ts           # Motor de importação XLSX/CSV com auto-mapeamento de cabeçalhos
    │   ├── enrichmentService.ts    # Orquestrador de enriquecimento (GoodReads, Google Books, OpenLib)
    │   └── emailHtmlGenerator.ts   # Gerador de HTML inline e texto simples para emails
    └── components/
        ├── Header.tsx              # Barra de cabeçalho com ações principais e métricas
        ├── EnrichmentBar.tsx       # Barra de progresso e botões de enriquecimento em lote
        ├── FilterBar.tsx           # Pesquisa, ordenação, filtro de seleção e alternância Grelha/Tabela
        ├── BookCard.tsx            # Cartão de livro individual (modo catálogo)
        ├── BookTableView.tsx       # Tabela densa de livros com seleção em lote
        ├── ImportModal.tsx         # Modal de importação (Upload de ficheiro ou Colar texto)
        ├── EmailBuilderModal.tsx   # Modal de pré-visualização, personalização e cópia do boletim
        ├── BookEditModal.tsx       # Modal de edição manual detalhada de cada livro
        ├── ManualAddModal.tsx      # Modal para registo manual de novas obras
        └── HelpModal.tsx           # Documentação e guia de utilização integrado na interface
```

---

## Instalação e Execução

### Pré-requisitos
- **Node.js** >= 18.x
- **npm** >= 9.x

### Passos

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/seu-utilizador/libcas.git
   cd libcas
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar as variáveis de ambiente:**
   Copie o ficheiro de exemplo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   Edite o ficheiro `.env` e introduza a sua chave da API Gemini (opcional, para sínteses editoriais automáticas):
   ```env
   GEMINI_API_KEY="a-sua-chave-api-gemini"
   ```

4. **Iniciar em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação ficará disponível em `http://localhost:3000`.

5. **Compilar para produção:**
   ```bash
   npm run build
   ```

6. **Verificar tipos TypeScript:**
   ```bash
   npm run lint
   ```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GEMINI_API_KEY` | Não | Chave da Google Gemini API para geração de cartas editoriais e sínteses em português. Se omitida, a aplicação utiliza os dados autênticos do GoodReads, Google Books e Open Library. |
| `APP_URL` | Não | URL público do serviço de alojamento (injetado automaticamente pelo ambiente na cloud). |

---
---

# English Version

## Key Features

- 📥 **Intelligent & Multi-format Import**:
  - Supports Excel spreadsheets (`.xlsx`, `.xls`), CSV, TSV, and direct clipboard text paste.
  - Automatic column header detection and mapping (`biblionumber`, `title`, `author`, `isbn`, `publicationyear`, `itemcallnumber`).
  - Pre-loaded sample collection focusing on Comic Studies & Visual Culture.

- 🔍 **Multi-Source Bibliographic Enrichment**:
  - **GoodReads**: Automatic search by sanitized ISBN; pulls original high-resolution covers from Amazon/GoodReads CDN (stripping downscale tokens like `_SX50_`), rich authentic descriptions, publisher, page counts, average rating (★), and review counts.
  - **Google Books API**: Complementary metadata, alternative covers, and preview links.
  - **Open Library**: Open bibliographic data and edition records.
  - **Portuguese Bookstores**: Direct lookup links for Wook.pt, Bertrand Livreiros, FNAC Portugal, and Porbase (Portuguese National Bibliography).
  - **Gemini AI Grounding**: Contextual editorial synthesis and European Portuguese translation for foreign academic monographs.

- 📍 **Direct Koha OPAC Availability Link ("Ver disponibilidade")**:
  - Built-in integration with Koha OPAC (e.g., University of Aveiro):
    `https://opac.ua.pt/cgi-bin/koha/opac-detail.pl?biblionumber=<biblionumber>`
  - Empowers patrons to inspect real-time shelf status, location, and place hold requests in a single click.
  - Customizable base OPAC URL in bulletin settings.

- 🛡️ **Anti-Boilerplate Category & Summary Sanitizer**:
  - Deep sanitization (`sanitizeCategories` & `cleanSubjects`) that purges generic catalog filler categories such as *"Publicações Recentes"*, *"Bibliografia"*, *"Publicações Recentes / Bibliografia"*, *"General"*, etc., keeping only authentic subject headings.
  - Anti-fluff filter preventing generic bureaucracy (*"Work in the field of..."*, *"Book cataloged in the library..."*), ensuring that summaries describe the actual content of the book.

- ✉️ **Email Bulletin Builder (Inline HTML & Plain Text)**:
  - Generates 100% email-client-safe inline HTML optimized for Microsoft Word rendering engine in **Outlook Classic**, Apple Mail, Gmail, Thunderbird, and Webmail.
  - **4 Distinct Styles**:
    1. **Outlook Clean Lines** *(Recommended for Outlook Classic)*: Pure table structure with crisp, unbreakable horizontal dividing lines between records, call number boxes, and direct Koha OPAC links.
    2. **Classic Institutional Bulletin**: Traditional serif typography with curatorial notes.
    3. **Compact Catalog**: High-density sequential table highlighting call numbers (Cota) and shelf availability.
    4. **Modern Grid**: Visual magazine-style cards highlighting cover artwork and structured metadata.
  - **"Copy Records Only" Option**: Copies just the formatted book table with dividing lines for pasting directly into an active Outlook Classic message draft.
  - **Plain Text Alternative**: For mailing list servers or plain-text recipients.
  - 1-click clipboard copy or `.html` file download.

- ✏️ **Record Editing & Local Storage**:
  - Dual viewing modes: Visual Grid Cards and High-Density Table.
  - Full manual edit modal (custom cover URL or local file upload, synopsis, call number, registration number, publication year, comma-separated subjects).
  - Checkbox selection to include/exclude books from the bulletin.
  - LocalStorage persistence across browser sessions.

---

## Input Data Format

LibCAS accepts raw exports from library automation systems (Koha, Aleph, Alma, DSpace, etc.). Supported delimiter auto-detection: Tab (TSV), Semicolon (`;`), and Comma (`,`).

Example:
```tsv
biblionumber	title	author	isbn	publicationyear	itemcallnumber
328281	Suplemento juvenil	org. Francisco Ucha	978-65-01-17665-9	2024	CF-41-100
305653	Unstable masks	ed. by Sean Guynes and Martin Lund	978-0-8142-5563-6 | 0814214185	2020	CF-41-31
305614	Comics and stuff	Henry Jenkins	978-1-4798-0093-3	2020	CF-41-32
313518	Critical directions in comics studies	ed. Thomas Giddens	978-1-4968-2899-6	2020	CF-41-36
305728	John Jennings	ed. Donna-lyn Washington	978-1-4968-2939-9	2020	CF-41-46
305658	Rereading childhood books	Alison Waller	978-1-3501-7823-6	2020	CF-41-47
313822	Comics studies	ed. by Charles Hatfield, Bart Beaty	978-0-8135-9141-4	2020	CF-41-49
305831	Monstrous women in comics	ed. Samantha Langsdale and Elizabeth Rae Coody	978-1-4968-2763-0	2020	CF-41-53
305382	Children's and young adult comics	Gwen Athene Tarbox	978-1-3500-0919-6	2020	CF-41-55
```

---

## Data Sources & Enrichment

| Source | Data Retrieved | Details |
|---|---|---|
| **GoodReads** | HD Cover, Official synopsis, Publisher, Pages, Rating (★), Ratings count | Queried via clean ISBN; fetches dedicated show page if needed |
| **Google Books API** | Covers, Editorial details, Industry identifiers | Queried by ISBN and Title/Author fallback |
| **Open Library** | International catalog records and cover IDs | JSON API and cover image endpoints |
| **Koha OPAC** | Direct real-time shelf status link | Constructed using `biblionumber` |
| **Wook / Bertrand / FNAC** | 1-click links to Portuguese commercial bookstores | Direct search links by primary ISBN |
| **Gemini AI Grounding** | Academic synthesis and Portuguese translation | Used for editorial introduction letter and translations |

---

## Email Newsletter Templates

1. **Outlook Clean Lines** *(Recommended for Outlook Classic)*: Pure table structure with crisp, unbreakable horizontal dividing lines between records, call number boxes, and direct Koha OPAC links.
2. **Classic Institutional Bulletin**: Traditional serif typography with curatorial notes.
3. **Compact Catalog**: High-density sequential table highlighting call numbers (Cota) and shelf availability.
4. **Modern Grid**: Visual magazine-style cards highlighting cover artwork and structured metadata.
5. **Plain Text**: Clean, structured text output suitable for mailing list servers and text-only email clients.

---

## Architecture & Directory Structure

```
├── server.ts                       # Express backend (GoodReads scraper, web search proxy, AI endpoints)
├── index.html                      # HTML entry point with web font imports
├── metadata.json                   # Applet metadata and permissions
├── package.json                    # Project dependencies and npm scripts
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite build configuration with Tailwind CSS plugin
└── src/
    ├── main.tsx                    # React 19 entry point
    ├── App.tsx                     # Main application controller, state management, storage sync
    ├── index.css                   # Global styles and Tailwind v4 imports
    ├── types/
    │   └── bibliographic.ts        # TypeScript data contracts (EnrichedBook, BulletinSettings, etc.)
    ├── data/
    │   └── sampleBooks.ts          # Curated sample books with real ISBNs, covers, and synopses
    ├── services/
    │   ├── isbnCleaner.ts          # ISBN cleaning, Koha OPAC URL resolver, category and cover sanitizers
    │   ├── fileParser.ts           # XLSX/CSV file parser with automatic column mapping
    │   ├── enrichmentService.ts    # Enrichment orchestrator (GoodReads, Google Books, Open Library)
    │   └── emailHtmlGenerator.ts   # Inline-styled HTML and plain text email generator
    └── components/
        ├── Header.tsx              # Application header with actions and stats
        ├── EnrichmentBar.tsx       # Progress indicator and batch enrichment buttons
        ├── FilterBar.tsx           # Search, sorting, selection filters, and Grid/Table toggle
        ├── BookCard.tsx            # Rich book card component for grid view
        ├── BookTableView.tsx       # Dense data table component for quick review
        ├── ImportModal.tsx         # File upload and clipboard paste dialog
        ├── EmailBuilderModal.tsx   # Interactive email customization, preview, and copy modal
        ├── BookEditModal.tsx       # Detailed book record editor
        ├── ManualAddModal.tsx      # Manual book addition modal
        └── HelpModal.tsx           # In-app documentation and user guide
```

---

## Installation & Setup

### Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/libcas.git
   cd libcas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Optionally add your Google Gemini API key:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Run TypeScript check:**
   ```bash
   npm run lint
   ```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for automated editorial introductory letters and translation. When absent, the application relies on GoodReads, Google Books, and Open Library data. |
| `APP_URL` | Optional | Public application URL used for self-referential links. |

---

## Licença / License

Distribuído sob licença aberta para bibliotecas, universidades e instituições de ensino e investigação.
Distributed under an open license for libraries, universities, and educational institutions.
