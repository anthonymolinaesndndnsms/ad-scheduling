'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Briefcase,
  Users,
  UsersRound,
  MapPin,
  Wrench,
  Loader2,
} from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { globalSearch, type SearchItem, type SearchResults } from '@/lib/actions/search'

const EMPTY: SearchResults = {
  jobs: [],
  customers: [],
  employees: [],
  leads: [],
  services: [],
}

const GROUPS: {
  key: keyof SearchResults
  heading: string
  icon: typeof Briefcase
}[] = [
  { key: 'jobs', heading: 'Jobs', icon: Briefcase },
  { key: 'customers', heading: 'Customers', icon: Users },
  { key: 'employees', heading: 'Employees', icon: UsersRound },
  { key: 'leads', heading: 'Leads', icon: MapPin },
  { key: 'services', heading: 'Services', icon: Wrench },
]

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResults>(EMPTY)
  const [loading, setLoading] = React.useState(false)

  // Cmd+K / Ctrl+K to open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Debounced search (300ms). Tracks the latest request to avoid races.
  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setResults(EMPTY)
      setLoading(false)
      return
    }

    setLoading(true)
    let active = true
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(q)
        if (active) setResults(res)
      } catch {
        if (active) setResults(EMPTY)
      } finally {
        if (active) setLoading(false)
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query])

  // Reset when the dialog closes.
  React.useEffect(() => {
    if (!open) {
      setQuery('')
      setResults(EMPTY)
      setLoading(false)
    }
  }, [open])

  const navigate = React.useCallback(
    (item: SearchItem) => {
      setOpen(false)
      router.push(item.href)
    },
    [router]
  )

  const hasResults = GROUPS.some((g) => results[g.key].length > 0)
  const showEmpty = !loading && query.trim().length > 0 && !hasResults

  return (
    <>
      {/* Desktop: pill with ⌘K hint. Mobile: icon-only button. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={cn(
          'inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          'size-8 justify-center md:size-auto md:w-56 md:justify-start md:px-2.5'
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline text-sm">Search…</span>
        <kbd className="ml-auto hidden md:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="sm:max-w-lg"
        title="Search"
        description="Search jobs, customers, employees, leads and services."
      >
        {/* Results are pre-filtered server-side, so disable cmdk's built-in
            fuzzy filtering (otherwise it would hide valid hits). */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search jobs, customers, employees…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
          {query.trim().length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Type to search across jobs, customers, employees, leads and services.
            </div>
          ) : loading && !hasResults ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : showEmpty ? (
            <CommandEmpty>No results for &ldquo;{query.trim()}&rdquo;.</CommandEmpty>
          ) : (
            GROUPS.map((group) => {
              const items = results[group.key]
              if (items.length === 0) return null
              const GroupIcon = group.icon
              return (
                <CommandGroup key={group.key} heading={group.heading}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      // Unique value so cmdk keeps every item selectable
                      // even across groups.
                      value={`${group.key}:${item.id}:${item.label}`}
                      onSelect={() => navigate(item)}
                    >
                      <GroupIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.label}</p>
                        {item.sublabel && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.sublabel}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })
          )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
