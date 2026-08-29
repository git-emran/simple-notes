import { useEffect, useState, useCallback } from 'react'
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

  const docLength = view.state.doc.length

  view.dispatch({
    changes: { from: 0, to: docLength, insert: content.trim() },
    selection: { anchor: content.trim().length }
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
    content: `## Actual Behavior

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
    content: `## Crash Summary

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
  {
    id: 'race-condition-bug',
    label: 'Race Condition Bug',
    category: 'Debugging',
    description: 'To Identify a race condition within an application.',
    keywords: ['crash', 'race-condition'],
    content: `## Symptom

- User report (link, quote, or summary)
- How often does it happen? (always / sometimes / rarely)
- Related reports (github, forum, etc.)
- Timeline / flow of events leading up to the bug (if known)

## Environment

- Platform:
- Platform version:
- App version:

## Investigation

- What are the two (or more) operations that might be racing?
- Is something (DB, cache, config) being read before it's marked ready/loaded? What event or flag should it wait on instead (e.g. \`onLocalDBLoad\`, \`cacheReady\`)?
- Could messages/events (webhooks, IPC, sync) be arriving or processing out of order?
- Is there an \`await\`/\`setTimeout\`/async gap where state can change underneath you?
- Does it only reproduce on one machine/platform, or everywhere?
- Does adding an artificial delay, or disabling a feature/extension, change the frequency?
- Trace the actual sequence of events step by step — where do they interleave?

## Root Cause

## Fix`
  },
  {
    id: 'security-bug',
    label: 'Security Bug',
    category: 'Debugging',
    description: 'Find out the severity of an issue in-terms of security.',
    keywords: ['vulnerability', 'security'],
    content: `
## Report

- Report (link, quote, or summary — e.g. a researcher disclosure, forum report, or internal review):
- Severity (critical / high / moderate / low):
- Component:

## Vulnerability

- Where is the flaw (file, endpoint, code path)?
- What's the risk if exploited — what could an attacker actually do?
- Is it already being exploited, or only theoretical?

## Root Cause

## Fix

## Verification

- Does anything need to be rotated (a leaked secret, key, or token)?
- Does this need a responsible-disclosure reply, or a security advisory/CVE?
- Has the fix been tested against the original report/reproduction?`
  }
]

export function useTemplatePalette({ viewRef, isActive }: UseTemplatePaletteParams) {
  const [isTemplatePaletteOpen, setIsTemplatePaletteOpen] = useState(false)

  const insertTemplate = useCallback(
    (content: string) => {
      insertTemplateContent(viewRef, content)
    },
    [viewRef]
  )

  useEffect(() => {
    if (!isActive) return

    const onKeyDown = (e: KeyboardEvent) => {
      const isAltT = e.code === 'KeyT' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey
      if (!isAltT) return

      const view = viewRef.current
      if (!view) return

      // Use string trimming so whitespace/empty lines count as empty
      const isEmpty = view.state.doc.toString().trim().length === 0

      if (isEmpty) {
        e.preventDefault()
        e.stopPropagation()
        setIsTemplatePaletteOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isActive, viewRef])

  return {
    isTemplatePaletteOpen,
    setIsTemplatePaletteOpen,
    insertTemplate
  }
}
