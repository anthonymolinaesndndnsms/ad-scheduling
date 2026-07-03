'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Recovers from any crash inside the authenticated app instead of leaving
 * the user on a dead "this page couldn't load" screen with no way back.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            This page hit an unexpected error. You can try again, or head back
            to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={() => reset()} className="w-full">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/dashboard" />} className="w-full">
            <Home className="h-4 w-4" />
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
