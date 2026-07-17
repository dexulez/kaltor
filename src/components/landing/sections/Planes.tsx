'use client'

import { useState } from 'react'
import { formatConversion, type ConversionInfo } from '@/lib/currency'
import { LANDING_TXT, PLANES_TXT, MODULOS_TXT } from '@/lib/i18n/landing'
import { useLang } from '../LangContext'
import { PLANES, MODULOS, HERO_ICONS, clp, type Plan } from '../data/modulos'
import { C, FD, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'

type PreciosPorPlan = Record<string, { mensual: number; anual: number }>

export default function Planes({ conversion, precios, conversionPorPlan }: { conversion: ConversionInfo | null; precios?: PreciosPorPlan; conversionPorPlan?: Record<string, ConversionInfo | null> }) {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const [anual, setAnual] = useState(false)
  const planesConPrecio = PLANES.map(p => {
    const override = precios?.[p.id]
    return override ? { ...p, precio_mes: override.mensual, precio_anual: override.anual } : p
  })
  const basic  = planesConPrecio.filter(p => p.familia === 'básico')
  const taller = planesConPrecio.filter(p => p.familia === 'taller')
  const multi  = planesConPrecio.filter(p => p.familia === 'multi-tienda')

  return (
    <section id="planes" className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: C.paper }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
          <SectionHeading kicker={t.planes.kicker} title={t.planes.title} />

          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: 15, color: anual ? C.line : C.ink }}>{t.planes.mensual}</span>
            <button
              onClick={() => setAnual(a => !a)}
              className="relative cursor-pointer"
              style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: anual ? C.signal : C.line, border: 'none', transition: 'background-color 0.3s' }}
            >
              <span style={{ position: 'absolute', top: 3, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', left: anual ? 25 : 3, transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 15, color: anual ? C.ink : C.line }}>
              {t.planes.anual} <span style={{ color: C.mod, fontSize: 13 }}>{t.planes.ahorra}</span>
            </span>
          </div>
        </div>

        <FamiliaLabel label={t.planes.familiaBasico} />
        <div className="grid gap-3.5 mb-10 justify-center" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 368px))' }}>
          {basic.map(p => <PlanCard key={p.id} plan={p} anual={anual} conversion={conversion} conversionPorPlan={conversionPorPlan} />)}
        </div>

        <FamiliaLabel label={t.planes.familiaTaller} />
        <div className="grid gap-3.5 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {taller.map(p => <PlanCard key={p.id} plan={p} anual={anual} conversion={conversion} conversionPorPlan={conversionPorPlan} />)}
        </div>

        <FamiliaLabel label={t.planes.familiaMulti} />
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
          {multi.map(p => <PlanCard key={p.id} plan={p} anual={anual} conversion={conversion} conversionPorPlan={conversionPorPlan} full />)}
        </div>

        <TablaComparativa anual={anual} conversion={conversion} planes={planesConPrecio} conversionPorPlan={conversionPorPlan} />
      </div>
    </section>
  )
}

function FamiliaLabel({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: FM, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.ink, opacity: 0.35, marginBottom: 14 }}>
      {label}
    </p>
  )
}

function PlanCard({ plan, anual, conversion, conversionPorPlan, full = false }: { plan: Plan; anual: boolean; conversion: ConversionInfo | null; conversionPorPlan?: Record<string, ConversionInfo | null>; full?: boolean }) {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const planTxt = PLANES_TXT[lang][plan.id]
  const [hov, setHov] = useState(false)
  const precio = anual ? plan.precio_anual : plan.precio_mes
  const sufijo = anual ? t.planes.sufijoAnio : t.planes.sufijoMes
  const effectiveConversion = conversionPorPlan?.[plan.id] ?? conversion
  const clpPrimero = !effectiveConversion || effectiveConversion.tipo === 'uf'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex flex-col rounded-2xl p-6 transition-all"
      style={{
        border: `2px solid ${plan.destacado ? C.signal : hov ? C.signal : C.line}`,
        backgroundColor: plan.destacado ? '#FFF7F2' : '#fff',
        transform: hov ? 'translateY(-3px)' : 'none',
        width: full ? '100%' : undefined,
        boxShadow: hov || plan.destacado ? `0 10px 30px ${C.signal}14` : 'none',
      }}
    >
      {(plan.destacado || plan.hasAddon) && (
        <div style={{ marginBottom: 8 }}>
          {plan.destacado && <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.signal, margin: 0 }}>⬥ {t.planes.masElegido}</p>}
          {plan.hasAddon && planTxt.addon && <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.mod, margin: 0 }}>⬥ {planTxt.addon}</p>}
        </div>
      )}

      <h3 style={{ fontFamily: FD, fontSize: 23, fontWeight: 700, color: C.ink, marginBottom: 4, textAlign: 'center' }}>{planTxt.nombre}</h3>
      <p style={{ fontSize: 14, color: C.ink, opacity: 0.5, marginBottom: 16, textAlign: 'center' }}>{planTxt.usuarios}</p>

      <p style={{ marginBottom: effectiveConversion ? 4 : 24, textAlign: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: 30, fontWeight: 700, color: C.ink }}>
          {clpPrimero ? clp(precio) : formatConversion(precio, effectiveConversion!)}
        </span>
        <span style={{ fontSize: 14, color: C.ink, opacity: 0.45, marginLeft: 4 }}>{sufijo}</span>
      </p>
      {effectiveConversion && (
        <p style={{ fontFamily: FM, fontSize: 13, color: C.ink, opacity: 0.45, textAlign: 'center', marginBottom: 24 }}>
          {clpPrimero ? `≈ ${formatConversion(precio, effectiveConversion)}` : `${t.planes.cobroReal} ${clp(precio)} CLP`}
        </p>
      )}

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '2px 20px', marginBottom: 24, alignContent: 'start', overflow: 'hidden' }}>
        {MODULOS.filter(m => plan.modulos.includes(m.key)).map(m => {
          const Icon = HERO_ICONS[m.key]
          return (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', borderBottom: `1px solid ${C.line}1A`, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ color: C.mod, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>✓</span>
              {Icon && (
                <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: C.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={8} color="#fff" strokeWidth={2.2} />
                </span>
              )}
              <ModuloLabel k={m.key} />
            </div>
          )
        })}
      </div>

      <a href="https://app.kaltorpos.com/registro" className="block text-center rounded-lg font-semibold no-underline transition-all" style={{
        padding: '11px 0', fontSize: 15,
        backgroundColor: plan.destacado ? C.signal : 'transparent',
        color: plan.destacado ? '#fff' : C.ink,
        border: plan.destacado ? 'none' : `1.5px solid ${C.line}`,
      }}>
        {t.planes.comenzarGratis}
      </a>
    </div>
  )
}

function ModuloLabel({ k }: { k: string }) {
  const { lang } = useLang()
  const modTxt = MODULOS_TXT[lang][k]
  return <p style={{ fontSize: 11, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.25, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{modTxt.label}</p>
}

function TablaComparativa({ anual, conversion, planes, conversionPorPlan }: { anual: boolean; conversion: ConversionInfo | null; planes: Plan[]; conversionPorPlan?: Record<string, ConversionInfo | null> }) {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const tc = t.planes.comparativa
  return (
    <div style={{ marginTop: 72, paddingTop: 48, borderTop: `2px solid ${C.line}` }}>
      <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>{tc.kicker}</p>
      <h3 style={{ fontFamily: FD, fontSize: 'clamp(25px, 3.45vw, 37px)', fontWeight: 700, color: C.ink, marginBottom: 32 }}>{tc.title}</h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 780 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.line}` }}>
              <th style={{ textAlign: 'left', padding: '12px 12px', fontWeight: 600, color: C.ink, opacity: 0.45, minWidth: 140 }}>{tc.modulo}</th>
              {planes.map(p => {
                const planTxt = PLANES_TXT[lang][p.id]
                const effectiveConversion = conversionPorPlan?.[p.id] ?? conversion
                const clpPrimero = !effectiveConversion || effectiveConversion.tipo === 'uf'
                return (
                  <th key={p.id} style={{ textAlign: 'center', padding: '12px 6px', color: p.destacado ? C.signal : C.ink, borderLeft: `1px solid ${C.line}44`, minWidth: 100 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{planTxt.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontFamily: FM, fontSize: 12, fontWeight: 400, color: C.ink, opacity: 0.5 }}>
                      {clpPrimero
                        ? `${clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)}${tc.mesSufijo}`
                        : `${formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, effectiveConversion!)}${tc.mesSufijo}`}
                    </p>
                    {effectiveConversion && (
                      <p style={{ margin: '1px 0 0', fontFamily: FM, fontSize: 11, fontWeight: 400, color: C.ink, opacity: 0.4 }}>
                        {clpPrimero
                          ? `≈ ${formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, effectiveConversion)}`
                          : `${t.planes.cobroReal} ${clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)} CLP`}
                      </p>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((m, i) => {
              const Icon = HERO_ICONS[m.key]
              return (
                <tr key={m.key} style={{ backgroundColor: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {Icon && (
                        <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: C.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={12} color="#fff" strokeWidth={2} />
                        </span>
                      )}
                      <span style={{ fontWeight: 500, color: C.ink }}>{MODULOS_TXT[lang][m.key].label}</span>
                    </div>
                  </td>
                  {planes.map(p => (
                    <td key={p.id} style={{ textAlign: 'center', padding: '9px 6px', borderLeft: `1px solid ${C.line}33` }}>
                      {p.modulos.includes(m.key)
                        ? <span style={{ color: C.mod, fontWeight: 700, fontSize: 17 }}>✓</span>
                        : <span style={{ color: C.line, fontSize: 15 }}>—</span>}
                    </td>
                  ))}
                </tr>
              )
            })}

            <tr style={{ backgroundColor: '#f5f5f5', borderTop: `1px solid ${C.line}` }}>
              <td style={{ padding: '9px 12px', fontWeight: 600, color: C.ink }}>{tc.usuarios}</td>
              {planes.map(p => {
                const planTxt = PLANES_TXT[lang][p.id]
                return (
                  <td key={p.id} style={{ textAlign: 'center', padding: '9px 6px', fontSize: 13, color: C.ink, opacity: 0.7, borderLeft: `1px solid ${C.line}33` }}>
                    {planTxt.usuarios}
                  </td>
                )
              })}
            </tr>

            <tr style={{ borderTop: `2px solid ${C.line}`, backgroundColor: '#fff' }}>
              <td style={{ padding: '16px 12px', fontWeight: 700, color: C.ink }}>{tc.precioMes}</td>
              {planes.map(p => {
                const effectiveConversion = conversionPorPlan?.[p.id] ?? conversion
                const clpPrimero = !effectiveConversion || effectiveConversion.tipo === 'uf'
                return (
                  <td key={p.id} style={{ textAlign: 'center', padding: '16px 6px', borderLeft: `1px solid ${C.line}33` }}>
                    <p style={{ margin: effectiveConversion ? '0 0 2px' : '0 0 8px', fontFamily: FM, fontWeight: 700, fontSize: 16, color: p.destacado ? C.signal : C.ink }}>
                      {clpPrimero
                        ? clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)
                        : formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, effectiveConversion!)}
                    </p>
                    {effectiveConversion && (
                      <p style={{ margin: '0 0 8px', fontFamily: FM, fontSize: 11, fontWeight: 400, color: C.ink, opacity: 0.45 }}>
                        {clpPrimero
                          ? `≈ ${formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, effectiveConversion)}`
                          : `${t.planes.cobroReal} ${clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)} CLP`}
                      </p>
                    )}
                    <a href="https://app.kaltorpos.com/registro" style={{
                      display: 'inline-block', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                      backgroundColor: p.destacado ? C.signal : 'transparent',
                      color: p.destacado ? '#fff' : C.ink,
                      border: p.destacado ? 'none' : `1.5px solid ${C.line}`,
                    }}>
                      {tc.elegir}
                    </a>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: C.ink, opacity: 0.35, marginTop: 16 }}>
        {tc.footnoteClp}
        {conversion && conversion.tipo !== 'uf' && tc.footnoteConversion}
      </p>
    </div>
  )
}
