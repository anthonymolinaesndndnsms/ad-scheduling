'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatMoney, dollarsToCents, centsToDollars } from '@/lib/money'
import {
  updateSettings,
  createServiceType,
  updateServiceType,
  setServiceActive,
  deleteServiceType,
} from '@/lib/actions/settings'

export type ServiceRow = {
  id: string
  name: string
  description: string | null
  color: string
  defaultPriceCents: number | null
  defaultDurationMins: number | null
  active: boolean
  jobCount: number
}

type SettingsData = {
  businessName: string
  logoUrl: string
  currency: string
  timezone: string
  employeeSplitPercent: number
  defaultJobDurationMins: number
  defaultBufferMins: number
  neighborhoods: string[]
}

const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD']
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

export function SettingsPanel({
  settings,
  services,
}: {
  settings: SettingsData
  services: ServiceRow[]
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)

  const [businessName, setBusinessName] = React.useState(settings.businessName)
  const [logoUrl, setLogoUrl] = React.useState(settings.logoUrl)
  const [currency, setCurrency] = React.useState(settings.currency)
  const [timezone, setTimezone] = React.useState(settings.timezone)
  const [split, setSplit] = React.useState(settings.employeeSplitPercent)
  const [duration, setDuration] = React.useState(settings.defaultJobDurationMins)
  const [buffer, setBuffer] = React.useState(settings.defaultBufferMins)
  const [neighborhoods, setNeighborhoods] = React.useState<string[]>(settings.neighborhoods)
  const [newNeighborhood, setNewNeighborhood] = React.useState('')

  async function save() {
    setSaving(true)
    const res = await updateSettings({
      businessName,
      logoUrl,
      currency,
      timezone,
      employeeSplitPercent: Number(split),
      defaultJobDurationMins: Number(duration),
      defaultBufferMins: Number(buffer),
      neighborhoods,
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not save settings')
      return
    }
    toast.success('Settings saved')
    router.refresh()
  }

  function addNeighborhood() {
    const n = newNeighborhood.trim()
    if (!n) return
    if (neighborhoods.some((x) => x.toLowerCase() === n.toLowerCase())) {
      setNewNeighborhood('')
      return
    }
    setNeighborhoods((prev) => [...prev, n])
    setNewNeighborhood('')
  }

  const previewEmployee = dollarsToCents(50) * (split / 100)
  const previewAdmin = dollarsToCents(50) - previewEmployee

  return (
    <Tabs defaultValue="business" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="money">Money</TabsTrigger>
        <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="neighborhoods">Neighborhoods</TabsTrigger>
      </TabsList>

      {/* BUSINESS */}
      <TabsContent value="business">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bname">Business name</Label>
              <Input id="bname" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <div className="flex items-center gap-3">
                <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded object-contain" /> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                  <SelectTrigger>
                    <SelectValue>{currency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {timezone.replace('America/', '').replace('Pacific/', '').replace('_', ' ')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace('America/', '').replace('Pacific/', '').replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* MONEY */}
      <TabsContent value="money">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Split</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="split">Employee split (%)</Label>
              <Input
                id="split"
                type="number"
                min={0}
                max={100}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                You keep {100 - split}%. On a $50 job: employee gets{' '}
                <span className="font-medium text-foreground">{formatMoney(previewEmployee)}</span>, you keep{' '}
                <span className="font-medium text-foreground">{formatMoney(previewAdmin)}</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                Applies to new jobs only — existing jobs keep the split they were created with. Tips
                always go 100% to the employee.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* SCHEDULING */}
      <TabsContent value="scheduling">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduling defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dur">Default job duration (minutes)</Label>
              <Input
                id="dur"
                type="number"
                min={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buf">Default buffer between jobs (minutes)</Label>
              <Input
                id="buf"
                type="number"
                min={0}
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Flexibility time between back-to-back jobs — used when warning about overlaps.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* SERVICES */}
      <TabsContent value="services">
        <ServicesManager services={services} />
      </TabsContent>

      {/* NEIGHBORHOODS */}
      <TabsContent value="neighborhoods">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neighborhoods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newNeighborhood}
                onChange={(e) => setNewNeighborhood(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addNeighborhood()
                  }
                }}
                placeholder="Add a neighborhood"
              />
              <Button type="button" onClick={addNeighborhood}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {neighborhoods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No neighborhoods yet.</p>
              ) : (
                neighborhoods.map((n) => (
                  <Badge key={n} variant="outline" className="gap-1 py-1 pr-1">
                    {n}
                    <button
                      type="button"
                      onClick={() => setNeighborhoods((prev) => prev.filter((x) => x !== n))}
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${n}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Used as suggestions in job, customer, and lead forms.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Sticky save (applies to all non-service tabs) */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </Tabs>
  )
}

// ---------------------------------------------------------------------------
// Services manager
// ---------------------------------------------------------------------------

type ServiceForm = {
  id?: string
  name: string
  description: string
  color: string
  priceDollars: string
  durationMins: string
}

function ServicesManager({ services }: { services: ServiceRow[] }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<ServiceForm>({
    name: '',
    description: '',
    color: '#3b82f6',
    priceDollars: '',
    durationMins: '60',
  })
  const [saving, setSaving] = React.useState(false)

  function openCreate() {
    setForm({ name: '', description: '', color: '#3b82f6', priceDollars: '', durationMins: '60' })
    setDialogOpen(true)
  }

  function openEdit(s: ServiceRow) {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      color: s.color,
      priceDollars: s.defaultPriceCents != null ? String(centsToDollars(s.defaultPriceCents)) : '',
      durationMins: s.defaultDurationMins != null ? String(s.defaultDurationMins) : '',
    })
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description || undefined,
      color: form.color,
      defaultPriceCents: form.priceDollars ? dollarsToCents(form.priceDollars) : null,
      defaultDurationMins: form.durationMins ? Number(form.durationMins) : null,
    }
    const res = form.id
      ? await updateServiceType({ id: form.id, ...payload })
      : await createServiceType(payload)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not save service')
      return
    }
    toast.success(form.id ? 'Service updated' : 'Service added')
    setDialogOpen(false)
    router.refresh()
  }

  async function toggleActive(s: ServiceRow, active: boolean) {
    const res = await setServiceActive({ id: s.id, active })
    if (!res.ok) {
      toast.error(res.error ?? 'Could not update service')
      return
    }
    router.refresh()
  }

  async function handleDelete(s: ServiceRow) {
    const res = await deleteServiceType({ id: s.id })
    if (!res.ok) {
      toast.error(res.error ?? 'Could not delete service')
      return
    }
    toast.success('Service deleted')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Services</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.defaultPriceCents != null ? formatMoney(s.defaultPriceCents) : 'No default price'}
                  {s.defaultDurationMins != null ? ` · ${s.defaultDurationMins} min` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={s.active} onCheckedChange={(c) => toggleActive(s, c === true)} />
              <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" variant="ghost" aria-label="Delete service" />}>
                  <X className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {s.jobCount > 0
                        ? 'This service has jobs and cannot be deleted — deactivate it instead.'
                        : 'This permanently removes the service.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(s)} disabled={s.jobCount > 0}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit service' : 'Add service'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sname">Name</Label>
                <Input id="sname" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sdesc">Description</Label>
                <Textarea id="sdesc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="scolor">Color</Label>
                  <Input id="scolor" type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-10 p-1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sprice">Price ($)</Label>
                  <Input id="sprice" inputMode="decimal" value={form.priceDollars} onChange={(e) => setForm((f) => ({ ...f, priceDollars: e.target.value }))} placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sdur">Duration</Label>
                  <Input id="sdur" type="number" value={form.durationMins} onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.id ? 'Save' : 'Add service'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
