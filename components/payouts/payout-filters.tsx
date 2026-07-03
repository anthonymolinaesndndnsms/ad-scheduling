'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type FilterEmployee = { id: string; name: string }

type RangePreset = 'today' | 'week' | 'month' | 'all'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function presetRange(preset: RangePreset): { from?: string; to?: string } {
  if (preset === 'all') return {}
  const now = new Date()
  const from = startOfToday()
  if (preset === 'today') {
    return { from: format(from, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
  }
  if (preset === 'week') {
    const day = from.getDay()
    const diffToMonday = (day + 6) % 7
    from.setDate(from.getDate() - diffToMonday)
    return { from: format(from, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
  }
  // month
  from.setDate(1)
  return { from: format(from, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All' },
]

export function PayoutFilters({ employees }: { employees: FilterEmployee[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeEmployee = searchParams.get('employee') ?? 'all'
  const activeStatus = searchParams.get('status') ?? 'all'
  const activeFrom = searchParams.get('from') ?? ''
  const activeTo = searchParams.get('to') ?? ''

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `/payouts?${qs}` : '/payouts')
    },
    [router, searchParams]
  )

  const activePreset = ((): RangePreset | null => {
    for (const p of PRESETS) {
      const r = presetRange(p.key)
      const from = r.from ?? ''
      const to = r.to ?? ''
      if (from === activeFrom && to === activeTo) return p.key
    }
    return null
  })()

  return (
    <div className="space-y-3">
      {/* Range presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const isActive = activePreset === p.key
          return (
            <Button
              key={p.key}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => pushParams(presetRange(p.key))}
            >
              {p.label}
            </Button>
          )
        })}
      </div>

      {/* Employee + status selects */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Employee</Label>
          <Select
            value={activeEmployee}
            onValueChange={(value) =>
              pushParams({ employee: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="h-10 w-full sm:h-8 sm:w-48">
              <SelectValue placeholder="All employees">
                {activeEmployee !== 'all'
                  ? employees.find((e) => e.id === activeEmployee)?.name ?? 'All employees'
                  : 'All employees'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={activeStatus}
            onValueChange={(value) =>
              pushParams({ status: value === 'all' ? null : value })
            }
          >
            <SelectTrigger className="h-10 w-full sm:h-8 sm:w-40">
              <SelectValue placeholder="Any status">
                {activeStatus === 'unpaid'
                  ? 'Unpaid owed'
                  : activeStatus === 'paid'
                    ? 'Paid history'
                    : 'Any status'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="unpaid">Unpaid owed</SelectItem>
              <SelectItem value="paid">Paid history</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(activeEmployee !== 'all' ||
          activeStatus !== 'all' ||
          activeFrom ||
          activeTo) && (
          <Button
            size="sm"
            variant="ghost"
            className={cn('h-10 sm:h-8')}
            onClick={() => router.push('/payouts')}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
