'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'
import { formatCLP } from '@/lib/calculations'

const COLORES = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

// Tooltip que formatea en CLP
function TooltipCLP({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: COLORES[i] }}>
          {p.name}: {formatCLP(p.value)}
        </p>
      ))}
    </div>
  )
}

function TooltipNum({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: COLORES[i] }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── BarChart (dinero) ────────────────────────────────────────────────────────
export function GraficoBarrasCLP({
  data, dataKey, nameKey = 'name', color = COLORES[0], height = 220,
}: {
  data: Record<string, unknown>[]
  dataKey: string
  nameKey?: string
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={52} />
        <Tooltip content={<TooltipCLP />} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name="Total" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── BarChart (cantidades) ────────────────────────────────────────────────────
export function GraficoBarrasNum({
  data, dataKey, nameKey = 'name', color = COLORES[0], height = 220,
}: {
  data: Record<string, unknown>[]
  dataKey: string
  nameKey?: string
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={32} />
        <Tooltip content={<TooltipNum />} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name="Cantidad" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── PieChart / Donut ─────────────────────────────────────────────────────────
export function GraficoPastel({
  data, height = 220,
}: {
  data: { name: string; value: number }[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={55} outerRadius={85}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORES[i % COLORES.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCLP(Number(v))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── AreaChart (tendencia) ────────────────────────────────────────────────────
export function GraficoArea({
  data, dataKey, nameKey = 'fecha', color = COLORES[0], height = 220,
}: {
  data: Record<string, unknown>[]
  dataKey: string
  nameKey?: string
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={52} />
        <Tooltip content={<TooltipCLP />} />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill="url(#gradFill)" name="Total" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
