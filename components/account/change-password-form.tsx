'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeMyPassword } from '@/lib/actions/account'

/** Self-service password change. Requires the current password. */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await changeMyPassword({ currentPassword, newPassword, confirmPassword })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not change password')
        return
      }
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="h-10 sm:h-9"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8+ characters"
            className="h-10 sm:h-9"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 sm:h-9"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="h-10 sm:h-9">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Change password
      </Button>
    </form>
  )
}
