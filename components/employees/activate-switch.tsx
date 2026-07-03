'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { setEmployeeActive } from '@/lib/actions/employees'

/**
 * Admin-only toggle to activate / deactivate an account. The server action
 * refuses to deactivate the last active owner and returns an error we surface.
 */
export function ActivateSwitch({
  userId,
  active,
}: {
  userId: string
  active: boolean
}) {
  const [pending, startTransition] = useTransition()

  function onChange(next: boolean) {
    startTransition(async () => {
      const res = await setEmployeeActive({ userId, active: next })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not update account')
        return
      }
      toast.success(next ? 'Account activated' : 'Account deactivated')
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor="active-switch" className="text-sm font-medium">
          Account active
        </Label>
        <p className="text-xs text-muted-foreground">
          Deactivated members cannot sign in.
        </p>
      </div>
      <Switch
        id="active-switch"
        checked={active}
        disabled={pending}
        onCheckedChange={onChange}
      />
    </div>
  )
}
