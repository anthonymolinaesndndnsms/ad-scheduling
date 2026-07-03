'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateEmployeeNotes } from '@/lib/actions/employees'

/**
 * Admin-only private notes about a team member.
 */
export function EmployeeNotes({
  userId,
  initialNotes,
}: {
  userId: string
  initialNotes: string
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [saved, setSaved] = useState(initialNotes)
  const [pending, startTransition] = useTransition()
  const dirty = notes !== saved

  function save() {
    startTransition(async () => {
      const res = await updateEmployeeNotes({ userId, notes })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not save notes')
        return
      }
      setSaved(notes)
      toast.success('Notes saved')
    })
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="employee-notes">Owner notes (private)</Label>
      <Textarea
        id="employee-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private notes only owners can see…"
        rows={4}
        maxLength={2000}
      />
      <div className="flex justify-end">
        <Button
          className="h-10 w-full sm:h-8 sm:w-auto"
          onClick={save}
          disabled={pending || !dirty}
        >
          {pending ? 'Saving…' : 'Save notes'}
        </Button>
      </div>
    </div>
  )
}
