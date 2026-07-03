import Link from 'next/link'
import { CalendarX2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CalendarEmptyState({
  message,
  newJobHref = '/jobs/new',
  showCta = true,
}: {
  message: string
  newJobHref?: string
  showCta?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <CalendarX2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 max-w-xs text-sm text-muted-foreground">{message}</p>
      {showCta && (
        <Button
          className="mt-4 h-10"
          render={<Link href={newJobHref}>Schedule a job</Link>}
        />
      )}
    </div>
  )
}
