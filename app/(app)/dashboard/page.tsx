import { requireUser } from '@/lib/session'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import {
  EmployeeDashboard,
  type EmployeeRange,
} from '@/components/dashboard/employee-dashboard'

export const dynamic = 'force-dynamic'

function parseRange(value: string | string[] | undefined): EmployeeRange {
  const v = Array.isArray(value) ? value[0] : value
  if (v === 'week' || v === 'all') return v
  return 'today'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>
}) {
  const user = await requireUser()

  if (user.role === 'ADMIN') {
    return <AdminDashboard />
  }

  const { range } = await searchParams
  return <EmployeeDashboard userId={user.id} range={parseRange(range)} />
}
