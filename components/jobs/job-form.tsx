'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ServiceDot } from '@/components/jobs/job-badges'
import { cn } from '@/lib/utils'
import { dollarsToCents, centsToDollars } from '@/lib/money'
import { createJob, updateJob, checkEmployeeConflicts } from '@/lib/actions/jobs'

export type ServiceOption = {
  id: string
  name: string
  color: string | null
  defaultPriceCents: number | null
  defaultDurationMins: number | null
}
export type EmployeeOption = { id: string; name: string }
export type CustomerOption = {
  id: string
  name: string
  phone: string | null
  address: string
  neighborhood: string
}

export type JobFormInitial = {
  id?: string
  title: string
  serviceTypeId: string
  employeeId: string
  customerId: string
  newCustomerName: string
  newCustomerPhone: string
  address: string
  neighborhood: string
  date: string // yyyy-MM-dd
  time: string // HH:mm
  durationMins: number
  priceDollars: string
  tipDollars: string
  customerComments: string
  specifications: string
  adminNotes: string
  leadId?: string
}

type Props = {
  mode: 'create' | 'edit'
  services: ServiceOption[]
  employees: EmployeeOption[]
  customers: CustomerOption[]
  neighborhoods: string[]
  initial: JobFormInitial
}

type ConflictState = {
  conflicts: { jobId: string; title: string; time: string }[]
  availability: 'available' | 'outside_hours' | 'unknown'
  bufferMins: number
} | null

const NEW_CUSTOMER = '__new__'

export function JobForm({
  mode,
  services,
  employees,
  customers,
  neighborhoods,
  initial,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const [title, setTitle] = React.useState(initial.title)
  const [serviceTypeId, setServiceTypeId] = React.useState(initial.serviceTypeId)
  const [employeeId, setEmployeeId] = React.useState(initial.employeeId)
  const [customerMode, setCustomerMode] = React.useState<string>(
    initial.customerId ? initial.customerId : initial.newCustomerName ? NEW_CUSTOMER : ''
  )
  const [customerSearchOpen, setCustomerSearchOpen] = React.useState(false)
  const [newCustomerName, setNewCustomerName] = React.useState(initial.newCustomerName)
  const [newCustomerPhone, setNewCustomerPhone] = React.useState(initial.newCustomerPhone)
  const [address, setAddress] = React.useState(initial.address)
  const [neighborhood, setNeighborhood] = React.useState(initial.neighborhood)
  const [date, setDate] = React.useState(initial.date)
  const [time, setTime] = React.useState(initial.time)
  const [durationMins, setDurationMins] = React.useState(String(initial.durationMins))
  const [priceDollars, setPriceDollars] = React.useState(initial.priceDollars)
  const [tipDollars, setTipDollars] = React.useState(initial.tipDollars)
  const [customerComments, setCustomerComments] = React.useState(initial.customerComments)
  const [specifications, setSpecifications] = React.useState(initial.specifications)
  const [adminNotes, setAdminNotes] = React.useState(initial.adminNotes)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const [conflicts, setConflicts] = React.useState<ConflictState>(null)
  const [checkingConflicts, setCheckingConflicts] = React.useState(false)

  const selectedService = services.find((s) => s.id === serviceTypeId)
  const selectedEmployee = employees.find((e) => e.id === employeeId)
  const selectedCustomer =
    customerMode && customerMode !== NEW_CUSTOMER
      ? customers.find((c) => c.id === customerMode)
      : undefined

  const customerName =
    customerMode === NEW_CUSTOMER
      ? newCustomerName.trim()
      : selectedCustomer?.name ?? ''

  // Auto-suggest title as "<Service> — <Customer>" only when the title is blank.
  const suggestedTitle = React.useMemo(() => {
    if (!selectedService) return ''
    return customerName
      ? `${selectedService.name} — ${customerName}`
      : selectedService.name
  }, [selectedService, customerName])

  // Compute an ISO start from date + time (local).
  const startISO = React.useMemo(() => {
    if (!date || !time) return ''
    const d = new Date(`${date}T${time}`)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString()
  }, [date, time])

  // When picking a service, prefill price/duration if the fields are still empty
  // or match the previous service default (so we do not clobber manual edits).
  function onServiceChange(id: string) {
    setServiceTypeId(id)
    const svc = services.find((s) => s.id === id)
    if (!svc) return
    if (svc.defaultDurationMins != null && !durationMins) {
      setDurationMins(String(svc.defaultDurationMins))
    } else if (svc.defaultDurationMins != null && durationMins === String(initial.durationMins) && mode === 'create') {
      setDurationMins(String(svc.defaultDurationMins))
    }
    if (svc.defaultPriceCents != null && (!priceDollars || (mode === 'create' && priceDollars === initial.priceDollars))) {
      setPriceDollars(String(centsToDollars(svc.defaultPriceCents)))
    }
    if (svc.defaultDurationMins != null && mode === 'create') {
      setDurationMins(String(svc.defaultDurationMins))
    }
  }

  // Pick an existing customer: also prefill address/neighborhood when empty.
  function onPickCustomer(c: CustomerOption) {
    setCustomerMode(c.id)
    setCustomerSearchOpen(false)
    if (!address.trim()) setAddress(c.address)
    if (!neighborhood.trim()) setNeighborhood(c.neighborhood)
  }

  // Conflict check whenever employee + slot are known.
  React.useEffect(() => {
    if (!employeeId || !startISO) {
      setConflicts(null)
      return
    }
    const mins = parseInt(durationMins, 10)
    if (!Number.isFinite(mins) || mins <= 0) {
      setConflicts(null)
      return
    }
    let cancelled = false
    setCheckingConflicts(true)
    const handle = setTimeout(async () => {
      try {
        const result = await checkEmployeeConflicts(
          employeeId,
          startISO,
          mins,
          initial.id
        )
        if (!cancelled) setConflicts(result)
      } catch {
        if (!cancelled) setConflicts(null)
      } finally {
        if (!cancelled) setCheckingConflicts(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [employeeId, startISO, durationMins, initial.id])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!serviceTypeId) next.serviceTypeId = 'Choose a service'
    if (!address.trim()) next.address = 'Address is required'
    if (!neighborhood.trim()) next.neighborhood = 'Neighborhood is required'
    if (!date || !time) next.startISO = 'Pick a date and time'
    const mins = parseInt(durationMins, 10)
    if (!Number.isFinite(mins) || mins < 5) next.durationMins = 'Enter a valid duration'
    if (priceDollars.trim() === '' || Number.isNaN(parseFloat(priceDollars)))
      next.priceCents = 'Enter a price'
    if (customerMode === NEW_CUSTOMER && !newCustomerName.trim())
      next.customerId = 'Enter the new customer name'
    if (!customerMode) next.customerId = 'Select a customer or add a new one'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the highlighted fields.')
      return
    }

    const payload = {
      title: title.trim() || suggestedTitle,
      serviceTypeId,
      employeeId: employeeId || undefined,
      customerId:
        customerMode && customerMode !== NEW_CUSTOMER ? customerMode : undefined,
      newCustomerName:
        customerMode === NEW_CUSTOMER ? newCustomerName.trim() : undefined,
      newCustomerPhone:
        customerMode === NEW_CUSTOMER ? newCustomerPhone.trim() : undefined,
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      startISO,
      durationMins: parseInt(durationMins, 10),
      priceCents: dollarsToCents(priceDollars),
      tipCents: tipDollars.trim() ? dollarsToCents(tipDollars) : 0,
      customerComments: customerComments.trim() || undefined,
      specifications: specifications.trim() || undefined,
      adminNotes: adminNotes.trim() || undefined,
      leadId: initial.leadId,
    }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createJob(payload)
          : await updateJob({ ...payload, id: initial.id! })

      if (result.ok) {
        toast.success(mode === 'create' ? 'Job created' : 'Job updated')
        router.push(result.jobId ? `/jobs/${result.jobId}` : '/jobs')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  const hasConflictWarning =
    conflicts &&
    (conflicts.conflicts.length > 0 || conflicts.availability === 'outside_hours')

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Service + title */}
      <section className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-medium">Service</h2>

        <div className="space-y-1.5">
          <Label htmlFor="serviceType">Service type</Label>
          <Select value={serviceTypeId} onValueChange={(v) => onServiceChange(v as string)}>
            <SelectTrigger id="serviceType" className="h-10 w-full md:h-9">
              <SelectValue placeholder="Choose a service">
                {selectedService ? (
                  <span className="flex items-center gap-2">
                    <ServiceDot color={selectedService.color} />
                    {selectedService.name}
                  </span>
                ) : (
                  'Choose a service'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <ServiceDot color={s.color} />
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.serviceTypeId && (
            <p className="text-xs text-destructive">{errors.serviceTypeId}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={suggestedTitle || 'Auto-generated from service + customer'}
            className="h-10 md:h-9"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use{' '}
            <span className="font-medium text-foreground">
              {suggestedTitle || '"<Service> — <Customer>"'}
            </span>
            .
          </p>
        </div>
      </section>

      {/* Assignment */}
      <section className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-medium">Assignment</h2>

        <div className="space-y-1.5">
          <Label htmlFor="employee">Assigned employee</Label>
          <Select value={employeeId || '__none__'} onValueChange={(v) => setEmployeeId((v as string) === '__none__' ? '' : (v as string))}>
            <SelectTrigger id="employee" className="h-10 w-full md:h-9">
              <SelectValue placeholder="Unassigned">
                {selectedEmployee ? selectedEmployee.name : 'Unassigned'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {checkingConflicts && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking availability…
          </p>
        )}

        {hasConflictWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Scheduling warning
            </p>
            <ul className="mt-1.5 space-y-1 pl-6 list-disc">
              {conflicts?.availability === 'outside_hours' && (
                <li>This slot is outside the employee&apos;s declared hours.</li>
              )}
              {conflicts?.conflicts.map((c) => (
                <li key={c.jobId}>
                  Overlaps &ldquo;{c.title}&rdquo; at {format(new Date(c.time), 'MMM d, h:mm a')}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs opacity-80">
              You can still save this job — this is only a heads-up.
            </p>
          </div>
        )}
      </section>

      {/* Customer */}
      <section className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-medium">Customer</h2>

        {customerMode !== NEW_CUSTOMER ? (
          <div className="space-y-1.5">
            <Label>Existing customer</Label>
            <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-between md:h-9"
                  />
                }
              >
                <span className={cn(!selectedCustomer && 'text-muted-foreground')}>
                  {selectedCustomer ? selectedCustomer.name : 'Search customers…'}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[--anchor-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name…" />
                  <CommandList>
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.neighborhood}`}
                          onSelect={() => onPickCustomer(c)}
                        >
                          <span className="flex flex-col">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.neighborhood}
                            </span>
                          </span>
                          {customerMode === c.id && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomerMode(NEW_CUSTOMER)
                setCustomerSearchOpen(false)
              }}
              className="mt-1"
            >
              <UserPlus className="h-4 w-4" />
              Add a new customer instead
            </Button>
            {errors.customerId && (
              <p className="text-xs text-destructive">{errors.customerId}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="newCustomerName">New customer name</Label>
                <Input
                  id="newCustomerName"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Jane Smith"
                  className="h-10 md:h-9"
                />
                {errors.customerId && (
                  <p className="text-xs text-destructive">{errors.customerId}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newCustomerPhone">Phone (optional)</Label>
                <Input
                  id="newCustomerPhone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-10 md:h-9"
                />
              </div>
            </div>
            {customers.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomerMode('')}
              >
                Choose an existing customer instead
              </Button>
            )}
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Maple St"
              className="h-10 md:h-9"
            />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="neighborhood">Neighborhood</Label>
            <Input
              id="neighborhood"
              list="job-neighborhoods"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Oakwood"
              className="h-10 md:h-9"
            />
            <datalist id="job-neighborhoods">
              {neighborhoods.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {errors.neighborhood && (
              <p className="text-xs text-destructive">{errors.neighborhood}</p>
            )}
          </div>
        </div>
      </section>

      {/* Schedule + money */}
      <section className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-medium">Schedule &amp; pricing</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 md:h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Start time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 md:h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration (min)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              step={5}
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              className="h-10 md:h-9 tabular-nums"
            />
            {errors.durationMins && (
              <p className="text-xs text-destructive">{errors.durationMins}</p>
            )}
          </div>
        </div>
        {errors.startISO && (
          <p className="text-xs text-destructive">{errors.startISO}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="0.00"
              className="h-10 md:h-9 tabular-nums"
            />
            {errors.priceCents && (
              <p className="text-xs text-destructive">{errors.priceCents}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip">Tip ($, optional)</Label>
            <Input
              id="tip"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={tipDollars}
              onChange={(e) => setTipDollars(e.target.value)}
              placeholder="0.00"
              className="h-10 md:h-9 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Tips are paid 100% to the employee.
            </p>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-medium">Notes</h2>
        <div className="space-y-1.5">
          <Label htmlFor="customerComments">Customer comments</Label>
          <Textarea
            id="customerComments"
            value={customerComments}
            onChange={(e) => setCustomerComments(e.target.value)}
            placeholder="Anything the customer mentioned…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specifications">Specifications</Label>
          <Textarea
            id="specifications"
            value={specifications}
            onChange={(e) => setSpecifications(e.target.value)}
            placeholder="Job-specific instructions for the team…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminNotes">Owner notes (private)</Label>
          <Textarea
            id="adminNotes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Only visible to owners…"
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-10 md:h-9"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-10 md:h-9" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'create' ? (
            <Plus className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {mode === 'create' ? 'Create job' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
