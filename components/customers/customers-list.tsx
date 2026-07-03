'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CustomerCard, type CustomerCardData } from '@/components/customers/customer-card'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'

const ALL = '__all__'

export function CustomersList({
  customers,
  neighborhoods,
  initialQuery,
  initialNeighborhood,
}: {
  customers: CustomerCardData[]
  neighborhoods: string[]
  initialQuery: string
  initialNeighborhood: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [query, setQuery] = React.useState(initialQuery)

  // Keep the input in sync if the URL changes underneath us.
  React.useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const pushParams = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      const qs = params.toString()
      router.push(qs ? `/customers?${qs}` : '/customers')
    },
    [router, searchParams]
  )

  // Debounce the search input into the URL.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (query === initialQuery) return
      pushParams((params) => {
        if (query.trim()) params.set('q', query.trim())
        else params.delete('q')
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [query, initialQuery, pushParams])

  const neighborhoodValue = initialNeighborhood || ALL

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, or address"
            className="h-10 pl-8"
            aria-label="Search customers"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {neighborhoods.length > 0 && (
          <Select
            value={neighborhoodValue}
            onValueChange={(next) =>
              pushParams((params) => {
                const v = next as string
                if (v && v !== ALL) params.set('neighborhood', v)
                else params.delete('neighborhood')
              })
            }
          >
            <SelectTrigger className="h-10 w-full sm:w-52">
              <SelectValue placeholder="All neighborhoods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All neighborhoods</SelectItem>
              {neighborhoods.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button className="h-10 sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New customer
        </Button>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          hasFilters={Boolean(initialQuery || initialNeighborhood)}
          onAdd={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => (
            <CustomerCard key={c.id} customer={c} />
          ))}
        </div>
      )}

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        neighborhoods={neighborhoods}
        onSaved={(id) => router.push(`/customers/${id}`)}
      />
    </div>
  )
}

function EmptyState({
  hasFilters,
  onAdd,
}: {
  hasFilters: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">
        {hasFilters ? 'No customers match your filters' : 'No customers yet'}
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasFilters
          ? 'Try clearing the search or neighborhood filter.'
          : 'Add your first customer to start scheduling jobs and tracking cash.'}
      </p>
      {!hasFilters && (
        <Button className="mt-4 h-10" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          New customer
        </Button>
      )}
    </div>
  )
}
