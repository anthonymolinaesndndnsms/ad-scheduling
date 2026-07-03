import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, MapPin, Phone, Plus } from 'lucide-react'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { formatMoney } from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JobStatusBadge, ServiceDot, CashStatusBadge } from '@/components/jobs/job-badges'
import { CustomerProfileActions } from '@/components/customers/customer-profile-actions'

export const dynamic = 'force-dynamic'

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const [customer, settings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        jobs: { include: { serviceType: true, employee: true }, orderBy: { startTime: 'desc' } },
      },
    }),
    getSettings(),
  ])

  if (!customer) notFound()

  const completed = customer.jobs.filter((j) => j.status === 'COMPLETED')
  const totalSpent = completed.reduce((s, j) => s + j.priceCents, 0)
  const outstanding = completed
    .filter((j) => j.cashStatus === 'OUTSTANDING')
    .reduce((s, j) => s + j.priceCents, 0)
  const lastService = completed[0]?.startTime ?? null
  const neighborhoods = [...settings.neighborhoods].sort((a, b) => a.localeCompare(b))

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" render={<Link href="/customers" />} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold md:text-3xl">{customer.name}</h1>
      </div>

      {/* Contact + actions */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 text-sm">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 font-medium text-primary">
                <Phone className="h-4 w-4" />
                {customer.phone}
              </a>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {customer.address}
            </div>
            <Badge variant="outline">{customer.neighborhood}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button render={<Link href={`/jobs/new?customerId=${customer.id}`} />}>
              <Plus className="h-4 w-4" />
              New job
            </Button>
            <CustomerProfileActions
              customer={{
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                neighborhood: customer.neighborhood,
                notes: customer.notes,
              }}
              neighborhoods={neighborhoods}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total spent" value={formatMoney(totalSpent)} />
        <Stat label="Jobs" value={String(customer.jobs.length)} />
        <Stat label="Cash outstanding" value={formatMoney(outstanding)} highlight={outstanding > 0} />
        <Stat label="Last service" value={lastService ? format(lastService, 'MMM d') : '—'} />
      </div>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Job history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customer.jobs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            customer.jobs.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ServiceDot color={j.serviceType.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{j.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(j.startTime, 'MMM d, yyyy')}
                      {j.employee ? ` · ${j.employee.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm tabular-nums">{formatMoney(j.priceCents)}</span>
                  <CashStatusBadge status={j.cashStatus} />
                  <JobStatusBadge status={j.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
