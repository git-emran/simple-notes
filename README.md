# Writer
> Built with love by a passionate Vim enthusiast, Emran Hossain.

#### Download macOS application:

[Writer macOS](https://drive.google.com/drive/u/0/folders/1Lkf1h3NBbwpEArD4GSvAekZV1X1toZO1)

**Writer** is an engineered-to-order, distraction-free Markdown text editor designed for Cross platform use (Currently only macOS and Linux have not tested on windows). Architected for developers, students, and power users, it fuses the efficiency of Vim motions with modern development tools. Whether you are documenting complex system architectures, practicing DSA implementations, or capturing rapid brain dumps, Writer brings IDE-grade utility directly to your writing workflow.

<img width="1364" height="1169" alt="writer_new" src="https://github.com/user-attachments/assets/51a20b38-9e14-49ca-be9b-af28410571b3" />

# Key Features and Latest Updates

## 🚀 What's New in Version 2.02

A major iteration focused on empowering product development workflows and enhancing productivity interfaces.

### **Interactive Canvas**

- **Visual Logic Flows:** Model architectural patterns, flowcharts, and system designs directly in an interactive sandbox.
- **Vector Export:** Easily export your canvas layouts to high-fidelity PDF format for documentation or distribution.

  ![canvas](https://github.com/user-attachments/assets/0fa0e1c1-89e4-4da1-8f6e-9150e95c5f55)


### **Agile Kanban Boards**

- **Task Management:** Maintain project velocity with an integrated Kanban board to organize backlog tasks, in-progress items, and milestones.

<img width="1256" height="997" alt="kanban" src="https://github.com/user-attachments/assets/1cda9e05-141e-4eff-8240-ee6508605c7c" />


### **Automated Daily Notes**

- **Zero Setup Journaling:** Instantly bootstrap a new markdown file named with the current date to log daily standups, progress, or sudden ideas.

### **Streamlined Header Design**

- **Modern Workspace Navigation:** A simplified and clean layout for the application header, reducing visual clutter to maximize focus.

<img width="897" height="127" alt="header" src="https://github.com/user-attachments/assets/cb3a9a89-8f67-45c7-bb9a-81334a21b829" />


### **Structured Note Metadata and Status**

- **Lifecycle Management:** Tracks the state of your notes. You can categorize files into statuses like Active, On-Hold, Completed, and Dropped.

<img width="320" height="156" alt="note_tags" src="https://github.com/user-attachments/assets/c40cee42-8066-4058-83ab-55bffab58146" />


### **Extensible Custom Tags**

- **Flexible Organization:** Go beyond standard statuses. Create and apply specialized custom tags tailored to your unique documentation hierarchy.
![addtags](https://github.com/user-attachments/assets/2086b85f-95c6-44a6-bb23-13e63230b7cd)


### **Dynamic File Tree Progress Indicators**

- **Visual Checklists:** Adding checkboxes to a file automatically generates a real-time progress bar underneath the filename in the file tree.
<img width="235" height="93" alt="progressbar" src="https://github.com/user-attachments/assets/37a23770-0bbc-44fd-a164-35bcd0647f76" />


### **Floating Action Toolbar (FAB)**

- **Instant View Toggle:** Quickly switch between Markdown input, side-by-side split view, and rendered preview modes using a responsive floating button.

### **GitHub-Flavored Custom Alerts**

- **High-Visibility Callouts:** Embed stylized callouts natively using standard alert syntax to highlight crucial constraints or quick tips:

```
> [!NOTE]
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.
```

### **System Preference Controls**

- **Polished Settings Panel:** Fine-tune theme aesthetics (light and dark modes) alongside editor-specific configuration controls, including support for the newly integrated premium monospaced font **Martian Mono**.

### **Core Performance and Reliability Updates**

- **State Persistence and Efficiency:** Optimized workspace state by adding file-tree memoization. This vastly reduces UI rendering overhead when handling massive workspaces or triggering recursive state operations.
- **Dynamic File Tree Icon Scaling:** Implemented recursive folder icon size scaling. Folders nested within subdirectories now automatically scale down by 35% to maintain a highly proportional, neat visual hierarchy across deep directory branches, combined with optimized statusbar layout scaling.

# Advanced Development Utilities

### **Premium Table Editing Experience**

Upgraded CodeMirror-based Markdown table editing utility matching the flow of premium editors like Obsidian. It features:
- **Dynamic Table Formatting:** Automatically aligns cells and column widths on the fly to eliminate manual formatting.
- **Advanced Navigation Keymaps:** Smooth navigation using `Tab` to move to the next cell, `Shift-Tab` to move backward, and `Enter` to create a new row while maintaining the column structure.
- **Obsidian-Style Live Preview:** Intelligently skips separator lines and hides pipes/syntax when the cursor leaves the table block, presenting a clean, rendered grid in live editing mode.
- **Explicit Formatting Commands:** Manual layout formatting triggerable via `Mod-Shift-F`.

### **AI-Assisted Writing Sandbox**

Unlock context-aware content generation. The integrated assistant helps draft content quickly. Future updates will leverage local and remote model context to refine, summarize, and adapt existing text directly from your cursor position.

![write_with_ai_writer](https://github.com/user-attachments/assets/8973d139-258e-4b05-a81e-07903bf99f31)

### **Declarative Diagrams via Mermaid.js**

Render complex diagrams, flowcharts, and sequence structures directly in your notes using clean, readable Markdown syntax.

![mermaidjs](https://github.com/user-attachments/assets/bc8f467a-52fd-433e-ade6-31614fe8c235)

### **IDE-Grade Code Completion**

Designed to act as a lightweight dev utility, Writer provides rich code completion and syntactic checking natively inside Markdown code blocks.

<img width="887" height="660" alt="lsp" src="https://github.com/user-attachments/assets/8d151180-8be6-44fb-9c91-04c879025f54" />

## ⚡ Version 2.0 Milestones

- **Redesigned Design System:** Complete user interface overhaul optimized for ocular comfort, featuring curated light and dark themes.
- **Agnostic AI Mode:** Bring your own API keys. Connect to OpenRouter or other major provider endpoints to power your generative writing tasks at cost.
- **Indexed File Search:** Instantly locate key files, notes, and fragments across your workspace.

# Why Writer?

Most note-taking systems are bloated with cloud synchronizations or rigid database structures. Writer is custom-built for developers who prefer the speed of local files, the precision of Vim keys, and the utility of LSP assistance. 

It is a lightweight desktop client that complements the modern terminal workflow, turning rapid, disposable brain dumps into highly-organized markdown documentation without the overhead of heavy IDEs.

---

writer is a simple **note-taking app** that uses **Markdown** syntax to format your notes.

You can create your first note by clicking on the top-left icon on the sidebar, or delete one by clicking on top right icon.

Following there's a quick overview of the currently supported Markdown syntax.


# How to Write Markdown:

## Text formatting

This is a **bold** text.
This is an _italic_ text.

## Headings

Here are all the heading formats currently supported by **_Writer_**:

# Heading 1

## Heading 2

### Heading 3

Write warnings
:> [!WARNING]

#### Heading 4

##### Heading 5

### Bulleted list

For example, you can add a list of bullet points:

- Bullet point 1
- Bullet point 2
- Bullet point 3

### Numbered list

Here we have a numbered list:

1. Numbered list item 1
2. Numbered list item 2
3. Numbered list item 3

### Blockquote

> This is a blockquote. You can use it to emphasize some text or to cite someone.

### Code blocks

Inline code is written as double `

Code block snippets using the following syntax \_\`\`\`js or py\`\`\`

### Links

Links are written as `[name](u.r.l)`

---

## 🛠️ Development & Build Instructions

I have configured a cross-platform, single-command bootstrap and packaging pipeline. The pipeline operates flawlessly across **Windows, macOS, and Linux**.

### 1. Bootstrapping Dependencies
Restore all strict dependencies from the package lockfile:
```bash
cd writer
npm run bootstrap
```

### 2. Live Development Server
Start the interactive developer hot-reloading environment:
```bash
cd writer
npm run dev
```

### 3. Unified Cross-Platform Build & Package
Run the full clean, typecheck, compile, and packaging pipeline:
```bash
cd writer
npm run build && npm run package
```

### 4. Modular Pipeline Commands
You can also run specific segments of the pipeline:
- **Clean output folders**: `npm run clean`
- **Compile Frontend React**: `npm run build:frontend`
- **Compile Electron Core**: `npm run build:electron`
- **Build targeted packages**:
  - macOS: `npm run package:mac`
  - Windows: `npm run package:win`
  - Linux: `npm run package:linux`

### 🐧 Linux Package Prerequisite Validation
If packaging to Linux distribution formats (like `.deb`, `.rpm`, `.pacman`, `.snap`), run my host prerequisite validator to verify packages like `fakeroot` or `rpmbuild` are present:
```bash
cd writer
./scripts/check-prerequisites.sh
```

