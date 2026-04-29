# WEBSITE / DOCS CONTENT NOTES (Writr)

This file is a **single source of truth** for building:

- a marketing website for Writr (landing page + feature pages), and
- a documentation site (user docs + developer docs).

It is intentionally detailed so you can copy/paste sections into a website, a README, or a docs generator.

---

## What is Writr?

**Writr** is a **local-first desktop Markdown notes app** built with **Electron + React + TypeScript**.

- Notes are stored as real files on your machine (not a proprietary database).
- The default notes “vault” lives at `~/Writr` (macOS home directory).
- The UI is Obsidian-inspired: fast editor, split preview, command palette, dense file explorer.

**Current distribution:** README states macOS-only for now (but the repo includes build scripts for Windows/Linux).

---

## Core product messaging (for website)

### One-liner
Local-first Markdown notes with Obsidian-like editing, plus Canvas, Kanban, and an embedded Terminal.

### Elevator pitch (short paragraph)
Writr is a lightweight desktop Markdown app that keeps your notes as plain files under `~/Writr`. Write in a fast editor, use Obsidian-style “Live Preview” (Markdown renders inline when you move away), preview or export to PDF, and organize work with Canvas and Kanban—without leaving your notes workspace.

### Key value props (bullets)
- **Local-first:** Your notes are files in `~/Writr`.
- **Fast writing flow:** CodeMirror-based editor with Live Preview, toolbar, and keyboard shortcuts.
- **Organize beyond docs:** Canvas for spatial thinking, Kanban for tasks, Terminal for quick commands.
- **Practical exports:** Export notes and canvases to PDF.
- **Customizable:** Theme (light/dark/system), font, font size, Vim mode, line wrapping, relative line numbers.

---

## Feature inventory (core)

### Notes + Markdown editor
- **Markdown editor** built on CodeMirror (good performance even for long notes).
- **Autosave** (throttled) and explicit “save on blur” behavior.
- **Editor toolbar** for common Markdown actions (bold/italic/quote/lists/checkbox/code/link/hr/strike).
- **Keyboard-first editing** (see shortcuts section below).
- **Vim mode** option (toggle in Settings).
- **Line wrapping** option.
- **Relative line numbers** option.
- **Tab indent unit** setting (spaces per tab).
- **Configurable editor font + size**.

### Live Preview (Obsidian-like inline rendering)
Behavior:
- While your cursor/selection is on a line, that line stays **raw Markdown**.
- When you move away, the line becomes **inline-rendered** by hiding/replacing Markdown syntax marks (efficient, viewport-based).

What renders inline (high level):
- headings: hides the `#` marks
- emphasis: hides `*` / `_` marks
- strikethrough: hides `~~` marks
- inline code: hides backticks
- blockquotes: hides `>`
- lists: replaces list markers with bullets / numbers
- links: hides link punctuation + URL and styles the label like a link
- horizontal rules: renders as a divider
- fenced code blocks: hides the opening/closing fence lines when not active
- task lists: renders as interactive checkboxes when not active
- images: renders embedded images inline and hides the markdown syntax when not active

### Full preview + split preview
- **Preview mode** renders Markdown using `react-markdown` with GFM support.
- **Split view**: editor and preview side-by-side.
- **Full preview**: preview-only mode.
- **Scroll sync** between editor and preview (keeps position aligned).

### Markdown preview capabilities (rendered preview)
The preview supports (at minimum):
- GitHub Flavored Markdown via `remark-gfm` (tables, task lists, strikethrough, etc.).
- Syntax-highlighted code blocks via `react-syntax-highlighter`.
- Mermaid diagrams (code fences labeled `mermaid`).
- Callouts using Obsidian-like syntax in blockquotes:
  - Example: `> [!NOTE] Title` (supports multiple callout types like NOTE/TIP/IMPORTANT/WARNING/CAUTION).
- Inline `<kbd>...</kbd>` handling (converted and rendered in preview as a keycap-like element).

### Images (drag & drop + local linking)
Writr supports local images in a “vault-friendly” way:
- Drag & drop an image into the editor:
  - the image is copied into `~/Writr/image/`
  - the editor inserts a wikilink-style embed like `![[image/<file>]]`
- You can also reference images via standard Markdown: `![](image/<file>)`

### File explorer (left sidebar)
- Folder/file tree of the notes root directory.
- Create file/folder, rename, delete.
- Drag & drop to move items.
- Expand/collapse folders, expand/collapse all.
- Dense “Obsidian-like” layout.
- Per-file metadata chips:
  - last edited time (relative)
  - **status** (selectable in note header)
  - **tag** (editable in note header)
  - **task progress** (counts `- [ ]` / `- [x]` in Markdown files and shows progress)
- File tree UI state persists (expanded folders + scroll position).

### Sidebar search
- Search across files by filename/path/status/tag.
- Clicking a result opens the file in a tab.

### Tabs / workspace
- Tabbed editor layout (notes + additional panels).
- Panels accessible via command palette (e.g. Kanban, Terminal, Canvas).

### Canvas
Canvas is stored as a `.canvas` file (JSON) inside the notes root.
- Drag/position nodes (React Flow-based).
- Node types include: process square, decision diamond, sticky note, circle, and text.
- Edges/connectors with arrowheads.
- Export canvas to PDF.
- Empty canvas placeholder: “Drag and drop items to start”.

### Kanban
Kanban is for task management inside the app:
- Multiple workspaces.
- Columns with configurable titles and colors.
- Cards with:
  - title text
  - description/details panel
  - priority (low/medium/high)
  - completion state
  - reminders (date/time)
- Drag & drop cards and columns.
- Stored in app storage (local browser storage via Jotai’s `atomWithStorage`).

### Terminal
Embedded terminal tab powered by `xterm.js` with a backend PTY session.
- Runs your system shell (session is created by the app).
- Remembers a session id per tab (reconnects when possible).
- Fit-to-container, resize handling, theming, font settings tied to the editor settings.
- Web links addon enabled (clickable URLs).

### PDF export
- Export a Markdown note to PDF.
- Export a Canvas to PDF.

### Optional AI writing (OpenRouter)
Writr includes an optional AI flow (bring your own key):
- Lists “free models” and can generate text into the note.
- Uses OpenRouter’s API from the main process.
- API key is stored locally (in renderer local storage).
Notes for the website/docs:
- Be clear this is **optional** and requires user-provided API key.
- Be clear the text you send to the model is the prompt (and potentially other context if the UI is expanded later).

---

## Data & storage model (important for docs + trust)

### Notes root directory (“vault”)
Default root directory:
- `~/Writr`

Inside this folder you’ll typically find:
- `*.md` notes (Markdown)
- `*.canvas` canvas files (JSON)
- `image/` folder (images imported via editor drag/drop)

### Persistence details (what lives where)
Local files (on disk):
- Notes (`.md`)
- Canvas files (`.canvas`)
- Images (`~/Writr/image/...` and/or in-note folders depending on import path)

Local app storage (browser storage / persisted atoms):
- UI settings (theme, fonts, toggles)
- Kanban state
- Note status/tag metadata (keyed by file path)
- File tree UI state (expanded folders + scroll position)
- Cached TODO stats (for progress bars in the file tree)

### Safety constraints
File operations are restricted to the notes root directory to prevent accidental edits outside the vault (path safety checks in the main process).

---

## Keyboard shortcuts (good for a website “cheat sheet” + docs)

Editor shortcuts (when focus is in the editor):
- `Cmd/Ctrl+B`: bold
- `Cmd/Ctrl+I`: italic
- `Cmd/Ctrl+K`: link
- `Cmd/Ctrl+\``: inline code
- `Cmd/Ctrl+Shift+\``: fenced code block
- `Cmd/Ctrl+Q`: blockquote
- `Cmd/Ctrl+L`: bullet list
- `Cmd/Ctrl+Shift+L`: numbered list
- `Cmd/Ctrl+T`: task checkbox
- `Cmd/Ctrl+H`: horizontal rule
- `Cmd/Ctrl+D`: strikethrough

Command palette:
- `Cmd/Ctrl+P`: open command palette (panels, commands)

(If you build a docs site, keep a dedicated “Shortcuts” page and update it as commands evolve.)

---

## Suggested website structure (sitemap + content blocks)

### Landing page
Sections you can create:
1. Hero: tagline + download button + 1 screenshot/GIF
2. “Local-first” section: `~/Writr` file-based storage
3. Live Preview section: 10s GIF showing cursor moving line-to-line
4. Feature grid:
   - Markdown editor
   - Split preview + scroll sync
   - Canvas
   - Kanban
   - Terminal
   - PDF export
5. Privacy/security: local-first, no forced cloud, AI optional
6. FAQ
7. Footer: license, repo link, contact

### Download page
- macOS download (current)
- “Build from source” instructions (for other platforms)
- System requirements (macOS version, Apple Silicon/Intel if applicable)

### Features pages (optional but great for SEO)
- `/features/live-preview`
- `/features/canvas`
- `/features/kanban`
- `/features/terminal`
- `/features/pdf-export`
- `/features/local-first`

---

## Suggested docs site structure

### Getting started
- Install (macOS)
- Notes location (`~/Writr`)
- Creating notes and folders
- Tabs and navigation

### Editor
- Markdown basics
- Live Preview behavior (active line vs rendered lines)
- Split preview + scroll sync
- Images: drag/drop and `![[image/...]]`
- Mermaid diagrams
- Callouts (`> [!NOTE] ...`)
- Tables and task lists (GFM)
- PDF export

### Organization
- Status & tags (how they work, how they appear in the file tree)
- Search
- TODO progress indicators

### Canvas
- What a `.canvas` file is
- Adding nodes, connecting edges
- Export to PDF

### Kanban
- Workspaces, columns, cards
- Priorities + reminders
- Persistence behavior (stored locally)

### Terminal
- What it is (embedded shell)
- Safety notes (it’s a real shell, runs locally)
- Font/theme behavior

### Settings
- Theme mode
- Toolbar toggle
- Vim mode
- Relative line numbers
- Line wrapping
- Tab indent unit
- Fonts and sizes

### Troubleshooting / FAQ
- “Where are my notes stored?”
- “How do I back up or sync?”
- “Why can’t I save outside the root folder?”
- “How do images work?”
- “AI models/key troubleshooting”

### Developer docs (if you publish for contributors)
- Architecture:
  - Electron main process: filesystem + export + AI + terminal sessions
  - Renderer: React UI + CodeMirror + XyFlow + Xterm
  - Shared types (`src/shared`)
- Run locally:
  - `npm install`
  - `npm run dev`
- Build:
  - `npm run build`
  - `npm run build:mac` / `npm run build:win` / `npm run build:linux`

---

## Screenshot / demo checklist (for website + docs)

Capture these to make the website/docs easy to understand:
- Editor with Live Preview: cursor on a line vs moved away
- Split view: editor + preview with scroll sync
- Drag & drop an image: note inserts `![[image/...]]`, image renders inline off-line
- Mermaid diagram preview
- Callout blockquote rendering
- File tree showing status/tag chips + task progress
- Sidebar search results
- Kanban board with a details panel + reminder UI
- Terminal tab running a command
- Canvas with a few nodes + connectors, and empty-canvas placeholder

---

## “Important details” quick reference

- Notes root directory: `~/Writr`
- Images directory: `~/Writr/image/`
- Note file types: `.md` and `.canvas`
- Storage:
  - notes/canvas/images: on disk
  - settings/kanban/status/tag/ui state: local app storage
- Markdown preview engine: `react-markdown` + `remark-gfm`
- Editor engine: CodeMirror
- Canvas engine: React Flow (`@xyflow/react`)
- Terminal engine: `xterm.js` + PTY backend
- Optional AI: OpenRouter (user API key)

