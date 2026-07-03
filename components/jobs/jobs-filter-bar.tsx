'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ServiceDot } from '@/components/jobs/job-badges'

export type FilterOption = { value: string; label: string; color?: string | null }

type Props = {
  isAdmin: boolean
  employees: FilterOption[]
  services: FilterOption[]
  neighborhoods: string[]
}

const ANY = '__any__'

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
]
const CASH_OPTIONS: FilterOption[] = [
  { value: 'OUTSTANDING', label: 'Cash outstanding' },
  { value: 'COLLECTED', label: 'Cash collected' },
]
const PAYOUT_OPTIONS: FilterOption[] = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
]

export function JobsFilterBar({ isAdmin, employees, services, neighborhoods }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)

  const current = (key: string) => searchParams.get(key) ?? ''

  const activeCount = React.useMemo(() => {
    const keys = [
      'employee',
      'status',
      'cashStatus',
      'payoutStatus',
      'serviceTypeId',
      'neighborhood',
      'from',
      'to',
    ]
    return keys.filter((k) => searchParams.get(k)).length
  }, [searchParams])

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === ANY) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    router.push(qs ? `/jobs?${qs}` : '/jobs')
  }

  function clearAll() {
    router.push('/jobs')
  }

  function SelectFilter({
    label,
    paramKey,
    options,
    withDots,
    placeholder,
  }: {
    label: string
    paramKey: string
    options: FilterOption[]
    withDots?: boolean
    placeholder: string
  }) {
    const value = current(paramKey) || ANY
    const selected = options.find((o) => o.value === current(paramKey))
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Select value={value} onValueChange={(v) => setParam(paramKey, (v as string) ?? ANY)}>
          <SelectTrigger className="h-10 w-full md:h-8">
            <SelectValue placeholder={placeholder}>
              {selected ? (
                <span className="flex items-center gap-1.5">
                  {withDots && <ServiceDot color={selected.color} />}
                  {selected.label}
                </span>
              ) : (
                placeholder
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{placeholder}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {withDots && <ServiceDot color={o.color} />}
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 p-3 md:p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && (
            <SelectFilter
              label="Employee"
              paramKey="employee"
              options={employees}
              placeholder="Any employee"
            />
          )}

          <SelectFilter
            label="Service"
            paramKey="serviceTypeId"
            options={services}
            withDots
            placeholder="Any service"
          />

          <SelectFilter
            label="Status"
            paramKey="status"
            options={STATUS_OPTIONS}
            placeholder="Any status"
          />

          {isAdmin && (
            <SelectFilter
              label="Cash"
              paramKey="cashStatus"
              options={CASH_OPTIONS}
              placeholder="Any cash status"
            />
          )}

          {isAdmin && (
            <SelectFilter
              label="Payout"
              paramKey="payoutStatus"
              options={PAYOUT_OPTIONS}
              placeholder="Any payout status"
            />
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="filter-neighborhood">
              Neighborhood
            </Label>
            <Input
              id="filter-neighborhood"
              list="filter-neighborhood-list"
              defaultValue={current('neighborhood')}
              placeholder="Any neighborhood"
              className="h-10 md:h-8"
              onBlur={(e) => {
                if (e.target.value !== current('neighborhood')) {
                  setParam('neighborhood', e.target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setParam('neighborhood', (e.target as HTMLInputElement).value)
                }
              }}
            />
            <datalist id="filter-neighborhood-list">
              {neighborhoods.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="filter-from">
              From date
            </Label>
            <Input
              id="filter-from"
              type="date"
              defaultValue={current('from')}
              className="h-10 md:h-8"
              onChange={(e) => setParam('from', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="filter-to">
              To date
            </Label>
            <Input
              id="filter-to"
              type="date"
              defaultValue={current('to')}
              className="h-10 md:h-8"
              onChange={(e) => setParam('to', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
