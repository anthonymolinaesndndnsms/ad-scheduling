'use client'

import { useState, useTransition } from 'react'
import { Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  addAvailabilityEntry,
  updateAvailabilityEntry,
  deleteAvailabilityEntry,
} from '@/lib/actions/employees'

export type AvailabilityRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxJobsPerDay: number | null
  notes: string | null
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

type Draft = {
  dayOfWeek: number
  startTime: string
  endTime: string
  maxJobsPerDay: string
  notes: string
}

const EMPTY_DRAFT: Draft = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
  maxJobsPerDay: '',
  notes: '',
}

/**
 * Availability CRUD. Editable by an admin, or the employee for their own
 * schedule (advisory only — the job form checks it). All persistence goes
 * through the employees server actions, which re-check authorization.
 */
export function AvailabilityEditor({
  userId,
  entries,
  canEdit,
}: {
  userId: string
  entries: AvailabilityRow[]
  canEdit: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pending, startTransition] = useTransition()

  const sorted = [...entries].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  )

  function draftToPayload(d: Draft) {
    const max = d.maxJobsPerDay.trim()
    return {
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
      maxJobsPerDay: max === '' ? null : Number(max),
      notes: d.notes.trim() || undefined,
    }
  }

  function submitAdd() {
    startTransition(async () => {
      const res = await addAvailabilityEntry({
        userId,
        ...draftToPayload(draft),
      })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not add availability')
        return
      }
      toast.success('Availability added')
      setAdding(false)
      setDraft(EMPTY_DRAFT)
    })
  }

  function startEdit(row: AvailabilityRow) {
    setEditingId(row.id)
    setEditDraft({
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      maxJobsPerDay: row.maxJobsPerDay?.toString() ?? '',
      notes: row.notes ?? '',
    })
  }

  function submitEdit(id: string) {
    startTransition(async () => {
      const res = await updateAvailabilityEntry({
        id,
        ...draftToPayload(editDraft),
      })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not update availability')
        return
      }
      toast.success('Availability updated')
      setEditingId(null)
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteAvailabilityEntry({ id })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not remove availability')
        return
      }
      toast.success('Availability removed')
    })
  }

  return (
    <div className="space-y-3">
      {sorted.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">
          No availability set. {canEdit ? 'Add windows below so jobs can be scheduled within them.' : 'This member has not set their availability yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((row) =>
            editingId === row.id ? (
              <li
                key={row.id}
                className="rounded-lg border border-border p-3"
              >
                <DraftFields draft={editDraft} setDraft={setEditDraft} />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                    disabled={pending}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => submitEdit(row.id)}
                    disabled={pending}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </li>
            ) : (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {DAYS[row.dayOfWeek]}
                    <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                      {row.startTime}–{row.endTime}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.maxJobsPerDay != null
                      ? `Max ${row.maxJobsPerDay} job${row.maxJobsPerDay === 1 ? '' : 's'}/day`
                      : 'No daily cap'}
                    {row.notes ? ` · ${row.notes}` : ''}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(row)}
                      disabled={pending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove availability"
                      onClick={() => remove(row.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {canEdit && adding && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <DraftFields draft={draft} setDraft={setDraft} />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false)
                setDraft(EMPTY_DRAFT)
              }}
              disabled={pending}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={submitAdd} disabled={pending}>
              <Plus className="h-4 w-4" />
              Add window
            </Button>
          </div>
        </div>
      )}

      {canEdit && !adding && (
        <Button
          variant="outline"
          className="h-10 w-full sm:h-8 sm:w-auto"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" />
          Add availability
        </Button>
      )}
    </div>
  )
}

function DraftFields({
  draft,
  setDraft,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Day</Label>
        <Select
          value={String(draft.dayOfWeek)}
          onValueChange={(v) =>
            setDraft({ ...draft, dayOfWeek: Number(v) })
          }
        >
          <SelectTrigger className="h-10 w-full sm:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((day, i) => (
              <SelectItem key={i} value={String(i)}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Max jobs / day (optional)</Label>
        <Input
          type="number"
          min={1}
          max={50}
          inputMode="numeric"
          value={draft.maxJobsPerDay}
          onChange={(e) =>
            setDraft({ ...draft, maxJobsPerDay: e.target.value })
          }
          placeholder="No cap"
          className="h-10 sm:h-8"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Start time</Label>
        <Input
          type="time"
          value={draft.startTime}
          onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
          className="h-10 sm:h-8"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">End time</Label>
        <Input
          type="time"
          value={draft.endTime}
          onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
          className="h-10 sm:h-8"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs">Notes (optional)</Label>
        <Input
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="e.g. mornings only"
          maxLength={500}
          className="h-10 sm:h-8"
        />
      </div>
    </div>
  )
}
