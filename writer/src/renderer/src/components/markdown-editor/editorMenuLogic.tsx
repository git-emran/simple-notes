'use client'
import { ReactNode } from 'react'
import { FaBold, FaItalic, FaStrikethrough, FaQuoteRight, FaListUl, FaCheckSquare, FaCode, FaLink, FaImage, FaTable, FaHeading, FaKeyboard } from 'react-icons/fa'
import { MdHorizontalRule } from 'react-icons/md'
import { VscSparkle } from 'react-icons/vsc'
import { EditorView } from '@codemirror/view'
import * as commands from './editorCommands'

export type EditorMenuEntry =
  | { type: 'separator'; id: string }
  | {
      type: 'item'
      id: string
      label: string
      icon?: ReactNode
      shortcut?: string
      keywords?: string[]
      run: (view: EditorView | null) => void
    }

export const getEditorMenuEntries = (openAiModal: () => void): EditorMenuEntry[] => [
  {
    type: 'item',
    id: 'bold',
    label: 'Bold',
    icon: <FaBold className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+B',
    keywords: ['strong'],
    run: (view) => commands.applyFormat(view, '**', '**'),
  },
  {
    type: 'item',
    id: 'italic',
    label: 'Italic',
    icon: <FaItalic className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+I',
    keywords: ['emphasis'],
    run: (view) => commands.applyFormat(view, '*', '*'),
  },
  {
    type: 'item',
    id: 'strikethrough',
    label: 'Strikethrough',
    icon: <FaStrikethrough className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+D',
    keywords: ['strike'],
    run: (view) => commands.applyFormat(view, '~~', '~~'),
  },
  {
    type: 'item',
    id: 'kbd',
    label: 'Keyboard Key',
    icon: <FaKeyboard className="h-3 w-3 opacity-60" />,
    keywords: ['kbd', 'keyboard', 'key', 'shortcut'],
    run: (view) => commands.insertKbd(view),
  },
  {
    type: 'item',
    id: 'write-with-ai',
    label: 'Write with AI',
    icon: <VscSparkle className="h-3 w-3 opacity-60" />,
    keywords: ['ai', 'generate', 'rewrite'],
    run: () => void openAiModal(),
  },
  { type: 'separator', id: 'sep-1' },
  {
    type: 'item',
    id: 'header-1',
    label: 'Header 1',
    icon: <FaHeading className="h-3 w-3 opacity-60" />,
    keywords: ['heading', 'h1', 'title'],
    run: (view) => commands.applyHeaderFormat(view, 1),
  },
  {
    type: 'item',
    id: 'header-2',
    label: 'Header 2',
    icon: <FaHeading className="h-3 w-3 opacity-60" />,
    keywords: ['heading', 'h2'],
    run: (view) => commands.applyHeaderFormat(view, 2),
  },
  {
    type: 'item',
    id: 'header-3',
    label: 'Header 3',
    icon: <FaHeading className="h-3 w-3 opacity-60" />,
    keywords: ['heading', 'h3'],
    run: (view) => commands.applyHeaderFormat(view, 3),
  },
  { type: 'separator', id: 'sep-2' },
  {
    type: 'item',
    id: 'quote',
    label: 'Quote',
    icon: <FaQuoteRight className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+Q',
    keywords: ['blockquote'],
    run: (view) => commands.applyLineFormat(view, '> '),
  },
  {
    type: 'item',
    id: 'bullet-list',
    label: 'Bullet List',
    icon: <FaListUl className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+L',
    keywords: ['list', 'unordered'],
    run: (view) => commands.applyLineFormat(view, '- '),
  },
  {
    type: 'item',
    id: 'task-list',
    label: 'Task List',
    icon: <FaCheckSquare className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+T',
    keywords: ['checkbox', 'todo'],
    run: (view) => commands.insertCheckbox(view),
  },
  { type: 'separator', id: 'sep-3' },
  {
    type: 'item',
    id: 'link',
    label: 'Link',
    icon: <FaLink className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+K',
    keywords: ['url', 'hyperlink'],
    run: (view) => commands.applyLinkFormat(view),
  },
  {
    type: 'item',
    id: 'image',
    label: 'Image',
    icon: <FaImage className="h-3 w-3 opacity-60" />,
    keywords: ['img', 'picture'],
    run: (view) => commands.applyImageFormat(view),
  },
  {
    type: 'item',
    id: 'table',
    label: 'Table',
    icon: <FaTable className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+Shift+T',
    keywords: ['grid'],
    run: (view) => commands.insertTable(view),
  },
  {
    type: 'item',
    id: 'horizontal-rule',
    label: 'Horizontal Rule',
    icon: <MdHorizontalRule className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+H',
    keywords: ['divider', 'hr'],
    run: (view) => commands.insertHorizontalRule(view),
  },
  { type: 'separator', id: 'sep-4' },
  {
    type: 'item',
    id: 'code-block',
    label: 'Code Block',
    icon: <FaCode className="h-3 w-3 opacity-60" />,
    shortcut: 'Ctrl+Shift+`',
    keywords: ['code', 'fence', 'triple backtick'],
    run: (view) => commands.insertCodeBlock(view),
  },
]
