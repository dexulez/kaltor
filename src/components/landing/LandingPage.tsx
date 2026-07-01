'use client'

import { useState, useEffect } from 'react'

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  paper:  '#F5F6F4',
  ink:    '#12181F',
  line:   '#C9CFC7',
  signal: '#FF7A1A',
  mod:    '#2FB673',
  navy:   '#101826',
}
const FD = 'var(--font-display, "Space Grotesk", sans-serif)'
const FM = 'var(--font-mono, "JetBrains Mono", monospace)'

// ── Datos ─────────────────────────────────────────────────────────────────────
const MODULOS = [
  { code: 'MOD-01', key: 'inventory',   abbr: 'INV', label: 'Inventario',   desc: 'Control de stock, movimientos, alertas de bajo inventario y valorización.' },
  { code: 'MOD-02', key: 'purchases',   abbr: 'COM', label: 'Compras',       desc: 'Órdenes de compra, proveedores, recepciones y pagos a proveedores.' },
  { code: 'MOD-03', key: 'sales',       abbr: 'VTA', label: 'Ventas',        desc: 'Punto de venta, cotizaciones, facturas y seguimiento de cobranza.' },
  { code: 'MOD-04', key: 'repair_shop', abbr: 'TAL', label: 'Taller',        desc: 'Órdenes de trabajo, seguimiento de reparaciones y etiquetas térmicas.' },
  { code: 'MOD-05', key: 'reports',     abbr: 'INF', label: 'Informes',      desc: 'Dashboard financiero, punto de equilibrio e informes exportables.' },
  { code: 'MOD-06', key: 'hr',          abbr: 'RRH', label: 'RRHH',          desc: 'Gestión de personal, liquidaciones y control de asistencia.' },
  { code: 'MOD-07', key: 'accounting',  abbr: 'CTB', label: 'Contabilidad',  desc: 'Libro de ingresos/egresos, IVA, PPM y cierre mensual.' },
  { code: 'MOD-08', key: 'manuals',     abbr: 'MAN', label: 'Manuales',      desc: 'Base de conocimiento técnico e integración con iFixit para reparaciones.' },
  { code: 'MOD-09', key: 'multi_store', abbr: 'MTI', label: 'Multi-tienda',  desc: 'Múltiples sucursales con reportes consolidados.' },
]

type Plan = {
  nombre: string
  precio_mes: number
  precio_anual: number
  usuarios: string
  modulos: string[]
  familia: string
  destacado: boolean
  addon?: string
}

const PLANES: Plan[] = [
  { nombre: 'Básico',              precio_mes: 14990, precio_anual: 149900, usuarios: '1 usuario · 1 sesión',       modulos: ['inventory','purchases','sales'],                                                                  familia: 'básico',       destacado: false },
  { nombre: 'Pro',                 precio_mes: 23990, precio_anual: 239900, usuarios: 'Multiusuario',                modulos: ['inventory','purchases','sales','reports','hr','accounting','manuals'],                          familia: 'básico',       destacado: false },
  { nombre: 'Taller Básico',       precio_mes: 19990, precio_anual: 199900, usuarios: '1 usuario · 1 sesión',       modulos: ['inventory','purchases','sales','repair_shop'],                                                    familia: 'taller',       destacado: false },
  { nombre: 'Taller Básico 5U',    precio_mes: 29990, precio_anual: 299900, usuarios: 'Hasta 5 usuarios',            modulos: ['inventory','purchases','sales','repair_shop'],                                                    familia: 'taller',       destacado: true  },
  { nombre: 'Taller Multiusuario', precio_mes: 36990, precio_anual: 369900, usuarios: 'Usuarios ilimitados',         modulos: ['inventory','purchases','sales','repair_shop'],                                                    familia: 'taller',       destacado: false },
  { nombre: 'Taller Pro',          precio_mes: 44990, precio_anual: 449900, usuarios: 'Multiusuario',                modulos: ['inventory','purchases','sales','repair_shop','reports','hr','accounting','manuals'],             familia: 'taller',       destacado: false },
  { nombre: 'Taller Multi-tienda', precio_mes: 84990, precio_anual: 849900, usuarios: 'Multi-usuario · Multi-sucursal', modulos: ['inventory','purchases','sales','repair_shop','reports','hr','accounting','manuals','multi_store'], familia: 'multi-tienda', destacado: false, addon: 'Incluye B2B Wholesale' },
]

function clp(n: number) { return `$${n.toLocaleString('es-CL')}` }

// ── Switch ────────────────────────────────────────────────────────────────────
function Switch({ on, code, color = 'signal', size = 'md', dimCode = false }: {
  on: boolean; code: string; color?: 'signal' | 'mod'; size?: 'sm' | 'md' | 'lg'; dimCode?: boolean
}) {
  const c    = color === 'signal' ? C.signal : C.mod
  const wh   = size === 'sm' ? 18 : size === 'lg' ? 40 : 28
  const dWh  = size === 'sm' ? 6  : size === 'lg' ? 16 : 10
  const fs   = size === 'sm' ? 8  : size === 'lg' ? 11 : 9

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

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: 64,
      backgroundColor: C.paper,
      borderBottom: `1px solid ${scrolled ? C.line : 'transparent'}`,
      transition: 'border-color 0.3s',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.signal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M9 2L3 9h5l-1 5 6-7H8l1-5z" fill="white" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>Kaltor</span>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {[['Módulos', '#modulos'], ['Planes', '#planes'], ['Contacto', '#contacto']].map(([label, href]) => (
          <a key={label} href={href} style={{ fontSize: 14, color: C.ink, textDecoration: 'none', opacity: 0.7, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
            {label}
          </a>
        ))}
        <a href="/login" style={{
          padding: '8px 18px', borderRadius: 8, backgroundColor: C.signal, color: '#fff',
          fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          Entrar →
        </a>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const [lit, setLit] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setLit(9); return }
    if (lit >= 9) return
    const t = setTimeout(() => setLit(l => l + 1), 130)
    return () => clearTimeout(t)
  }, [lit])

  return (
    <section style={{ minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', backgroundColor: C.paper }}>
      <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 24 }}>
        Sistema de gestión modular
      </p>

      <h1 style={{ fontFamily: FD, fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 700, lineHeight: 1.1, color: C.ink, marginBottom: 20, maxWidth: 800 }}>
        El sistema que enciendes<br />
        <span style={{ color: C.signal }}>módulo por módulo.</span>
      </h1>

      <p style={{ fontSize: 18, color: C.ink, opacity: 0.6, maxWidth: 560, marginBottom: 40, lineHeight: 1.6 }}>
        Ventas, inventario, compras, taller — paga solo por lo que tu negocio usa.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="#planes" style={{
          padding: '14px 32px', borderRadius: 12, backgroundColor: C.signal, color: '#fff',
          fontWeight: 600, fontSize: 16, textDecoration: 'none', transition: 'transform 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
          Ver planes
        </a>
        <a href="#modulos" style={{
          padding: '14px 32px', borderRadius: 12, border: `2px solid ${C.line}`,
          color: C.ink, fontWeight: 600, fontSize: 16, textDecoration: 'none', transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.ink)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.line)}>
          Cómo funciona
        </a>
      </div>

      {/* Panel de interruptores */}
      <div style={{
        padding: '28px 36px', borderRadius: 20,
        border: `1px solid ${C.line}`, backgroundColor: '#fff',
        boxShadow: '0 4px 32px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 20 }}>
          {MODULOS.map((m, i) => (
            <Switch key={m.key} on={i < lit} code={m.abbr} color="signal" size="lg" />
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Módulos ───────────────────────────────────────────────────────────────────
function Modulos() {
  return (
    <section id="modulos" style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Módulos</p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: C.ink, marginBottom: 8 }}>Nueve módulos.</h2>
        <p style={{ fontSize: 17, color: C.ink, opacity: 0.6, marginBottom: 56, maxWidth: 560 }}>
          Enciende los que tu negocio necesita hoy, agrega el resto cuando lo necesites.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {MODULOS.map(m => (
            <ModuloCard key={m.key} m={m} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ModuloCard({ m }: { m: typeof MODULOS[0] }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '20px 24px', borderRadius: 14,
        border: `2px solid ${hov ? C.signal : C.line}`,
        backgroundColor: C.paper,
        display: 'flex', gap: 16, alignItems: 'flex-start',
        transition: 'border-color 0.25s, transform 0.25s',
        transform: hov ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <Switch on={true} code={m.abbr} color="signal" size="md" />
      </div>
      <div>
        <span style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.line, display: 'block', marginBottom: 4 }}>{m.code}</span>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{m.label}</h3>
        <p style={{ fontSize: 13, color: C.ink, opacity: 0.55, lineHeight: 1.5 }}>{m.desc}</p>
      </div>
    </div>
  )
}

// ── Planes ────────────────────────────────────────────────────────────────────
function Planes() {
  const [anual, setAnual] = useState(false)
  const basic  = PLANES.filter(p => p.familia === 'básico')
  const taller = PLANES.filter(p => p.familia === 'taller')
  const multi  = PLANES.filter(p => p.familia === 'multi-tienda')

  return (
    <section id="planes" style={{ padding: '96px 48px', backgroundColor: C.paper }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 56 }}>
          <div>
            <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Planes</p>
            <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: C.ink }}>Elige tu plan.</h2>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: anual ? C.line : C.ink }}>Mensual</span>
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
            <span style={{ fontSize: 14, color: anual ? C.ink : C.line }}>
              Anual <span style={{ color: C.mod, fontSize: 12 }}>· ahorra 2 meses</span>
            </span>
          </div>
        </div>

        {/* Familia básico */}
        <FamiliaLabel label="Familia básico" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 40 }}>
          {basic.map(p => <PlanCard key={p.nombre} plan={p} anual={anual} />)}
        </div>

        {/* Familia taller */}
        <FamiliaLabel label="Familia taller" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 40 }}>
          {taller.map(p => <PlanCard key={p.nombre} plan={p} anual={anual} />)}
        </div>

        {/* Multi-tienda */}
        <FamiliaLabel label="Multi-sucursal" />
        <div>
          {multi.map(p => <PlanCard key={p.nombre} plan={p} anual={anual} full />)}
        </div>

        <p style={{ fontSize: 12, color: C.ink, opacity: 0.35, textAlign: 'center', marginTop: 24 }}>
          Precios en CLP · IVA no incluido
        </p>
      </div>
    </section>
  )
}

function FamiliaLabel({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.ink, opacity: 0.35, marginBottom: 14 }}>
      {label}
    </p>
  )
}

function PlanCard({ plan, anual, full = false }: { plan: Plan; anual: boolean; full?: boolean }) {
  const [hov, setHov] = useState(false)
  const precio = anual ? plan.precio_anual : plan.precio_mes
  const sufijo = anual ? '/año + IVA' : '/mes + IVA'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '22px 24px', borderRadius: 16,
        border: `2px solid ${plan.destacado ? C.signal : hov ? C.signal : C.line}`,
        backgroundColor: plan.destacado ? '#FFF7F2' : '#fff',
        transition: 'border-color 0.25s, transform 0.25s',
        transform: hov ? 'translateY(-3px)' : 'none',
        width: full ? '100%' : undefined,
        boxSizing: 'border-box',
      }}
    >
      {plan.destacado && (
        <p style={{ fontFamily: FM, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.signal, marginBottom: 8 }}>⬥ Más elegido</p>
      )}
      {plan.addon && (
        <p style={{ fontFamily: FM, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.mod, marginBottom: 8 }}>⬥ {plan.addon}</p>
      )}

      <h3 style={{ fontFamily: FD, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{plan.nombre}</h3>
      <p style={{ fontSize: 12, color: C.ink, opacity: 0.5, marginBottom: 16 }}>{plan.usuarios}</p>

      <p style={{ marginBottom: 20 }}>
        <span style={{ fontFamily: FM, fontSize: 28, fontWeight: 700, color: C.ink }}>{clp(precio)}</span>
        <span style={{ fontSize: 12, color: C.ink, opacity: 0.45, marginLeft: 4 }}>{sufijo}</span>
      </p>

      {/* Switches de módulos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {MODULOS.map(m => (
          <Switch key={m.key} on={plan.modulos.includes(m.key)} code={m.abbr} color="mod" size="sm" />
        ))}
      </div>

      <a href="/login" style={{
        display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
        textDecoration: 'none', transition: 'all 0.2s',
        backgroundColor: plan.destacado ? C.signal : 'transparent',
        color: plan.destacado ? '#fff' : C.ink,
        border: plan.destacado ? 'none' : `1.5px solid ${C.line}`,
      }}
        onMouseEnter={e => { if (!plan.destacado) e.currentTarget.style.borderColor = C.ink }}
        onMouseLeave={e => { if (!plan.destacado) e.currentTarget.style.borderColor = C.line }}
      >
        Comenzar
      </a>
    </div>
  )
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────
function ComoFunciona() {
  const pasos = [
    { num: '01', titulo: 'Elige tu plan',       desc: 'Selecciona el plan que calce con tu negocio hoy. Puedes cambiar o escalar cuando lo necesites.' },
    { num: '02', titulo: 'Enciende tus módulos', desc: 'Activa exactamente los módulos que usas. Cada uno es un interruptor: lo prendes, lo apagas.' },
    { num: '03', titulo: 'Empieza a operar',     desc: 'Accede desde cualquier dispositivo, sin instalar nada. Tu equipo listo para trabajar en minutos.' },
  ]
  return (
    <section id="contacto" style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Cómo funciona</p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: C.ink, marginBottom: 56 }}>Tres pasos para empezar.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
          {pasos.map(p => (
            <div key={p.num}>
              <span style={{ fontFamily: FM, fontSize: 40, fontWeight: 700, color: C.line, display: 'block', marginBottom: 16 }}>{p.num}</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{p.titulo}</h3>
              <p style={{ fontSize: 15, color: C.ink, opacity: 0.6, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ padding: '64px 48px 40px', backgroundColor: C.navy, color: C.paper }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: C.signal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M9 2L3 9h5l-1 5 6-7H8l1-5z" fill="white" />
              </svg>
            </div>
            <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 700 }}>Kaltor</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['Módulos', '#modulos'], ['Planes', '#planes'], ['Entrar', '/login']].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 13, color: C.paper, opacity: 0.5, textDecoration: 'none', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Mini switches decorativos */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, opacity: 0.15 }}>
          {MODULOS.map(m => (
            <Switch key={m.key} on={true} code="" color="signal" size="sm" />
          ))}
        </div>

        <div style={{ borderTop: `1px solid #ffffff15`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 12, opacity: 0.35 }}>© {new Date().getFullYear()} Kaltor · kaltorpos.com</p>
          <p style={{ fontSize: 12, opacity: 0.35 }}>Precios en CLP · IVA no incluido</p>
        </div>
      </div>
    </footer>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: C.paper, color: C.ink }}>
      <Nav />
      <Hero />
      <Modulos />
      <Planes />
      <ComoFunciona />
      <Footer />
    </div>
  )
}
