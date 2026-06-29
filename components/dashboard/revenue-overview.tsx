import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'

export async function RevenueOverview({ userId }: { userId: string }) {
  const now = new Date()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [weekRevenue, monthRevenue] = await Promise.all([
    prisma.appointment.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        date: { gte: startOfWeek },
      },
      _sum: { price: true },
    }),
    prisma.appointment.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        date: { gte: startOfMonth },
      },
      _sum: { price: true },
    }),
  ])

  return (
    <Card className="p-6 border-zinc-800 bg-zinc-950">
      <h3 className="text-lg font-bold text-white mb-4">Revenue</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">This Week</p>
          <p className="text-2xl font-bold text-white">${(weekRevenue._sum.price || 0).toFixed(0)}</p>
        </div>
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400 mb-1">This Month</p>
          <p className="text-2xl font-bold text-white">${(monthRevenue._sum.price || 0).toFixed(0)}</p>
        </div>
      </div>
    </Card>
  )
}
