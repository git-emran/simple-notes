# Writer

> Built with love by A passionate Vim enthusiast, Emran Hossain.

#### Download macOS application:

[Writer macOS](https://drive.google.com/drive/u/0/folders/1Lkf1h3NBbwpEArD4GSvAekZV1X1toZO1)

Welcome to **Writer**. This is a _markdown_ Text editor, a Desktop app for macOS. With the power of the built in LSP (language server protocol), Syntax highlighting and completions you can build your coding documentation, as a student or a learner practice your DSA, or document your workflow in general using the markdown syntax and Vim motions.

<img width="1364" height="1169" alt="writer_new" src="https://github.com/user-attachments/assets/51a20b38-9e14-49ca-be9b-af28410571b3" />

# New Release: Whats new in 2.02

Another Big update for the Writer. Fresh new features and big leap toward improving product development workflow.

### **Canvas:**

- Create flowchart and diagrams in an interactive environment.
- Also you can export the canvas as a pdf.

  ![canvas](https://github.com/user-attachments/assets/0fa0e1c1-89e4-4da1-8f6e-9150e95c5f55)


### **Kanban Board**:

- New Kanban board to manage your backlog of tasks more efficiently.

<img width="1252" height="892" alt="kanban" src="https://github.com/user-attachments/assets/dfc7237c-a2d6-4db5-ad03-dba470830aa1" />

### **Daily Note:**

- Creates a daily note with the current Date as a filename.

### **Header redesign:**

- Redesigned top header of the app

<img width="897" height="127" alt="header" src="https://github.com/user-attachments/assets/cb3a9a89-8f67-45c7-bb9a-81334a21b829" />


### **Note status:**

- With Note status, it is easy to keep track of the progress of your notes. For example, Status - Active to mark the active progress of the note along side with hold, completed and dropped.

<img width="320" height="156" alt="note_tags" src="https://github.com/user-attachments/assets/c40cee42-8066-4058-83ab-55bffab58146" />


### **Add Custom Tags:**

- Along with the default note tags: Active, On-Hold, Dropped, Completed. Add custom tags to keep track of your specialized note.
![addtags](https://github.com/user-attachments/assets/2086b85f-95c6-44a6-bb23-13e63230b7cd)


### **Progress Bar**:

- Whenever you create a checkbox list, a Progress Bar appears underneath your filename in the file tree.
<img width="235" height="93" alt="progressbar" src="https://github.com/user-attachments/assets/37a23770-0bbc-44fd-a164-35bcd0647f76" />


### **Split view and Preview mode as a FAB**:

- Split view and Preview mode are now presented as a floating action button for a better user experience.

### **Custom Alerts**:

- Custom alerts now available, you can write them like this.

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

### **Settings menu**:

- Typical settings menu to control the Appearance and Interface controls

### **Security Updates**

- Improved filetree read for every collapse all and expand all, Added memoization and filetree state persistance, Progress bar UX improvements.

# Use Features like

### Write with AI

Although right now the AI will only write new content, soon it will have context of your written note to add or substract based on the direction.

![write_with_ai_writer](https://github.com/user-attachments/assets/8973d139-258e-4b05-a81e-07903bf99f31)

### "Flowchart creation" using Mermaidjs

![mermaidjs](https://github.com/user-attachments/assets/bc8f467a-52fd-433e-ade6-31614fe8c235)

### Code Completions

<img width="887" height="660" alt="lsp" src="https://github.com/user-attachments/assets/8d151180-8be6-44fb-9c91-04c879025f54" />

##### New Release:

## Version 2.0:

- 🔥 **Redesigned UI**. Redesigned color scheme and UI components that looks good and soothing for the eye for both light and dark mode.
- 🔥 **Write with AI mode**. Writing with AI is here. With the power of the Open-router models and all the other available open-source LLM's, writing with AI remains free as long as you have the API key from the respective model, Which wouldn't cost any money because they are free to use.
- 🔥 **File Search**. Better late than never, file search is now available on Writer.

# What is Writer

Writer is a Desktop markdown application made for Vim enthusiasts. I use Vim constantly so I made an app that supports vim so that I can write in peace. Currently available only on macOS. It has the basic markdown feature.

**How does it fit into my workflow?** Most of my notes are not high level documentation, they are brain dumps, disposable thoughts, or just to remember something, I write it. Most note taking apps does not fit into what I do as a developer. So I made a very minimal markdown writer that is very suitable for disposable work. It has LSP so writing code or practicing leetcode is easier and fast.

---

Writr is a simple **note-taking app** that uses **Markdown** syntax to format your notes.

You can create your first note by clicking on the top-left icon on the sidebar, or delete one by clicking on top right icon.

Following there's a quick overview of the currently supported Markdown syntax.

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
