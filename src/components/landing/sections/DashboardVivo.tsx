import { DollarSign, Package, Users, TrendingUp } from 'lucide-react'
import { C } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import GradientBlob from '../ui/GradientBlob'
import DashboardMock from '../ui/DashboardMock'
import Reveal from '../ui/Reveal'

const PUNTOS = [
  { icon: DollarSign, texto: 'Ventas y caja del día, en tiempo real' },
  { icon: Package, texto: 'Stock crítico y quiebres, antes de que pasen' },
  { icon: Users, texto: 'Clientes activos y su historial de compra' },
  { icon: TrendingUp, texto: 'Utilidad real, no solo ventas brutas' },
]

export default function DashboardVivo() {
  return (
    <section className="relative overflow-hidden px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: C.paper }}>
      <GradientBlob color={C.mod} size={460} top={40} left={-160} opacity={0.14} />
      <div className="relative max-w-5xl mx-auto grid gap-12 lg:grid-cols-2 items-center" style={{ zIndex: 1 }}>
        <Reveal>
          <SectionHeading
            kicker="TU NEGOCIO, EN VIVO"
            title="Un panel que te dice cómo va tu negocio ahora mismo"
            subtitle="Sin cerrar el mes para saber si vas bien. Los números se actualizan solos, cada vez que vendes."
          />
          <div className="mt-8 flex flex-col gap-4">
            {PUNTOS.map(p => (
              <div key={p.texto} className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, backgroundColor: `${C.signal}18` }}>
                  <p.icon size={16} color={C.signal} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 15, color: C.ink, opacity: 0.75 }}>{p.texto}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{ height: 360, maxWidth: 520, margin: '0 auto' }}>
            <DashboardMock />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
