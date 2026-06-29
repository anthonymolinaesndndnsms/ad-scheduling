import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { TodayAppointments } from '@/components/dashboard/today-appointments'
import { RevenueOverview } from '@/components/dashboard/revenue-overview'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) {
    return null
  }

  const [settings, appointmentsCount, revenue, todayAppointments] =
    await Promise.all([
      prisma.businessSettings.findUnique({
        where: { userId },
      }),
      prisma.appointment.count({
        where: { userId, status: 'SCHEDULED' },
      }),
      prisma.appointment.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { price: true },
      }),
      prisma.appointment.findMany({
        where: {
          userId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          },
        },
        include: {
          customer: true,
          service: true,
        },
        orderBy: { startTime: 'asc' },
      }),
    ])

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <DashboardHeader businessName={settings?.businessName || 'Anthony Detailing'} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-zinc-800 bg-zinc-950">
          <p className="text-zinc-400 text-sm mb-2">Today's Jobs</p>
          <p className="text-3xl font-bold">{todayAppointments.length}</p>
        </Card>
        <Card className="p-6 border-zinc-800 bg-zinc-950">
          <p className="text-zinc-400 text-sm mb-2">Pending</p>
          <p className="text-3xl font-bold">{appointmentsCount}</p>
        </Card>
        <Card className="p-6 border-zinc-800 bg-zinc-950">
          <p className="text-zinc-400 text-sm mb-2">Total Revenue</p>
          <p className="text-3xl font-bold">
            ${(revenue._sum.price || 0).toFixed(0)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <TodayAppointments appointments={todayAppointments} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <QuickActions />
          <RevenueOverview userId={userId} />
        </div>
      </div>
    </div>
  )
}
