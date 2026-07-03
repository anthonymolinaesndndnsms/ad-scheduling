'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format, isPast, isToday } from 'date-fns'
import { toast } from 'sonner'
import { CalendarClock, Loader2, MapPin, Phone, Plus, Trash2 } from 'lucide-react'
import type { LeadStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { LEAD_STATUS_LABELS, LEAD_STATUS_CLASSES } from '@/lib/labels'
import {
  createLead,
  updateLead,
  setLeadStatus,
  deleteLead,
  convertLead,
  type LeadInput,
} from '@/lib/actions/leads'

export type ServiceOption = { id: string; name: string; color: string | null }

export type LeadCardData = {
  id: string
  address: string
  neighborhood: string
  name: string | null
  phone: string | null
  status: LeadStatus
  notes: string | null
  followUpISO: string | null
  interestedServiceIds: string[]
  interestedServiceNames: string[]
}

const STATUSES: LeadStatus[] = [
  'NOT_HOME',
  'INTERESTED',
  'FOLLOW_UP',
  'BOOKED',
  'NOT_INTERESTED',
]

type FormState = {
  id?: string
  address: string
  neighborhood: string
  name: string
  phone: string
  status: LeadStatus
  notes: string
  followUpDate: string
  interestedServiceIds: string[]
}

const EMPTY_FORM: FormState = {
  address: '',
  neighborhood: '',
  name: '',
  phone: '',
  status: 'NOT_HOME',
  notes: '',
  followUpDate: '',
  interestedServiceIds: [],
}

export function LeadsBoard({
  leads,
  services,
  neighborhoods,
}: {
  leads: LeadCardData[]
  services: ServiceOption[]
  neighborhoods: string[]
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus | 'ALL'>('ALL')
  const [neighborhoodFilter, setNeighborhoodFilter] = React.useState<string>('ALL')
  const [dueOnly, setDueOnly] = React.useState(false)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  const allNeighborhoods = React.useMemo(() => {
    const set = new Set(neighborhoods)
    leads.forEach((l) => l.neighborhood && set.add(l.neighborhood))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [neighborhoods, leads])

  const filtered = leads.filter((l) => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false
    if (neighborhoodFilter !== 'ALL' && l.neighborhood !== neighborhoodFilter) return false
    if (dueOnly) {
      if (!l.followUpISO) return false
      const d = new Date(l.followUpISO)
      if (!isPast(d) && !isToday(d)) return false
    }
    return true
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(l: LeadCardData) {
    setForm({
      id: l.id,
      address: l.address,
      neighborhood: l.neighborhood,
      name: l.name ?? '',
      phone: l.phone ?? '',
      status: l.status,
      notes: l.notes ?? '',
      followUpDate: l.followUpISO ? l.followUpISO.slice(0, 10) : '',
      interestedServiceIds: l.interestedServiceIds,
    })
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const payload: LeadInput = {
      address: form.address,
      neighborhood: form.neighborhood,
      name: form.name || undefined,
      phone: form.phone || undefined,
      status: form.status,
      notes: form.notes || undefined,
      followUpDate: form.followUpDate || undefined,
      interestedServiceIds: form.interestedServiceIds,
    }
    const res = form.id
      ? await updateLead({ id: form.id, ...payload })
      : await createLead(payload)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not save lead')
      return
    }
    toast.success(form.id ? 'Lead updated' : 'Lead added')
    setDialogOpen(false)
    router.refresh()
  }

  async function quickStatus(id: string, status: LeadStatus) {
    const res = await setLeadStatus({ id, status })
    if (!res.ok) {
      toast.error(res.error ?? 'Could not update status')
      return
    }
    router.refresh()
  }

  async function handleConvert(id: string) {
    const res = await convertLead({ id })
    if (!res.ok) {
      toast.error(res.error ?? 'Could not convert lead')
      return
    }
    router.push(res.redirectTo ?? '/jobs/new')
  }

  async function handleDelete(id: string) {
    const res = await deleteLead({ id })
    if (!res.ok) {
      toast.error(res.error ?? 'Could not delete lead')
      return
    }
    toast.success('Lead deleted')
    router.refresh()
  }

  function toggleService(id: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      interestedServiceIds: checked
        ? [...f.interestedServiceIds, id]
        : f.interestedServiceIds.filter((s) => s !== id),
    }))
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openCreate} className="h-10">
          <Plus className="h-4 w-4" />
          Add lead
        </Button>
        <Select
          value={neighborhoodFilter}
          onValueChange={(v) => setNeighborhoodFilter(v || 'ALL')}
        >
          <SelectTrigger className="h-10 w-44">
            <SelectValue placeholder="All neighborhoods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All neighborhoods</SelectItem>
            {allNeighborhoods.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={dueOnly ? 'default' : 'outline'}
          className="h-10"
          onClick={() => setDueOnly((v) => !v)}
        >
          <CalendarClock className="h-4 w-4" />
          Follow-ups due
        </Button>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            statusFilter === 'ALL'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
          )}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === s
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {LEAD_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <MapPin className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No leads here yet</p>
            <p className="text-sm text-muted-foreground">
              Add the houses you knock so you can follow up later.
            </p>
            <Button onClick={openCreate} className="mt-2">
              <Plus className="h-4 w-4" />
              Add lead
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((l) => {
            const overdue =
              l.followUpISO && (isPast(new Date(l.followUpISO)) || isToday(new Date(l.followUpISO)))
            return (
              <Card key={l.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.address}</p>
                      <p className="text-sm text-muted-foreground">{l.neighborhood}</p>
                    </div>
                    <div className="w-36 shrink-0">
                      <Select value={l.status} onValueChange={(v) => v && quickStatus(l.id, v as LeadStatus)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {LEAD_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(l.name || l.phone) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {l.name && <span className="font-medium">{l.name}</span>}
                      {l.phone && (
                        <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-primary">
                          <Phone className="h-3.5 w-3.5" />
                          {l.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {l.followUpISO && (
                    <p
                      className={cn(
                        'inline-flex items-center gap-1 text-xs',
                        overdue ? 'font-medium text-red-500' : 'text-muted-foreground'
                      )}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Follow up {format(new Date(l.followUpISO), 'MMM d, yyyy')}
                    </p>
                  )}

                  {l.interestedServiceNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {l.interestedServiceNames.map((n) => (
                        <Badge key={n} variant="outline" className="text-[11px]">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {l.notes && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{l.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button size="sm" onClick={() => handleConvert(l.id)}>
                      Convert to job
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button size="sm" variant="ghost" aria-label="Delete lead" />}>
                        <Trash2 className="h-4 w-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(l.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit lead' : 'Add lead'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                required
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Maple St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Input
                id="neighborhood"
                list="knd-neighborhoods"
                value={form.neighborhood}
                onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                placeholder="Oak Hills"
              />
              <datalist id="knd-neighborhoods">
                {allNeighborhoods.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => v && setForm((f) => ({ ...f, status: v as LeadStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="followup">Follow-up date</Label>
                <Input
                  id="followup"
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
                />
              </div>
            </div>
            {services.length > 0 && (
              <div className="space-y-2">
                <Label>Interested services</Label>
                <div className="grid grid-cols-2 gap-2">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.interestedServiceIds.includes(s.id)}
                        onCheckedChange={(c) => toggleService(s.id, c === true)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.id ? 'Save changes' : 'Add lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
