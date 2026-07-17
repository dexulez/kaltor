'use client'

import { useState } from 'react'
import { LANDING_TXT, MODULOS_TXT } from '@/lib/i18n/landing'
import { useLang } from '../LangContext'
import { MODULOS, HERO_ICONS } from '../data/modulos'
import { C, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import Reveal from '../ui/Reveal'

function ModuloCard({ m, idx }: { m: typeof MODULOS[number]; idx: number }) {
  const { lang } = useLang()
  const txt = MODULOS_TXT[lang][m.key]
  const [hov, setHov] = useState(false)
  const Icon = HERO_ICONS[m.key]
  const iconColor = idx % 2 === 0 ? '#ffffff' : '#000000'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-2xl p-6 flex flex-col transition-all duration-200"
      style={{
        border: `2px solid ${hov ? C.signal : C.line}`,
        backgroundColor: hov ? '#fffbf8' : C.paper,
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? `0 12px 28px ${C.signal}1f` : 'none',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center rounded-full transition-transform"
          style={{ width: 46, height: 46, backgroundColor: C.signal, transform: hov ? 'scale(1.1) rotate(-6deg)' : 'none' }}
        >
          {Icon && <Icon size={21} color={iconColor} strokeWidth={1.8} />}
        </div>
        <span style={{ fontFamily: FM, fontSize: 11, letterSpacing: '0.14em', color: C.line }}>{m.code}</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{txt.label}</h3>
      <p style={{ fontSize: 14.5, color: C.ink, opacity: 0.55, lineHeight: 1.55, margin: 0, flex: 1 }}>{txt.desc}</p>
      <a
        href="#planes"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold no-underline"
        style={{ color: C.signal, opacity: hov ? 1 : 0.7 }}
      >
        Ver más →
      </a>
    </div>
  )
}

export default function Modulos() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  return (
    <section id="modulos" className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          kicker="TODO TU NEGOCIO EN UN SOLO LUGAR"
          title={t.modulosSection.title(MODULOS.length)}
          subtitle={t.modulosSection.subtitle}
        />
        <div className="grid gap-4 mt-12" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {MODULOS.map((m, i) => (
            <Reveal key={m.key} delay={(i % 4) * 0.06}>
              <ModuloCard m={m} idx={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
