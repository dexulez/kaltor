import { ShieldCheck, CloudCog, Lock, Users2 } from 'lucide-react'
import { SEGURIDAD } from '../data/content'
import { C, FD } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import Reveal from '../ui/Reveal'

const ICONS = [ShieldCheck, CloudCog, Lock, Users2]

export default function Seguridad() {
  return (
    <section className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: C.navy2 }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          center
          light
          kicker="SEGURIDAD"
          title="Tu información, siempre respaldada"
          subtitle="La misma seriedad que le pedirías a un banco, aplicada a los datos de tu negocio."
          maxWidth={520}
        />
        <div className="grid gap-4 mt-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {SEGURIDAD.map((s, i) => {
            const Icon = ICONS[i]
            return (
              <Reveal key={s.titulo} delay={i * 0.07} className="text-center">
                <div className="mx-auto flex items-center justify-center rounded-2xl mb-4" style={{ width: 52, height: 52, backgroundColor: '#ffffff08', border: '1px solid #ffffff14' }}>
                  <Icon size={22} color={C.mod} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: C.paper, marginBottom: 6 }}>{s.titulo}</h3>
                <p style={{ fontSize: 13.5, color: C.paper, opacity: 0.5, lineHeight: 1.5 }}>{s.desc}</p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
