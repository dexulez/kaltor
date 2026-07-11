'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { ShoppingCart, Building2, Package, Wrench, Hammer, BarChart2, Receipt, Store, Settings, BookOpen, Banknote, Truck, Target, TrendingUp, Eye, AlertTriangle, Zap, SlidersHorizontal, Globe, Users } from 'lucide-react'
import ChatWidget from '@/components/chat/ChatWidget'
import { formatConversion, type ConversionInfo } from '@/lib/currency'
import { LANGS, LANDING_TXT, MODULOS_TXT, PLANES_TXT, type Lang } from '@/lib/i18n/landing'

// ── Idioma ────────────────────────────────────────────────────────────────────
type LangCtxValue = { lang: Lang; setLang: (l: Lang) => void }
const LangContext = createContext<LangCtxValue>({ lang: 'es', setLang: () => {} })
function useLang() { return useContext(LangContext) }

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

const HERO_ICONS: Record<string, LucideIcon> = {
  ventas:         ShoppingCart,
  compras:        Building2,
  productos:      Package,
  servicios:      Wrench,
  taller:         Hammer,
  informes:       BarChart2,
  contabilidad:   Receipt,
  canal_b2b:      Store,
  configuracion:  Settings,
  manuales:       BookOpen,
  conciliaciones: Banknote,
  trazabilidad:   Truck,
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  paper:  '#F5F6F4',
  ink:    '#121B1F',
  line:   '#C9CFC7',
  signal: '#FF7A1A',
  mod:    '#2FB673',
  navy:   '#101B26',
}
const FD = 'var(--font-display, "Space Grotesk", sans-serif)'
const FM = 'var(--font-mono, "JetBrains Mono", monospace)'

// ── Datos ─────────────────────────────────────────────────────────────────────
// El texto (label/desc/ventaja) vive en MODULOS_TXT (src/lib/i18n/landing.ts), por idioma.
const MODULOS = [
  { code: 'MOD-01', key: 'ventas',        abbr: 'VTA', icon: '💰' },
  { code: 'MOD-02', key: 'compras',       abbr: 'COM', icon: '🏭' },
  { code: 'MOD-03', key: 'productos',     abbr: 'INV', icon: '📦' },
  { code: 'MOD-04', key: 'servicios',     abbr: 'SVC', icon: '🔩' },
  { code: 'MOD-05', key: 'taller',        abbr: 'TAL', icon: '🔧' },
  { code: 'MOD-06', key: 'informes',      abbr: 'INF', icon: '📈' },
  { code: 'MOD-07', key: 'contabilidad',  abbr: 'CTB', icon: '🧾' },
  { code: 'MOD-08', key: 'canal_b2b',     abbr: 'B2B', icon: '🛍️' },
  { code: 'MOD-09', key: 'configuracion',  abbr: 'CFG', icon: '⚙️' },
  { code: 'MOD-10', key: 'manuales',       abbr: 'MAN', icon: '🧠' },
  { code: 'MOD-11', key: 'conciliaciones', abbr: 'BNK', icon: '🏦' },
  { code: 'MOD-12', key: 'trazabilidad',   abbr: 'TRZ', icon: '📍' },
]

// El texto (nombre/usuarios/addon) vive en PLANES_TXT (src/lib/i18n/landing.ts), por idioma.
type Plan = {
  id: string
  precio_mes: number
  precio_anual: number
  modulos: string[]
  familia: string
  destacado: boolean
  hasAddon?: boolean
}

const PLANES: Plan[] = [
  { id: 'basico',              precio_mes: 14990, precio_anual: 149900, modulos: ['ventas','compras','productos','informes','trazabilidad','configuracion'],                                                                                 familia: 'básico',       destacado: false },
  { id: 'pro',                 precio_mes: 23990, precio_anual: 239900, modulos: ['ventas','compras','productos','informes','contabilidad','conciliaciones','trazabilidad','configuracion'],                                             familia: 'básico',       destacado: false },
  { id: 'taller-basico',       precio_mes: 19990, precio_anual: 199900, modulos: ['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion'],                                                        familia: 'taller',       destacado: false },
  { id: 'taller-basico-5u',    precio_mes: 29990, precio_anual: 299900, modulos: ['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion'],                                                        familia: 'taller',       destacado: true  },
  { id: 'taller-multiusuario', precio_mes: 36990, precio_anual: 369900, modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','trazabilidad','configuracion'],                              familia: 'taller',       destacado: false },
  { id: 'taller-pro',          precio_mes: 44990, precio_anual: 449900, modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','conciliaciones','trazabilidad','configuracion'],             familia: 'taller',       destacado: false },
  { id: 'taller-multi-tienda', precio_mes: 84990, precio_anual: 849900, modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','canal_b2b','manuales','conciliaciones','trazabilidad','configuracion'], familia: 'multi-tienda', destacado: false, hasAddon: true },
]

function clp(n: number) { return `$${n.toLocaleString('es-CL')}` }

// ── Switch ────────────────────────────────────────────────────────────────────
function Switch({ on, code, color = 'signal', size = 'md', dimCode = false }: {
  on: boolean; code: string; color?: 'signal' | 'mod'; size?: 'sm' | 'md' | 'lg'; dimCode?: boolean
}) {
  const c    = color === 'signal' ? C.signal : C.mod
  const wh   = size === 'sm' ? 18 : size === 'lg' ? 40 : 28
  const dWh  = size === 'sm' ? 6  : size === 'lg' ? 16 : 10
  const fs   = size === 'sm' ? 9  : size === 'lg' ? 13 : 10

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: wh, height: wh, borderRadius: '50%', border: `2px solid ${on ? c : C.line}`,
        backgroundColor: on ? c : 'transparent',
        boxShadow: on ? `0 0 10px ${c}55` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ width: dWh, height: dWh, borderRadius: '50%', backgroundColor: on ? '#fff' : C.line, transition: 'all 0.4s ease' }} />
      </div>
      {code && (
        <span style={{ fontFamily: FM, fontSize: fs, textTransform: 'uppercase', letterSpacing: '0.12em', color: dimCode ? C.line : (on ? C.ink : C.line), transition: 'color 0.4s ease' }}>
          {code}
        </span>
      )}
    </div>
  )
}

// ── Módulo interactivo del hero ───────────────────────────────────────────────
function HeroModuloItem({ m, lit, isOpen, onToggle, iconColor }: {
  m: typeof MODULOS[0]; lit: boolean; isOpen: boolean; onToggle: () => void; iconColor: string
}) {
  const { lang } = useLang()
  const txt = MODULOS_TXT[lang][m.key]
  const [hov, setHov] = useState(false)
  const activo = hov || isOpen || lit
  const Icon = HERO_ICONS[m.key]

  return (
    <div
      data-modulo={m.key}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none', minWidth: 56 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onToggle}
    >
      {/* Círculo naranja con icono vectorizado */}
      <div style={{
        width: 54, height: 54, borderRadius: '50%',
        backgroundColor: activo ? C.signal : '#f0f0f0',
        border: `2px solid ${activo ? C.signal : C.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s ease',
        transform: (hov || isOpen) ? 'scale(1.18)' : 'scale(1)',
        boxShadow: (hov || isOpen) ? `0 0 18px ${C.signal}55` : activo ? `0 0 8px ${C.signal}33` : 'none',
      }}>
        {Icon && <Icon size={22} color={activo ? iconColor : C.line} strokeWidth={1.8} />}
      </div>

      {/* Etiqueta: hover/open → nombre completo, normal → abreviatura */}
      <span style={{
        fontFamily: FM, fontSize: (hov || isOpen) ? 12 : 10,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: (hov || isOpen) ? C.signal : activo ? C.ink : C.line,
        transition: 'all 0.25s ease', whiteSpace: 'nowrap',
        fontWeight: (hov || isOpen) ? 600 : 400,
        maxWidth: 72, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {(hov || isOpen) ? txt.label : m.abbr}
      </span>

      {/* Popup al hacer click */}
      {isOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 'calc(100% + 14px)', left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: C.navy, color: C.paper,
            borderRadius: 16, padding: '16px 18px',
            width: 230, zIndex: 200,
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            animation: 'popupIn 0.18s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              width: 38, height: 38, borderRadius: '50%',
              backgroundColor: `${C.signal}25`,
              border: `1.5px solid ${C.signal}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {Icon && <Icon size={18} color={C.signal} strokeWidth={1.8} />}
            </span>
            <div>
              <p style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, margin: 0, color: C.paper }}>{txt.label}</p>
              <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.signal, margin: 0 }}>{m.abbr}</p>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.82, margin: 0 }}>{txt.ventaja}</p>
          {/* Flecha */}
          <div style={{
            position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
            borderTop: `8px solid ${C.navy}`,
          }} />
        </div>
      )}
    </div>
  )
}

function HeroModuloPanel({ lit }: { lit: number }) {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const [popup, setPopup] = useState<string | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-modulo]')) setPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      padding: '28px 36px', borderRadius: 20,
      border: `1px solid ${C.line}`, backgroundColor: '#fff',
      boxShadow: '0 4px 32px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {MODULOS.map((m, i) => (
          <HeroModuloItem
            key={m.key}
            m={m}
            lit={i < lit}
            isOpen={popup === m.key}
            onToggle={() => setPopup(p => p === m.key ? null : m.key)}
            iconColor={i % 2 === 0 ? '#ffffff' : '#000000'}
          />
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 13, color: C.line, marginTop: 16, marginBottom: 0, letterSpacing: '0.05em' }}>
        {t.hero.hint}
      </p>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', gap: 2, border: `1px solid ${C.line}`, borderRadius: 8, padding: 2 }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => {
            setLang(l.code)
            document.cookie = `kaltor_lang=${l.code}; path=/; max-age=31536000`
          }}
          style={{
            padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: FM, fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
            backgroundColor: lang === l.code ? C.signal : 'transparent',
            color: lang === l.code ? '#fff' : C.ink,
            opacity: lang === l.code ? 1 : 0.55,
            transition: 'all 0.2s',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

function Nav() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className="kaltor-nav" style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: 64,
      backgroundColor: C.paper,
      borderBottom: `1px solid ${scrolled ? C.line : 'transparent'}`,
      transition: 'border-color 0.3s',
    }}>
      {/* Logo */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kaltor-logo.svg" alt="Kaltor" style={{ height: 52 }} />
      </a>

      {/* Links */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div className="kaltor-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {[[t.nav.modulos, '#modulos'], [t.nav.planes, '#planes'], [t.nav.contacto, '#contacto']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 16, color: C.ink, textDecoration: 'none', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
              {label}
            </a>
          ))}
        </div>
        <LangSwitcher />
        <a href="/login" style={{
          padding: '8px 18px', borderRadius: 8, backgroundColor: C.signal, color: '#fff',
          fontSize: 16, fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          {t.nav.entrar}
        </a>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const [lit, setLit] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setLit(MODULOS.length); return }
    if (lit >= MODULOS.length) return
    const timer = setTimeout(() => setLit(l => l + 1), 130)
    return () => clearTimeout(timer)
  }, [lit])

  return (
    <section style={{ minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', backgroundColor: C.paper }}>
      <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 24 }}>
        {t.hero.kicker}
      </p>

      <h1 style={{ fontFamily: FD, fontSize: 'clamp(46px, 7vw, 83px)', fontWeight: 700, lineHeight: 1.1, color: C.ink, marginBottom: 20, maxWidth: 800 }}>
        {t.hero.titleLine1}<br />
        <span style={{ color: C.signal }}>{t.hero.titleHighlight}</span>
      </h1>

      <p style={{ fontSize: 21, color: C.ink, opacity: 0.6, maxWidth: 560, marginBottom: 40, lineHeight: 1.6 }}>
        {t.hero.subtitle}
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="https://app.kaltorpos.com/registro" style={{
          padding: '14px 32px', borderRadius: 12, backgroundColor: C.signal, color: '#fff',
          fontWeight: 600, fontSize: 18, textDecoration: 'none', transition: 'transform 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
          {t.hero.ctaStart}
        </a>
        <a href="#planes" style={{
          padding: '14px 32px', borderRadius: 12, border: `2px solid ${C.line}`,
          color: C.ink, fontWeight: 600, fontSize: 18, textDecoration: 'none', transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.ink)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.line)}>
          {t.hero.ctaPlans}
        </a>
      </div>

      {/* Panel interactivo de módulos */}
      <HeroModuloPanel lit={lit} />
    </section>
  )
}

// ── Módulos ───────────────────────────────────────────────────────────────────
function Modulos() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  return (
    <section id="modulos" className="kaltor-section" style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>{t.modulosSection.kicker}</p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink, marginBottom: 8 }}>{t.modulosSection.title(MODULOS.length)}</h2>
        <p style={{ fontSize: 20, color: C.ink, opacity: 0.6, marginBottom: 56, maxWidth: 560 }}>
          {t.modulosSection.subtitle}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {MODULOS.map((m, i) => (
            <ModuloCard key={m.key} m={m} idx={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ModuloCard({ m, idx }: { m: typeof MODULOS[0]; idx: number }) {
  const { lang } = useLang()
  const txt = MODULOS_TXT[lang][m.key]
  const [hov, setHov] = useState(false)
  const Icon = HERO_ICONS[m.key]
  const iconColor = idx % 2 === 0 ? '#ffffff' : '#000000'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '20px 24px', borderRadius: 14,
        border: `2px solid ${hov ? C.signal : C.line}`,
        backgroundColor: hov ? '#fffbf8' : C.paper,
        display: 'flex', gap: 16, alignItems: 'flex-start',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? `0 8px 24px ${C.signal}18` : 'none',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          backgroundColor: C.signal,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.25s',
          transform: hov ? 'scale(1.12)' : 'scale(1)',
          boxShadow: hov ? `0 4px 12px ${C.signal}44` : 'none',
        }}>
          {Icon && <Icon size={20} color={iconColor} strokeWidth={1.8} />}
        </div>
        <span style={{ fontFamily: FM, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: hov ? C.signal : C.line }}>{m.abbr}</span>
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: FM, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.line, display: 'block', marginBottom: 4 }}>{m.code}</span>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{txt.label}</h3>
        <p style={{ fontSize: 15, color: C.ink, opacity: 0.55, lineHeight: 1.5, margin: 0 }}>{txt.desc}</p>
        {hov && (
          <p style={{ fontSize: 14, color: C.signal, lineHeight: 1.5, margin: '10px 0 0', fontWeight: 600, borderTop: `1px solid ${C.signal}33`, paddingTop: 8 }}>
            ✦ {txt.ventaja}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Planes ────────────────────────────────────────────────────────────────────
type PreciosPorPlan = Record<string, { mensual: number; anual: number }>

function Planes({ conversion, precios }: { conversion: ConversionInfo | null; precios?: PreciosPorPlan }) {
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
    <section id="planes" className="kaltor-section" style={{ padding: '96px 48px', backgroundColor: C.paper }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 56 }}>
          <div>
            <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>{t.planes.kicker}</p>
            <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink }}>{t.planes.title}</h2>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, color: anual ? C.line : C.ink }}>{t.planes.mensual}</span>
            <button
              onClick={() => setAnual(a => !a)}
              style={{ position: 'relative', width: 48, height: 26, borderRadius: 13, backgroundColor: anual ? C.signal : C.line, border: 'none', cursor: 'pointer', transition: 'background-color 0.3s' }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 20, height: 20,
                backgroundColor: '#fff', borderRadius: '50%',
                left: anual ? 25 : 3,
                transition: 'left 0.3s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: 16, color: anual ? C.ink : C.line }}>
              {t.planes.anual} <span style={{ color: C.mod, fontSize: 14 }}>{t.planes.ahorra}</span>
            </span>
          </div>
        </div>

        {/* Familia básico */}
        <FamiliaLabel label={t.planes.familiaBasico} />
        <div className="kaltor-basic-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 368px))', gap: 14, marginBottom: 40, justifyContent: 'center' }}>
          {basic.map(p => <PlanCard key={p.id} plan={p} anual={anual} conversion={conversion} />)}
        </div>

        {/* Familia taller */}
        <FamiliaLabel label={t.planes.familiaTaller} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 40 }}>
          {taller.map(p => <PlanCard key={p.id} plan={p} anual={anual} conversion={conversion} />)}
        </div>

        {/* Multi-tienda */}
        <FamiliaLabel label={t.planes.familiaMulti} />
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
          {multi.map(p => <PlanCard key={p.id} plan={p} anual={anual} conversion={conversion} full />)}
        </div>

        {/* Tabla comparativa */}
        <TablaComparativa anual={anual} conversion={conversion} planes={planesConPrecio} />
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

function PlanCard({ plan, anual, conversion, full = false }: { plan: Plan; anual: boolean; conversion: ConversionInfo | null; full?: boolean }) {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const planTxt = PLANES_TXT[lang][plan.id]
  const [hov, setHov] = useState(false)
  const precio = anual ? plan.precio_anual : plan.precio_mes
  const sufijo = anual ? t.planes.sufijoAnio : t.planes.sufijoMes
  const clpPrimero = !conversion || conversion.tipo === 'uf'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '24px', borderRadius: 16,
        border: `2px solid ${plan.destacado ? C.signal : hov ? C.signal : C.line}`,
        backgroundColor: plan.destacado ? '#FFF7F2' : '#fff',
        transition: 'border-color 0.25s, transform 0.25s',
        transform: hov ? 'translateY(-3px)' : 'none',
        width: full ? '100%' : undefined,
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Badges */}
      {(plan.destacado || plan.hasAddon) && (
        <div style={{ marginBottom: 8 }}>
          {plan.destacado && <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.signal, margin: 0 }}>⬥ {t.planes.masElegido}</p>}
          {plan.hasAddon && planTxt.addon && <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.mod,    margin: 0 }}>⬥ {planTxt.addon}</p>}
        </div>
      )}

      {/* Título centrado */}
      <h3 style={{ fontFamily: FD, fontSize: 23, fontWeight: 700, color: C.ink, marginBottom: 4, textAlign: 'center' }}>{planTxt.nombre}</h3>
      <p style={{ fontSize: 14, color: C.ink, opacity: 0.5, marginBottom: 16, textAlign: 'center' }}>{planTxt.usuarios}</p>

      {/* Precio */}
      <p style={{ marginBottom: conversion ? 4 : 24, textAlign: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: 30, fontWeight: 700, color: C.ink }}>
          {clpPrimero ? clp(precio) : formatConversion(precio, conversion!)}
        </span>
        <span style={{ fontSize: 14, color: C.ink, opacity: 0.45, marginLeft: 4 }}>{sufijo}</span>
      </p>
      {conversion && (
        <p style={{ fontFamily: FM, fontSize: 13, color: C.ink, opacity: 0.45, textAlign: 'center', marginBottom: 24 }}>
          {clpPrimero ? `≈ ${formatConversion(precio, conversion)}` : `${t.planes.cobroReal} ${clp(precio)} CLP`}
        </p>
      )}

      {/* Módulos en 2 columnas — solo los incluidos en el plan */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '2px 20px', marginBottom: 24, alignContent: 'start', overflow: 'hidden' }}>
        {MODULOS.filter(m => plan.modulos.includes(m.key)).map(m => {
          const Icon = HERO_ICONS[m.key]
          const modTxt = MODULOS_TXT[lang][m.key]
          return (
            <div key={m.key} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 0',
              borderBottom: `1px solid ${C.line}1A`,
              minWidth: 0,
              overflow: 'hidden',
            }}>
              <span style={{ color: C.mod, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>✓</span>
              {Icon && (
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: C.signal,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={8} color="#fff" strokeWidth={2.2} />
                </span>
              )}
              <p style={{ fontSize: 11, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.25, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{modTxt.label}</p>
            </div>
          )
        })}
      </div>

      {/* Botón siempre al final */}
      <a href="https://app.kaltorpos.com/registro" style={{
        display: 'block', textAlign: 'center', padding: '11px 0', borderRadius: 8, fontSize: 15, fontWeight: 600,
        textDecoration: 'none', transition: 'all 0.2s',
        backgroundColor: plan.destacado ? C.signal : 'transparent',
        color: plan.destacado ? '#fff' : C.ink,
        border: plan.destacado ? 'none' : `1.5px solid ${C.line}`,
      }}
        onMouseEnter={e => { if (!plan.destacado) e.currentTarget.style.borderColor = C.ink }}
        onMouseLeave={e => { if (!plan.destacado) e.currentTarget.style.borderColor = C.line }}
      >
        {t.planes.comenzarGratis}
      </a>
    </div>
  )
}

// ── Tabla comparativa de planes ───────────────────────────────────────────────
function TablaComparativa({ anual, conversion, planes }: { anual: boolean; conversion: ConversionInfo | null; planes: Plan[] }) {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const tc = t.planes.comparativa
  const clpPrimero = !conversion || conversion.tipo === 'uf'
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
                return (
                <th key={p.id} style={{
                  textAlign: 'center', padding: '12px 6px',
                  color: p.destacado ? C.signal : C.ink,
                  borderLeft: `1px solid ${C.line}44`,
                  minWidth: 100,
                }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{planTxt.nombre}</p>
                  <p style={{ margin: '2px 0 0', fontFamily: FM, fontSize: 12, fontWeight: 400, color: C.ink, opacity: 0.5 }}>
                    {clpPrimero
                      ? `${clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)}${tc.mesSufijo}`
                      : `${formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, conversion!)}${tc.mesSufijo}`}
                  </p>
                  {conversion && (
                    <p style={{ margin: '1px 0 0', fontFamily: FM, fontSize: 11, fontWeight: 400, color: C.ink, opacity: 0.4 }}>
                      {clpPrimero
                        ? `≈ ${formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, conversion)}`
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
              const modTxt = MODULOS_TXT[lang][m.key]
              return (
                <tr key={m.key} style={{ backgroundColor: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {Icon && (
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          backgroundColor: C.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon size={12} color="#fff" strokeWidth={2} />
                        </span>
                      )}
                      <span style={{ fontWeight: 500, color: C.ink }}>{modTxt.label}</span>
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

            {/* Fila usuarios */}
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

            {/* Fila precio / CTA */}
            <tr style={{ borderTop: `2px solid ${C.line}`, backgroundColor: '#fff' }}>
              <td style={{ padding: '16px 12px', fontWeight: 700, color: C.ink }}>{tc.precioMes}</td>
              {planes.map(p => (
                <td key={p.id} style={{ textAlign: 'center', padding: '16px 6px', borderLeft: `1px solid ${C.line}33` }}>
                  <p style={{ margin: conversion ? '0 0 2px' : '0 0 8px', fontFamily: FM, fontWeight: 700, fontSize: 16, color: p.destacado ? C.signal : C.ink }}>
                    {clpPrimero
                      ? clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)
                      : formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, conversion!)}
                  </p>
                  {conversion && (
                    <p style={{ margin: '0 0 8px', fontFamily: FM, fontSize: 11, fontWeight: 400, color: C.ink, opacity: 0.45 }}>
                      {clpPrimero
                        ? `≈ ${formatConversion(anual ? Math.round(p.precio_anual / 12) : p.precio_mes, conversion)}`
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
              ))}
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

// ── Misión y Visión ───────────────────────────────────────────────────────────
function MisionVision() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang].misionVision
  return (
    <section className="kaltor-section" style={{ padding: '96px 48px', backgroundColor: C.navy, color: C.paper }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Frase central */}
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 24, textAlign: 'center' }}>
          {t.kicker}
        </p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 700, lineHeight: 1.2, color: C.paper, textAlign: 'center', marginBottom: 64 }}>
          {t.titleLine1}<br />
          {t.titlePre2}<span style={{ color: C.signal }}>{t.titleHighlight}</span>
        </h2>

        {/* Misión + Visión */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>

          {/* Misión */}
          <div style={{
            padding: '40px 48px',
            borderRadius: '20px 0 0 20px',
            backgroundColor: '#ffffff08',
            borderRight: `1px solid #ffffff12`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: C.signal,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Target size={18} color="#fff" strokeWidth={2} />
              </span>
              <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, margin: 0 }}>{t.misionLabel}</p>
            </div>
            <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: C.paper, marginBottom: 16, lineHeight: 1.3 }}>
              {t.misionTitle}
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: C.paper, opacity: 0.65, margin: 0 }}>
              {t.misionText}
            </p>
          </div>

          {/* Visión */}
          <div style={{
            padding: '40px 48px',
            borderRadius: '0 20px 20px 0',
            backgroundColor: '#ffffff05',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: C.mod,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <TrendingUp size={18} color="#fff" strokeWidth={2} />
              </span>
              <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.mod, margin: 0 }}>{t.visionLabel}</p>
            </div>
            <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: C.paper, marginBottom: 16, lineHeight: 1.3 }}>
              {t.visionTitle}
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: C.paper, opacity: 0.65, margin: 0 }}>
              {t.visionText}
            </p>
          </div>

        </div>

        {/* Línea divisoria + cifra de impacto */}
        <div style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid #ffffff12', display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap', textAlign: 'center' }}>
          {t.stats.map(item => (
            <div key={item.label}>
              <p style={{ fontFamily: FD, fontSize: 48, fontWeight: 700, color: C.signal, margin: 0, lineHeight: 1 }}>{item.valor}</p>
              <p style={{ fontSize: 14, color: C.paper, opacity: 0.45, marginTop: 6 }}>{item.label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

// ── Para quién es Kaltor ─────────────────────────────────────────────────────
const NEGOCIO_ICONS = [Wrench, Store, Package, Truck, Building2]
const FACIL_ICONS = [Globe, Zap, Users]

function ParaQuienEs() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang].paraQuienEs

  return (
    <section className="kaltor-section" style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>
          {t.kicker}
        </p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink, marginBottom: 8 }}>
          {t.title}
        </h2>
        <p style={{ fontSize: 20, color: C.ink, opacity: 0.6, marginBottom: 48, maxWidth: 620 }}>
          {t.subtitle}
        </p>

        {/* Grid de tipos de negocio */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 56 }}>
          {t.negocios.map(({ titulo, texto }, i) => {
            const Icon = NEGOCIO_ICONS[i]
            return (
            <div key={titulo} style={{
              padding: '24px 22px', borderRadius: 14,
              border: `1px solid ${C.line}`, backgroundColor: C.paper,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: C.signal,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Icon size={20} color="#fff" strokeWidth={1.8} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{titulo}</h3>
              <p style={{ fontSize: 15, color: C.ink, opacity: 0.55, lineHeight: 1.5, margin: 0 }}>{texto}</p>
            </div>
            )
          })}
        </div>

        {/* Fácil de usar */}
        <div style={{
          padding: '36px 40px', borderRadius: 18,
          backgroundColor: C.navy,
          display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: C.paper, margin: 0, flexShrink: 0 }}>
            {t.facilTitle1}<br />{t.facilTitle2}
          </p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', flex: 1 }}>
            {t.facil.map(({ texto }, i) => {
              const Icon = FACIL_ICONS[i]
              return (
              <div key={texto} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
                <Icon size={18} color={C.signal} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 15, color: C.paper, opacity: 0.75, margin: 0, lineHeight: 1.4 }}>{texto}</p>
              </div>
              )
            })}
          </div>
        </div>

        {/* Recomendación sutil */}
        <p style={{ textAlign: 'center', fontSize: 17, color: C.ink, opacity: 0.65, marginTop: 40, lineHeight: 1.6 }}>
          {t.recomendacionPre}<strong style={{ opacity: 1 }}>{t.recomendacionBold}</strong>.{' '}
          <a href="#planes" style={{ color: C.signal, fontWeight: 600, textDecoration: 'none' }}>{t.recomendacionLink}</a>
        </p>
      </div>
    </section>
  )
}

// ── Ventajas / Por qué usar Kaltor ───────────────────────────────────────────
const VENTAJA_ICONS = [Eye, Users, AlertTriangle, Zap, SlidersHorizontal, Globe]
const VENTAJA_ACCENTS = [C.signal, C.mod, '#e8604c', C.signal, C.mod, C.signal]

function VentajasKaltor() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang].ventajasKaltor

  return (
    <section className="kaltor-section" style={{ padding: '96px 48px', backgroundColor: '#080F16' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Cabecera */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 72px' }}>
          <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#e8604c', marginBottom: 20 }}>
            {t.kicker}
          </p>
          <h2 style={{ fontFamily: FD, fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 700, lineHeight: 1.2, color: C.paper, marginBottom: 24 }}>
            {t.titleLine1}<br />
            <span style={{ color: C.signal }}>{t.titleHighlight}</span>
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: C.paper, opacity: 0.55 }}>
            {t.subtitle}
          </p>
        </div>

        {/* Grid de ventajas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16, marginBottom: 72 }}>
          {t.items.map(({ titulo, texto }, i) => {
            const Icon = VENTAJA_ICONS[i]
            const accent = VENTAJA_ACCENTS[i]
            return (
            <div key={titulo} style={{
              padding: '32px 28px',
              borderRadius: 16,
              backgroundColor: '#ffffff06',
              border: '1px solid #ffffff0D',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: `${accent}20`,
                border: `1px solid ${accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Icon size={20} color={accent} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: C.paper, marginBottom: 12, lineHeight: 1.3 }}>
                {titulo}
              </h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: C.paper, opacity: 0.6, margin: 0 }}>
                {texto}
              </p>
            </div>
            )
          })}
        </div>

        {/* CTA final */}
        <div style={{ textAlign: 'center', padding: '48px', borderRadius: 20, backgroundColor: '#ffffff06', border: '1px solid #ffffff0D' }}>
          <p style={{ fontFamily: FD, fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: C.paper, marginBottom: 10 }}>
            {t.ctaTitle}
          </p>
          <p style={{ fontSize: 16, color: C.paper, opacity: 0.5, marginBottom: 32 }}>
            {t.ctaSubtitle}
          </p>
          <a href="https://app.kaltorpos.com/registro" style={{
            display: 'inline-block', padding: '16px 40px', borderRadius: 12,
            backgroundColor: C.signal, color: '#fff',
            fontWeight: 700, fontSize: 16, textDecoration: 'none',
            boxShadow: `0 0 32px ${C.signal}55`,
          }}>
            {t.ctaButton}
          </a>
        </div>

      </div>
    </section>
  )
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────
function ComoFunciona() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang].comoFunciona
  return (
    <section id="contacto" className="kaltor-section" style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>{t.kicker}</p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink, marginBottom: 56 }}>{t.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
          {t.pasos.map((p, i) => {
            const num = ['01', '02', '03'][i]
            return (
            <div key={num}>
              <span style={{ fontFamily: FM, fontSize: 46, fontWeight: 700, color: C.line, display: 'block', marginBottom: 16 }}>{num}</span>
              <h3 style={{ fontSize: 21, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{p.titulo}</h3>
              <p style={{ fontSize: 17, color: C.ink, opacity: 0.6, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const links: [string, string][] = [[t.nav.modulos, '#modulos'], [t.nav.planes, '#planes'], [t.footer.entrar, '/login']]
  return (
    <footer className="kaltor-footer" style={{ padding: '64px 48px 40px', backgroundColor: C.navy, color: C.paper }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 40 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kaltor-logo.svg" alt="Kaltor" style={{ height: 44, filter: 'brightness(0) invert(1)' }} />
          </a>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {links.map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 15, color: C.paper, opacity: 0.5, textDecoration: 'none', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Iconos decorativos */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap', opacity: 0.28 }}>
          {MODULOS.map(m => {
            const Icon = HERO_ICONS[m.key]
            return Icon ? (
              <span key={m.key} style={{
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: C.signal,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={13} color="#fff" strokeWidth={2} />
              </span>
            ) : null
          })}
        </div>

        <div style={{ borderTop: `1px solid #ffffff15`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 14, opacity: 0.35 }}>© {new Date().getFullYear()} Kaltor · kaltorpos.com</p>
          <p style={{ fontSize: 14, opacity: 0.35 }}>{t.footer.footnoteClp}</p>
        </div>
      </div>
    </footer>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function LandingPage({ conversion = null, lang: initialLang = 'es', precios }: { conversion?: ConversionInfo | null; lang?: Lang; precios?: PreciosPorPlan }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = LANDING_TXT[lang]
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: C.paper, color: C.ink }}>
        <style>{`
          @keyframes popupIn {
            from { opacity: 0; transform: translateX(-50%) translateY(6px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          @media (max-width: 700px) {
            .kaltor-nav { padding: 0 16px !important; }
            .kaltor-nav-links { display: none !important; }
            .kaltor-section { padding: 56px 20px !important; }
            .kaltor-footer { padding: 40px 20px 24px !important; }
            .kaltor-basic-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <Nav />
        <Hero />
        <ParaQuienEs />
        <VentajasKaltor />
        <Modulos />
        <MisionVision />
        <Planes conversion={conversion} precios={precios} />
        <ComoFunciona />
        <Footer />
        <ChatWidget
          context="landing"
          welcomeMessage={t.chat.welcome}
          placeholder={t.chat.placeholder}
        />
      </div>
    </LangContext.Provider>
  )
}
