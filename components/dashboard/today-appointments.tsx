'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Clock } from 'lucide-react'
import Link from 'next/link'

export function TodayAppointments({ appointments }: { appointments: any[] }) {
  if (!appointments.length) {
    return (
      <Card className="p-8 text-center border-zinc-800 bg-zinc-950">
        <p className="text-zinc-400">No appointments scheduled for today</p>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Today's Jobs</h2>
      <div className="space-y-3">
        {appointments.map((apt) => (
          <Link key={apt.id} href={`/appointments/${apt.id}`}>
            <div className="p-4 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{apt.customer.name}</h3>
                  <p className="text-sm text-zinc-400">{apt.service.name}</p>
                </div>
                <Badge className={`${apt.pinned ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                  {apt.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {apt.startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {apt.customer.neighborhood}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  {apt.customer.phone}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-white font-semibold">${apt.price}</span>
                <span className="text-xs text-zinc-500">
                  {apt.paymentStatus === 'PAID' ? '✓ Paid' : '○ Unpaid'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
