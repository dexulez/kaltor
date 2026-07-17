import { Play } from 'lucide-react'
import { C, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import GradientBlob from '../ui/GradientBlob'
import Reveal from '../ui/Reveal'

/** Espacio reservado para el video demo de 30s — pendiente de grabar. */
export default function VideoDemo() {
  return (
    <section className="relative overflow-hidden px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: C.paper }}>
      <GradientBlob color={C.signal} size={420} top={-80} left="50%" opacity={0.15} />
      <div className="relative max-w-3xl mx-auto text-center" style={{ zIndex: 1 }}>
        <SectionHeading center kicker="VELO EN ACCIÓN" title="Kaltor en 30 segundos" maxWidth={420} />

        <Reveal delay={0.1}>
          <div
            className="relative mt-10 mx-auto rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '16/9',
              background: `linear-gradient(135deg, ${C.navy}, #1b2a38)`,
              border: `1px solid ${C.line}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <button
              type="button"
              aria-label="Reproducir video demo (próximamente)"
              className="flex items-center justify-center rounded-full transition-transform hover:scale-105"
              style={{ width: 76, height: 76, backgroundColor: C.signal, boxShadow: `0 0 40px ${C.signal}55` }}
            >
              <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
            </button>
            <span
              className="absolute bottom-4 right-5"
              style={{ fontFamily: FM, fontSize: 11, color: C.paper, opacity: 0.5, letterSpacing: '0.05em' }}
            >
              PRÓXIMAMENTE
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
