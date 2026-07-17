import { ESTADISTICAS } from '../data/content'
import { C, FD, FM } from '../theme'
import Reveal from '../ui/Reveal'

export default function Stats() {
  return (
    <section className="px-5 md:px-12 py-14" style={{ backgroundColor: C.navy }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-center gap-x-14 gap-y-8 text-center">
          {ESTADISTICAS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <p style={{ fontFamily: FD, fontSize: 44, fontWeight: 700, color: C.signal, margin: 0, lineHeight: 1 }}>{s.valor}</p>
              <p style={{ fontSize: 13, color: C.paper, opacity: 0.5, marginTop: 8, maxWidth: 160 }}>{s.label}</p>
            </Reveal>
          ))}
        </div>
        <p className="text-center mt-8" style={{ fontFamily: FM, fontSize: 11, color: C.paper, opacity: 0.3 }}>
          * Cifras de ejemplo, referenciales — Kaltor está en etapa de crecimiento.
        </p>
      </div>
    </section>
  )
}
