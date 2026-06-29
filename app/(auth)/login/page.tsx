'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-full max-w-md p-8 border-zinc-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AD Scheduling</h1>
          <p className="text-zinc-400">Anthony Detailing</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-zinc-400">Or continue with email</span>
            </div>
          </div>

          <p className="text-sm text-zinc-400 text-center">
            Email login coming soon
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-zinc-400">
          <p>Private application</p>
          <p className="mt-1">Authorized users only</p>
        </div>
      </Card>
    </div>
  )
}
