import { Bell, CreditCard, Clock, AlertCircle } from 'lucide-react'
import { AUTOMATIZACIONES } from '../data/content'
import { C, FD } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import Reveal from '../ui/Reveal'

const ICONS = [Bell, CreditCard, Clock, AlertCircle]

export default function Automatizacion() {
  return (
    <section className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          kicker="AUTOMATIZACIÓN"
          title="Kaltor te avisa antes de que sea un problema"
          subtitle="Alertas y recordatorios automáticos, sin que tengas que estar revisando todo manualmente."
        />
        <div className="grid gap-4 mt-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {AUTOMATIZACIONES.map((a, i) => {
            const Icon = ICONS[i]
            return (
              <Reveal key={a.titulo} delay={i * 0.07}>
                <div className="h-full rounded-2xl p-6" style={{ border: `1px solid ${C.line}`, backgroundColor: C.paper }}>
                  <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, backgroundColor: `${C.signal}18` }}>
                    <Icon size={20} color={C.signal} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontFamily: FD, fontSize: 16.5, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{a.titulo}</h3>
                  <p style={{ fontSize: 14, color: C.ink, opacity: 0.55, lineHeight: 1.5, margin: 0 }}>{a.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
