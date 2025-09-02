'use client'


import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  thematicBreakPlugin,
  quotePlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  imagePlugin,
  frontmatterPlugin,

  diffSourcePlugin,
} from '@mdxeditor/editor'

import { useMarkdownEditor } from '@renderer/hooks/useMarkdownEditor'

export const MarkdownEditor = () => {
  const { editorRef, selectedNote, handleAutoSave, handleBlur } = useMarkdownEditor()
  if (!selectedNote) return null

  return (
    <div className="rounded-lg overflow-hidden">
      <MDXEditor
        ref={editorRef}
        key={selectedNote.title}

        className="bg-transparent"
        markdown={selectedNote.content}
        onChange={handleAutoSave}
        onBlur={handleBlur}
        plugins={[
          headingsPlugin(),
          quotePlugin(),
          frontmatterPlugin(),
          listsPlugin(),
          diffSourcePlugin(),
          tablePlugin(),
          imagePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          markdownShortcutPlugin(),
          thematicBreakPlugin(),
        ]}
        contentEditableClassName="
      text-gray-800
      dark:text-white
      outline-none
      min-h-[60vh]
      w-full
      gap-6
      px-6 py-4
      caret-yellow-500
      prose-p:my-6 prose-p:leading-tight
      prose dark:prose-invert
      prose-blockquote:my-4 prose-blockquote:bg-purple-500/10 prose-blockquote:text-sm prose-blockquote:font-medium

      prose-ul:my-2 prose-li:my-0
      prose-code:px-1 prose-code:text-tomatoDark-9
      prose-code:before:content-[''] prose-code:after:content-['']
    "
      />
    </div>

  )
}

