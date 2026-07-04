'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { adminResetPassword } from '@/lib/actions/account'

/** Admin-only: set a new password for an employee without knowing the old one. */
export function AdminResetPassword({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    startTransition(async () => {
      const res = await adminResetPassword({ userId, newPassword })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not reset password')
        return
      }
      toast.success(`Password reset for ${name}`)
      setNewPassword('')
      setConfirmPassword('')
      setOpen(false)
    })
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" />
        Reset password
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {name}</DialogTitle>
            <DialogDescription>
              Set a new password for this account. They&apos;ll need to sign in with it next time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="resetNewPassword">New password</Label>
              <Input
                id="resetNewPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8+ characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resetConfirmPassword">Confirm new password</Label>
              <Input
                id="resetConfirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
