import { Laptop, Tablet, Smartphone, RefreshCw } from 'lucide-react'
import { C } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import DeviceFrame from '../ui/DeviceFrame'
import DashboardMock from '../ui/DashboardMock'
import Reveal from '../ui/Reveal'

const DISPOSITIVOS = [
  { icon: Laptop, label: 'Computador' },
  { icon: Tablet, label: 'Tablet' },
  { icon: Smartphone, label: 'Celular' },
]

export default function Dispositivos() {
  return (
    <section className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-5xl mx-auto text-center">
        <SectionHeading center kicker="MULTIPLATAFORMA" title="Funciona en cualquier dispositivo" maxWidth={520} />

        <Reveal delay={0.1}>
          <div className="flex items-end justify-center gap-6 mt-14 mb-10 flex-wrap">
            <div style={{ transform: 'scale(0.68)', transformOrigin: 'bottom' }}>
              <DeviceFrame kind="tablet"><DashboardMock compact /></DeviceFrame>
            </div>
            <DeviceFrame kind="laptop"><DashboardMock /></DeviceFrame>
            <div style={{ transform: 'scale(0.68)', transformOrigin: 'bottom' }}>
              <DeviceFrame kind="phone"><DashboardMock compact /></DeviceFrame>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-wrap items-center justify-center gap-8 mb-4">
          {DISPOSITIVOS.map(d => (
            <div key={d.label} className="flex items-center gap-2">
              <d.icon size={17} color={C.signal} strokeWidth={1.8} />
              <span style={{ fontSize: 14, color: C.ink, opacity: 0.7 }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div className="inline-flex items-center gap-2" style={{ color: C.mod }}>
          <RefreshCw size={14} strokeWidth={2} />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>El mismo dato, sincronizado en tiempo real</span>
        </div>
      </div>
    </section>
  )
}
