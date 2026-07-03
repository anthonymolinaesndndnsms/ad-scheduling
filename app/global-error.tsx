'use client'

import { useEffect } from 'react'

/**
 * Last-resort fallback if the root layout itself fails to render. Must
 * define its own <html>/<body> since it replaces the entire document.
 * Deliberately plain (no design system dependency) since that's part of
 * what may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100dvh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a1a1aa', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            Kids Next Door hit an unexpected error loading the app.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
