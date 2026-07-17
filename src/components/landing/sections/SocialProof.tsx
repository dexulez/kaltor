import { Quote } from 'lucide-react'
import { TESTIMONIOS, LOGOS_PLACEHOLDER } from '../data/content'
import { C, FD, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import Reveal from '../ui/Reveal'

export default function SocialProof() {
  return (
    <section className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          center
          kicker="PARA NEGOCIOS COMO EL TUYO"
          title="Pensado para quienes ya conocen este dolor"
          subtitle="Ejemplos ilustrativos de cómo distintos rubros usarían Kaltor en su día a día."
        />

        {/* Logos placeholder */}
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-12 mb-16 opacity-40">
          {LOGOS_PLACEHOLDER.map(l => (
            <span key={l} style={{ fontFamily: FD, fontSize: 18, fontWeight: 700, color: C.ink }}>{l}</span>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIOS.map((tst, i) => (
            <Reveal key={tst.nombre} delay={i * 0.1}>
              <div
                className="h-full rounded-2xl p-7"
                style={{ border: `1px solid ${C.line}`, backgroundColor: C.paper }}
              >
                <Quote size={22} color={C.signal} strokeWidth={1.8} />
                <p style={{ fontSize: 15.5, lineHeight: 1.65, color: C.ink, opacity: 0.75, margin: '16px 0 20px' }}>
                  &ldquo;{tst.texto}&rdquo;
                </p>
                <p style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, color: C.ink, margin: 0 }}>{tst.nombre}</p>
                <p style={{ fontFamily: FM, fontSize: 12, color: C.ink, opacity: 0.45, margin: '2px 0 0' }}>{tst.rubro}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center mt-8" style={{ fontFamily: FM, fontSize: 11, color: C.ink, opacity: 0.35 }}>
          * Ejemplos ilustrativos — no corresponden a clientes reales todavía.
        </p>
      </div>
    </section>
  )
}
