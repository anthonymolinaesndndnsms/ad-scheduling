'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMyProfile } from '@/lib/actions/account'

/** Self-service edit of your own display name and email. */
export function EditProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string
  initialEmail: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateMyProfile({ name, email })
      if (!res.ok) {
        toast.error(res.error ?? 'Could not save changes')
        return
      }
      toast.success('Profile updated')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="accountName">Full name</Label>
          <Input
            id="accountName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 sm:h-9"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accountEmail">
            Email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="accountEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 sm:h-9"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="h-10 sm:h-9">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </Button>
    </form>
  )
}
