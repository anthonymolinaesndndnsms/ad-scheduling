'use client'

import { useState } from 'react'
import { Check, Copy, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Header hint shown on the employees list: how team members join, plus a
 * one-click copy button for the signup URL.
 */
export function CopySignupLink() {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/signup`
        : '/signup'
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Signup link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <Card className="bg-muted/30">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Employees join by creating an account
            </p>
            <p className="text-sm text-muted-foreground">
              Share the signup page at{' '}
              <span className="font-medium text-foreground">/signup</span>. New
              accounts start as employees.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={copy}
          className="h-10 w-full shrink-0 sm:h-8 sm:w-auto"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </CardContent>
    </Card>
  )
}
