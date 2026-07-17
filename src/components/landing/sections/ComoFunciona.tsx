import { ShoppingCart, Package, BarChart2, Sparkles, ClipboardList } from 'lucide-react'
import { PASOS_FUNCIONA } from '../data/content'
import { C, FD, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import Reveal from '../ui/Reveal'

const ICONS = [ClipboardList, ShoppingCart, Package, BarChart2, Sparkles]

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: C.paper }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading center kicker="ASÍ FUNCIONA" title="De cero a operando, en 5 pasos" maxWidth={560} />

        <div className="relative mt-16">
          <div
            className="hidden md:block absolute"
            style={{ top: 26, left: '6%', right: '6%', height: 2, background: C.line }}
          />
          <div className="grid gap-10 md:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {PASOS_FUNCIONA.map((p, i) => {
              const Icon = ICONS[i]
              return (
                <Reveal key={p.num} delay={i * 0.08} className="relative text-center">
                  <div
                    className="relative mx-auto mb-5 flex items-center justify-center rounded-full"
                    style={{ width: 52, height: 52, backgroundColor: '#fff', border: `2px solid ${C.signal}`, zIndex: 1 }}
                  >
                    <Icon size={22} color={C.signal} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontFamily: FM, fontSize: 12, color: C.line, fontWeight: 700 }}>{p.num}</span>
                  <h3 style={{ fontFamily: FD, fontSize: 17, fontWeight: 700, color: C.ink, margin: '6px 0 8px' }}>{p.titulo}</h3>
                  <p style={{ fontSize: 14.5, color: C.ink, opacity: 0.6, lineHeight: 1.55 }}>{p.desc}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
