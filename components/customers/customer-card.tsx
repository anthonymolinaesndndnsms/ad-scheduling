'use client'

import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/money'
import { CASH_STATUS_CLASSES } from '@/lib/labels'
import { formatDayMonth } from '@/components/customers/format'

export type CustomerCardData = {
  id: string
  name: string
  phone: string | null
  address: string
  neighborhood: string
  totalSpentCents: number
  jobCount: number
  lastServiceISO: string | null
  outstandingCents: number
}

export function CustomerCard({ customer }: { customer: CustomerCardData }) {
  return (
    <Card className="p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/customers/${customer.id}`}
            className="font-medium leading-snug hover:underline"
          >
            {customer.name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customer.address}</span>
          </div>
        </div>
        {customer.outstandingCents > 0 && (
          <Badge variant="outline" className={CASH_STATUS_CLASSES.OUTSTANDING}>
            {formatMoney(customer.outstandingCents)} owed
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {customer.neighborhood}
        </Badge>
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5" />
            {customer.phone}
          </a>
        )}
      </div>

      <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
        <Stat label="Total spent" value={formatMoney(customer.totalSpentCents)} />
        <Stat label="Jobs" value={String(customer.jobCount)} />
        <Stat
          label="Last service"
          value={
            customer.lastServiceISO ? formatDayMonth(customer.lastServiceISO) : '—'
          }
        />
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium tabular-nums">{value}</p>
    </div>
  )
}
