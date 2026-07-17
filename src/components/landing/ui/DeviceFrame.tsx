import type { ReactNode } from 'react'
import { C } from '../theme'

type Kind = 'laptop' | 'tablet' | 'phone'

const SIZES: Record<Kind, { w: number; h: number; radius: number; pad: number }> = {
  laptop: { w: 620, h: 388, radius: 14, pad: 10 },
  tablet: { w: 220, h: 300, radius: 20, pad: 10 },
  phone:  { w: 150, h: 310, radius: 26, pad: 8 },
}

/** Marco de dispositivo recreado con CSS (no hay screenshots reales del producto todavía). */
export default function DeviceFrame({ kind, children, style }: { kind: Kind; children: ReactNode; style?: React.CSSProperties }) {
  const s = SIZES[kind]
  return (
    <div
      style={{
        width: s.w,
        maxWidth: '100%',
        height: s.h,
        borderRadius: s.radius,
        padding: s.pad,
        background: 'linear-gradient(155deg, #23272b, #0c0e10)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {kind === 'laptop' && (
        <div style={{ display: 'flex', gap: 5, padding: '2px 4px 6px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E06010' }} />
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFB020' }} />
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.mod }} />
        </div>
      )}
      {kind === 'phone' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 6px' }}>
          <span style={{ width: 44, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)' }} />
        </div>
      )}
      <div style={{ flex: 1, borderRadius: Math.max(s.radius - 8, 6), overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
