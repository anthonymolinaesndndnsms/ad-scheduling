'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NeighborhoodField } from '@/components/customers/neighborhood-field'
import { createCustomer, updateCustomer } from '@/lib/actions/customers'

export type CustomerFormValues = {
  id?: string
  name: string
  phone: string
  address: string
  neighborhood: string
  notes: string
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  neighborhoods,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  neighborhoods: string[]
  initial?: CustomerFormValues
  /** Called with the customer id after a successful save. */
  onSaved?: (customerId: string) => void
}) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [pending, setPending] = React.useState(false)

  const [name, setName] = React.useState(initial?.name ?? '')
  const [phone, setPhone] = React.useState(initial?.phone ?? '')
  const [address, setAddress] = React.useState(initial?.address ?? '')
  const [neighborhood, setNeighborhood] = React.useState(initial?.neighborhood ?? '')
  const [notes, setNotes] = React.useState(initial?.notes ?? '')

  // Re-seed the form whenever it (re)opens for a given record.
  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setPhone(initial?.phone ?? '')
      setAddress(initial?.address ?? '')
      setNeighborhood(initial?.neighborhood ?? '')
      setNotes(initial?.notes ?? '')
    }
  }, [open, initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    setPending(true)
    const payload = { name, phone, address, neighborhood, notes }
    const res =
      isEdit && initial?.id
        ? await updateCustomer({ id: initial.id, ...payload })
        : await createCustomer(payload)
    setPending(false)

    if (!res.ok) {
      toast.error(res.error ?? 'Could not save customer')
      return
    }
    toast.success(isEdit ? 'Customer updated' : 'Customer added')
    onOpenChange(false)
    if (res.customerId) onSaved?.(res.customerId)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this customer’s contact details.'
              : 'Add a customer to schedule jobs and track cash.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="customer-name">Name</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input
              id="customer-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="customer-address">Address</Label>
            <Input
              id="customer-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Maple St"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Neighborhood</Label>
            <NeighborhoodField
              value={neighborhood}
              onChange={setNeighborhood}
              neighborhoods={neighborhoods}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="customer-notes">Notes</Label>
            <Textarea
              id="customer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, dog in yard, preferences…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="h-10 sm:h-8"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="h-10 sm:h-8">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
