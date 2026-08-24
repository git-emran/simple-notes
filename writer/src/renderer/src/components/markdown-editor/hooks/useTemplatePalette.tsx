import { useEffect, useState } from 'react'
import type { ViewRef } from './types'

export interface TemplateItem {
  id: string
  label: string
  category: string
  description: string
  keywords?: string[]
  content: string
}

interface UseTemplatePaletteParams {
  viewRef: ViewRef
  isActive: boolean
}

export function insertTemplateContent(viewRef: ViewRef, content: string) {
  const view = viewRef.current
  if (!view) return
  const length = view.state.doc.length
  view.dispatch({
    changes: { from: 0, to: length, insert: content },
    selection: { anchor: content.length }
  })
  view.focus()
}

export const TEMPLATE_ITEMS: TemplateItem[] = [
  {
    id: 'template-bug-fix',
    label: 'Bug fix',
    category: 'Debugging',
    description: "For a bug you've already found the root cause of and are ready to fix",
    keywords: ['bug', 'fix', 'issue', 'patch'],
    content: `
## Actual Behavior

## Expected Behavior

## Steps to Reproduce

## Root Cause

## Fix

## Related Issues

 # !Example

 ## Actual Behavior

 Clicking "Save" appears to succeed in the UI, but the note is never persisted and no error is shown to the user.

 ## Expected Behavior

 Save either succeeds and persists the note, or shows an error if the request fails.

 ## Steps to Reproduce

 1. Click "Save" on a note.
 2. The server responds with a 500 for that request.
 3. No error is shown — the failure is silently swallowed.

 \`\`\`mermaid
 sequenceDiagram
     participant U as User
     participant A as App
     participant S as Server
     U->>A: Click "Save"
     A->>S: POST /save
     S-->>A: 500 Internal Server Error
     A->>A: Swallows error silently
     Note over A: Bug: no error shown to user
 \`\`\`

 ## Root Cause

 ## Fix

 ## Related Issues`
  },
  {
    id: 'template-crash-bug',
    label: 'Crash bug',
    category: 'Debugging',
    description: 'For triaging a crash or unhandled exception from a stack trace or crash log',
    keywords: ['crash', 'exception', 'stack', 'trace', 'error'],
    content: `

## Crash Summary

- User report (link, quote, or summary)
- Related reports (github, forum, etc.)
- Steps to reproduce

## Stack Trace

\`\`\`
STACK TRACE GOES HERE
\`\`\`

## Environment

- Platform: 
- Platform version: 
- App version: 

## Investigation

- Does it reproduce consistently, or only intermittently?
- Did it start after a specific dependency bump, OS update, or commit?
- Does the stack trace point into our code, or into a dependency/native module?
- Is the crash address/line the same every time, or does it vary?
- Can you isolate a minimal reproduction?
- Does it still happen on a clean install or a different machine?
- Does the user need to do anything special (config, plugin, data state) to trigger it?
- Does it happen for other users too, or just this one report?
- Can the user provide a crash log, screen recording, or more repro details?

## Root Cause
*Root cause is stated here!*

## Fix`
  }, 
  
]

export function useTemplatePalette({ viewRef, isActive }: UseTemplatePaletteParams) {
  const [isTemplatePaletteOpen, setIsTemplatePaletteOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return
      const isAltT = e.code === 'KeyT' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey
      if (!isAltT) return

      const view = viewRef.current
      if (!view) return

      // Only open if the document is completely empty
      if (view.state.doc.length === 0) {
        e.preventDefault()
        e.stopPropagation()
        setIsTemplatePaletteOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isActive, viewRef])

  return {
    isTemplatePaletteOpen,
    setIsTemplatePaletteOpen,
    insertTemplate: (content: string) => insertTemplateContent(viewRef, content)
  }
}
