'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts'
import { formatMoney } from '@/lib/money'

/* ------------------------------------------------------------------ */
/* Shared chart primitives                                             */
/* ------------------------------------------------------------------ */

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 } as const
const GRID_STROKE = 'var(--border)'

/** Compact money axis tick: $1.2k, $980, etc. */
function moneyAxisTick(cents: number): string {
  const dollars = cents / 100
  const abs = Math.abs(dollars)
  if (abs >= 1000) {
    const k = dollars / 1000
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `$${Math.round(dollars)}`
}

type TooltipEntry = {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

/** Tooltip that formats every numeric series value with formatMoney. */
function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label != null && (
        <p className="mb-1 font-medium text-foreground">{String(label)}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? 'var(--primary)' }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {typeof entry.value === 'number'
                ? formatMoney(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tooltip for plain counts (jobs completed). */
function CountTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  unit?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label != null && (
        <p className="mb-1 font-medium text-foreground">{String(label)}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? 'var(--primary)' }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1) Revenue over time (gross + net)                                  */
/* ------------------------------------------------------------------ */

export type RevenueOverTimePoint = {
  label: string
  grossCents: number
  netCents: number
}

export function RevenueOverTimeChart({
  data,
}: {
  data: RevenueOverTimePoint[]
}) {
  if (data.length === 0) return <EmptyChart message="No revenue in this range yet." />
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2, #10b981)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--chart-2, #10b981)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => moneyAxisTick(v)}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: GRID_STROKE }} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
          />
          <Area
            type="monotone"
            name="Gross"
            dataKey="grossCents"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#grossFill)"
          />
          <Area
            type="monotone"
            name="Net (your cut)"
            dataKey="netCents"
            stroke="var(--chart-2, #10b981)"
            strokeWidth={2}
            fill="url(#netFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2) Revenue by service type (horizontal, colored)                    */
/* ------------------------------------------------------------------ */

export type ServiceRevenuePoint = {
  name: string
  grossCents: number
  color: string
}

export function RevenueByServiceChart({ data }: { data: ServiceRevenuePoint[] }) {
  if (data.length === 0) return <EmptyChart message="No service revenue yet." />
  const height = Math.max(data.length * 40 + 24, 160)
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tickFormatter={(v: number) => moneyAxisTick(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            content={<MoneyTooltip />}
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          <Bar dataKey="grossCents" name="Gross" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3) Revenue by neighborhood                                          */
/* ------------------------------------------------------------------ */

export type NeighborhoodRevenuePoint = {
  name: string
  grossCents: number
}

export function RevenueByNeighborhoodChart({
  data,
}: {
  data: NeighborhoodRevenuePoint[]
}) {
  if (data.length === 0) return <EmptyChart message="No neighborhood revenue yet." />
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            interval={0}
            minTickGap={4}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => moneyAxisTick(v)}
          />
          <Tooltip
            content={<MoneyTooltip />}
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          <Bar
            dataKey="grossCents"
            name="Gross"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={64}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 4) Revenue by employee (gross vs their earnings)                    */
/* ------------------------------------------------------------------ */

export type EmployeeRevenuePoint = {
  name: string
  grossCents: number
  earningsCents: number
}

export function RevenueByEmployeeChart({
  data,
}: {
  data: EmployeeRevenuePoint[]
}) {
  if (data.length === 0) return <EmptyChart message="No employee revenue yet." />
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            interval={0}
            minTickGap={4}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => moneyAxisTick(v)}
          />
          <Tooltip
            content={<MoneyTooltip />}
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
          />
          <Bar
            dataKey="grossCents"
            name="Gross"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
          <Bar
            dataKey="earningsCents"
            name="Their earnings"
            fill="var(--chart-2, #10b981)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 5) Jobs completed per week (trend line)                             */
/* ------------------------------------------------------------------ */

export type JobsPerWeekPoint = {
  label: string
  count: number
}

export function JobsPerWeekChart({ data }: { data: JobsPerWeekPoint[] }) {
  if (data.length === 0)
    return <EmptyChart message="No completed jobs in this range yet." />
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            content={<CountTooltip unit=" jobs" />}
            cursor={{ stroke: GRID_STROKE }}
          />
          <Line
            type="monotone"
            name="Completed"
            dataKey="count"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--primary)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
