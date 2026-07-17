import { X, Check } from 'lucide-react'
import { COMPARACION } from '../data/content'
import { C, FD } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import Reveal from '../ui/Reveal'

export default function Comparacion() {
  return (
    <section className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-4xl mx-auto">
        <SectionHeading center kicker="EL CAMBIO" title="Sin Kaltor vs. con Kaltor" maxWidth={500} />

        <div className="mt-12 rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <div className="grid grid-cols-2">
            <div className="px-5 py-4 text-center" style={{ backgroundColor: '#f5f5f4' }}>
              <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 15, color: C.ink, opacity: 0.5 }}>Sin Kaltor</span>
            </div>
            <div className="px-5 py-4 text-center" style={{ backgroundColor: C.navy }}>
              <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 15, color: C.signal }}>Con Kaltor</span>
            </div>
          </div>

          {COMPARACION.map((row, i) => (
            <Reveal key={row.con} delay={i * 0.05}>
              <div className="grid grid-cols-2" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: '#fafafa' }}>
                  <X size={16} color="#b0413e" strokeWidth={2.4} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14.5, color: C.ink, opacity: 0.55, lineHeight: 1.4 }}>{row.sin}</span>
                </div>
                <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: '#FFF7F2' }}>
                  <Check size={16} color={C.mod} strokeWidth={2.6} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14.5, color: C.ink, fontWeight: 500, lineHeight: 1.4 }}>{row.con}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
