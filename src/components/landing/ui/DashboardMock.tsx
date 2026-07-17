'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { C, FD, FM } from '../theme'

const KPIS = [
  { label: 'Ventas hoy', valor: '$487.300', icon: DollarSign, delta: '+12%' },
  { label: 'Stock crítico', valor: '3', icon: Package, delta: 'revisar' },
  { label: 'Clientes activos', valor: '128', icon: Users, delta: '+4' },
  { label: 'Utilidad del mes', valor: '$2.1M', icon: TrendingUp, delta: '+8%' },
]

const BARRAS = [40, 65, 50, 80, 60, 95, 72]

/** Mockup del dashboard de Kaltor recreado con componentes (no es un screenshot real). */
export default function DashboardMock({ compact = false }: { compact?: boolean }) {
  const [animar, setAnimar] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimar(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        borderRadius: compact ? 12 : 16,
        overflow: 'hidden',
        background: '#fff',
        border: `1px solid ${C.line}`,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: compact ? '8px 12px' : '12px 18px', borderBottom: `1px solid ${C.line}`, background: C.paper }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.signal }} />
        <span style={{ fontFamily: FM, fontSize: compact ? 9 : 11, color: C.ink, opacity: 0.5, letterSpacing: '0.05em' }}>KALTOR · DASHBOARD</span>
      </div>

      <div style={{ padding: compact ? 12 : 20, flex: 1, display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16 }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: compact ? 6 : 10 }}>
          {KPIS.map(k => (
            <div key={k.label} style={{ borderRadius: compact ? 8 : 12, border: `1px solid ${C.line}`, padding: compact ? '8px 8px' : '12px 14px', background: C.paper }}>
              <k.icon size={compact ? 12 : 16} color={C.signal} strokeWidth={2} />
              <p style={{ fontFamily: FD, fontSize: compact ? 12 : 18, fontWeight: 700, color: C.ink, margin: compact ? '4px 0 0' : '8px 0 0' }}>{k.valor}</p>
              {!compact && <p style={{ fontSize: 10, color: C.ink, opacity: 0.45, margin: '2px 0 0' }}>{k.label}</p>}
            </div>
          ))}
        </div>

        {/* Gráfico de barras */}
        <div style={{ flex: 1, borderRadius: compact ? 8 : 12, border: `1px solid ${C.line}`, padding: compact ? 10 : 16, display: 'flex', flexDirection: 'column' }}>
          {!compact && <p style={{ fontSize: 11, color: C.ink, opacity: 0.5, marginBottom: 10 }}>Ventas de la semana</p>}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: compact ? 4 : 8, flex: 1 }}>
            {BARRAS.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 4,
                  background: i === 5 ? C.signal : C.mod,
                  opacity: i === 5 ? 1 : 0.55,
                  height: animar ? `${h}%` : '4%',
                  transition: `height 0.7s cubic-bezier(.16,1,.3,1) ${i * 60}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
