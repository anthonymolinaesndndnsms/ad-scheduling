'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { deleteCustomer } from '@/lib/actions/customers'

export function CustomerProfileActions({
  customer,
  neighborhoods,
}: {
  customer: {
    id: string
    name: string
    phone: string | null
    address: string
    neighborhood: string
    notes: string | null
  }
  neighborhoods: string[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    const res = await deleteCustomer({ id: customer.id })
    setDeleting(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not delete customer')
      return
    }
    toast.success('Customer deleted')
    setDeleteOpen(false)
    router.push('/customers')
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          className="h-10 sm:h-8"
          render={
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a href={`/jobs/new?customerId=${customer.id}`} />
          }
        >
          <Plus className="h-4 w-4" />
          New job
        </Button>
        <Button
          variant="outline"
          className="h-10 sm:h-8"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          className="h-10 sm:h-8"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        neighborhoods={neighborhoods}
        initial={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone ?? '',
          address: customer.address,
          neighborhood: customer.neighborhood,
          notes: customer.notes ?? '',
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              {customer.name} will be removed. Existing jobs stay in your records
              but will no longer be linked to a customer. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
