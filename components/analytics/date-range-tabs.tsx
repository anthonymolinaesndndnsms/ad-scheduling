'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type RangePreset = 'week' | 'month' | '30d' | 'year' | 'all' | 'custom'

const PRESETS: { value: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

export function DateRangeTabs({
  preset,
  from,
  to,
}: {
  preset: RangePreset
  from: string
  to: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [customFrom, setCustomFrom] = React.useState(from)
  const [customTo, setCustomTo] = React.useState(to)

  React.useEffect(() => {
    setCustomFrom(from)
    setCustomTo(to)
  }, [from, to])

  function selectPreset(value: Exclude<RangePreset, 'custom'>) {
    router.push(`${pathname}?range=${value}`)
  }

  function applyCustom() {
    const params = new URLSearchParams({ range: 'custom' })
    if (customFrom) params.set('from', customFrom)
    if (customTo) params.set('to', customTo)
    router.push(`${pathname}?${params.toString()}`)
  }

  const customActive = preset === 'custom'

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = !customActive && preset === p.value
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => selectPreset(p.value)}
              className={cn(
                'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                active
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Custom range */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="range-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="range-from"
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={cn(
              'h-9 w-[9.5rem]',
              customActive && 'border-primary/40'
            )}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="range-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="range-to"
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className={cn(
              'h-9 w-[9.5rem]',
              customActive && 'border-primary/40'
            )}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={applyCustom}
          disabled={!customFrom && !customTo}
          className="h-9"
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
