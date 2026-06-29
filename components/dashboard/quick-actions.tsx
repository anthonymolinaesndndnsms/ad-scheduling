'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function QuickActions() {
  return (
    <Card className="p-6 border-zinc-800 bg-zinc-950">
      <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <Link href="/appointments/new" className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </Link>
        <Link href="/customers/new" className="block">
          <Button
            variant="outline"
            className="w-full border-zinc-700 text-white hover:bg-zinc-900"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Customer
          </Button>
        </Link>
        <Link href="/leads/new" className="block">
          <Button
            variant="outline"
            className="w-full border-zinc-700 text-white hover:bg-zinc-900"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </Link>
      </div>
    </Card>
  )
}
