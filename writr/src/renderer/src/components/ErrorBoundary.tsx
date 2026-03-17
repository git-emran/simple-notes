import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--obsidian-workspace)] p-8 text-center text-[var(--obsidian-text)]">
          <h1 className="mb-4 text-2xl font-bold text-red-500">Something went wrong.</h1>
          <p className="mb-6 text-[var(--obsidian-text-muted)]">
            An unexpected error occurred in the application.
          </p>
          <pre className="mb-8 max-w-full overflow-auto rounded bg-[var(--obsidian-pane)] p-4 text-left text-xs text-red-400">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-[var(--obsidian-accent)] px-4 py-2 font-medium text-white hover:opacity-90"
          >
            Reload Application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
