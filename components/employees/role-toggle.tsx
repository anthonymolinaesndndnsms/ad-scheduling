'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, ShieldMinus } from 'lucide-react'
import { toast } from 'sonner'
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
import { setEmployeeRole } from '@/lib/actions/employees'

/**
 * Admin-only promote/demote control. Confirms via AlertDialog. Demoting the
 * last active owner (incl. yourself) is blocked server-side.
 */
export function RoleToggle({
  userId,
  role,
  name,
}: {
  userId: string
  role: 'ADMIN' | 'EMPLOYEE'
  name: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const nextRole = role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN'
  const promoting = nextRole === 'ADMIN'

  function confirm() {
    startTransition(async () => {
      const res = await setEmployeeRole({ userId, role: nextRole })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not update role')
        return
      }
      toast.success(promoting ? `${name} is now an owner` : `${name} is now an employee`)
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-10 w-full justify-start sm:h-8 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        {promoting ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <ShieldMinus className="h-4 w-4" />
        )}
        {promoting ? 'Promote to owner' : 'Demote to employee'}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {promoting ? 'Promote to owner?' : 'Demote to employee?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {promoting
                ? `${name} will get full owner access — managing jobs, payouts, employees and settings.`
                : `${name} will lose owner access and only see their own jobs and earnings.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              disabled={pending}
              variant={promoting ? 'default' : 'destructive'}
            >
              {promoting ? 'Promote' : 'Demote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
