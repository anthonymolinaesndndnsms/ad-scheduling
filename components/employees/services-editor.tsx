'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { updateEmployeeServices } from '@/lib/actions/employees'
import { cn } from '@/lib/utils'

type Service = { id: string; name: string; color: string }

/**
 * Admin-only assigned-services editor. Toggling a checkbox immediately saves
 * the full set of selected service ids.
 */
export function ServicesEditor({
  userId,
  services,
  assignedIds,
}: {
  userId: string
  services: Service[]
  assignedIds: string[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds))
  const [pending, startTransition] = useTransition()

  function toggle(serviceId: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(serviceId)
    else next.delete(serviceId)
    const prev = selected
    setSelected(next)

    startTransition(async () => {
      const res = await updateEmployeeServices({
        userId,
        serviceTypeIds: Array.from(next),
      })
      if (!res.ok) {
        setSelected(prev) // revert on failure
        toast.error(res.error ?? 'Could not update services')
        return
      }
      toast.success('Services updated')
    })
  }

  if (services.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active services yet. Add service types in Settings.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {services.map((service) => {
        const checked = selected.has(service.id)
        return (
          <label
            key={service.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50',
              checked && 'border-primary/40 bg-primary/5',
              pending && 'opacity-70',
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => toggle(service.id, value === true)}
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: service.color }}
              aria-hidden
            />
            <span className="text-sm text-foreground">{service.name}</span>
          </label>
        )
      })}
    </div>
  )
}
