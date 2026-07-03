'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/brand/logo'

export function DisabledAccount() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo size={48} rounded="rounded-2xl" className="mx-auto mb-2" />
          <CardTitle>Account disabled</CardTitle>
          <CardDescription>
            Your Kids Next Door account has been deactivated. Contact the owner if you
            think this is a mistake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
