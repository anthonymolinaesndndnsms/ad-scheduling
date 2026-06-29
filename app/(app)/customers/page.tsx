'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function CustomersPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <Link href="/customers/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Customer
          </Button>
        </Link>
      </div>

      <Card className="p-8 border-zinc-800 bg-zinc-950 text-center">
        <p className="text-zinc-400">Customer management coming soon</p>
      </Card>
    </div>
  )
}
