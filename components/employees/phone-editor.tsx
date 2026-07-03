'use client'

import { useState, useTransition } from 'react'
import { Pencil, Phone, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateEmployeePhone } from '@/lib/actions/employees'

/**
 * Inline phone editor. Editable by an admin, or by the employee themselves.
 */
export function PhoneEditor({
  userId,
  initialPhone,
  canEdit,
}: {
  userId: string
  initialPhone: string
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(initialPhone)
  const [saved, setSaved] = useState(initialPhone)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const res = await updateEmployeePhone({ userId, phone })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not save phone')
        return
      }
      setSaved(phone)
      setEditing(false)
      toast.success('Phone updated')
    })
  }

  function cancel() {
    setPhone(saved)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
        {saved ? (
          <a
            href={`tel:${saved}`}
            className="text-sm text-foreground hover:underline"
          >
            {saved}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">No phone on file</span>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label="Edit phone"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 555-5555"
        maxLength={40}
        className="h-10 sm:h-8"
        autoFocus
      />
      <Button
        className="h-10 sm:h-8"
        onClick={save}
        disabled={pending}
      >
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 sm:h-8 sm:w-8"
        aria-label="Cancel"
        onClick={cancel}
        disabled={pending}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
