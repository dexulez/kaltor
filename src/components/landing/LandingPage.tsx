'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Building2, Package, Wrench, Hammer, BarChart2, Receipt, Store, Settings, BookOpen, Banknote, Truck, Target, TrendingUp, Eye, AlertTriangle, Zap, SlidersHorizontal, Globe, Users } from 'lucide-react'
import ChatWidget from '@/components/chat/ChatWidget'

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
const MODULOS = [
  { code: 'MOD-01', key: 'ventas',        abbr: 'VTA', icon: '💰', label: 'Ventas',        desc: 'Caja, punto de venta, clientes y venta directa desde cualquier dispositivo.',             ventaja: 'Cobra en segundos con POS táctil. Boleta y factura integradas, sin papeleos.' },
  { code: 'MOD-02', key: 'compras',       abbr: 'COM', icon: '🏭', label: 'Compras',       desc: 'Órdenes de compra, proveedores, recepciones y control de pagos pendientes.',             ventaja: 'Nunca pierdas trazabilidad de un pago. Cada OC, recepción y abono en un solo lugar.' },
  { code: 'MOD-03', key: 'productos',     abbr: 'INV', icon: '📦', label: 'Inventario',    desc: 'Control de stock, movimientos, alertas de quiebre y valorización.',                       ventaja: 'Stock en tiempo real. Alertas automáticas antes de quedarte sin mercadería.' },
  { code: 'MOD-04', key: 'servicios',     abbr: 'SVC', icon: '🔩', label: 'Servicios',     desc: 'Catálogo de servicios del taller con precios y tiempos estándar.',                       ventaja: 'Cotiza cualquier reparación en segundos con precios y tiempos predefinidos.' },
  { code: 'MOD-05', key: 'taller',        abbr: 'TAL', icon: '🔧', label: 'Taller',        desc: 'Órdenes de trabajo, seguimiento de reparaciones y etiquetas térmicas.',                   ventaja: 'Desde la recepción hasta la entrega. El cliente sabe en qué etapa está su equipo.' },
  { code: 'MOD-06', key: 'informes',      abbr: 'INF', icon: '📈', label: 'Informes',      desc: 'Dashboard financiero, punto de equilibrio e informes exportables a Excel.',               ventaja: 'Ve la rentabilidad de tu negocio en un vistazo. Exporta a Excel con un clic.' },
  { code: 'MOD-07', key: 'contabilidad',  abbr: 'CTB', icon: '🧾', label: 'Contabilidad',  desc: 'Libro de ingresos/egresos, IVA, PPM y preparación de declaraciones.',                    ventaja: 'IVA y PPM calculados automáticamente. Tu contador agradecerá el orden.' },
  { code: 'MOD-08', key: 'canal_b2b',     abbr: 'B2B', icon: '🛍️', label: 'Canal B2B',     desc: 'Catálogo mayorista para compradores externos con pedidos y precios diferenciados.',      ventaja: 'Vende al por mayor con precios exclusivos por cliente. Tu catálogo, siempre actualizado.' },
  { code: 'MOD-09', key: 'configuracion',  abbr: 'CFG', icon: '⚙️', label: 'Configuración',  desc: 'Usuarios, roles, permisos y ajustes generales del sistema.',                                                         ventaja: 'Permisos finos por módulo y acción. Cada usuario ve solo lo que necesita.' },
  { code: 'MOD-10', key: 'manuales',       abbr: 'MAN', icon: '🧠', label: 'Manuales',       desc: 'Base de conocimiento para reparaciones con guías paso a paso y tiempos estándar por modelo y falla.',           ventaja: 'Tu equipo resuelve fallas complejas sin depender de un solo técnico. Saber colectivo.' },
  { code: 'MOD-11', key: 'conciliaciones', abbr: 'BNK', icon: '🏦', label: 'Conciliaciones',  desc: 'Conciliación bancaria: cruza movimientos de caja con el extracto del banco y detecta diferencias.',            ventaja: 'Detecta diferencias antes de cerrar el mes. Sin sorpresas al enfrentar la contabilidad.' },
  { code: 'MOD-12', key: 'trazabilidad',   abbr: 'TRZ', icon: '📍', label: 'Trazabilidad',   desc: 'Seguimiento de compra y venta de mercancía: desde el proveedor de origen hasta la venta final al cliente.',    ventaja: 'Sabe exactamente de dónde viene cada producto y adónde fue. Auditoría y control total.' },
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
  { nombre: 'Básico',              precio_mes: 14990, precio_anual: 149900, usuarios: '1 usuario · 1 sesión',           modulos: ['ventas','compras','productos','informes','trazabilidad','configuracion'],                                                                                 familia: 'básico',       destacado: false },
  { nombre: 'Pro',                 precio_mes: 23990, precio_anual: 239900, usuarios: 'Multiusuario',                    modulos: ['ventas','compras','productos','informes','contabilidad','conciliaciones','trazabilidad','configuracion'],                                             familia: 'básico',       destacado: false },
  { nombre: 'Taller Básico',       precio_mes: 19990, precio_anual: 199900, usuarios: '1 usuario · 1 sesión',           modulos: ['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion'],                                                        familia: 'taller',       destacado: false },
  { nombre: 'Taller Básico 5U',    precio_mes: 29990, precio_anual: 299900, usuarios: 'Hasta 5 usuarios',                modulos: ['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion'],                                                        familia: 'taller',       destacado: true  },
  { nombre: 'Taller Multiusuario', precio_mes: 36990, precio_anual: 369900, usuarios: 'Usuarios ilimitados',             modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','trazabilidad','configuracion'],                              familia: 'taller',       destacado: false },
  { nombre: 'Taller Pro',          precio_mes: 44990, precio_anual: 449900, usuarios: 'Multiusuario + informes',         modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','conciliaciones','trazabilidad','configuracion'],             familia: 'taller',       destacado: false },
  { nombre: 'Taller Multi-tienda', precio_mes: 84990, precio_anual: 849900, usuarios: 'Multi-usuario · Multi-sucursal', modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','canal_b2b','manuales','conciliaciones','trazabilidad','configuracion'], familia: 'multi-tienda', destacado: false, addon: 'Incluye Canal B2B' },
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
        {(hov || isOpen) ? m.label : m.abbr}
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
              <p style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, margin: 0, color: C.paper }}>{m.label}</p>
              <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.signal, margin: 0 }}>{m.abbr}</p>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.82, margin: 0 }}>{m.ventaja}</p>
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
        Haz clic en cualquier módulo para saber más
      </p>
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
      <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kaltor-logo.svg" alt="Kaltor" style={{ height: 52 }} />
      </a>

      {/* Links */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {[['Módulos', '#modulos'], ['Planes', '#planes'], ['Contacto', '#contacto']].map(([label, href]) => (
          <a key={label} href={href} style={{ fontSize: 16, color: C.ink, textDecoration: 'none', opacity: 0.7, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
            {label}
          </a>
        ))}
        <a href="/login" style={{
          padding: '8px 18px', borderRadius: 8, backgroundColor: C.signal, color: '#fff',
          fontSize: 16, fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s',
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
    if (reduced) { setLit(12); return }
    if (lit >= 12) return
    const t = setTimeout(() => setLit(l => l + 1), 130)
    return () => clearTimeout(t)
  }, [lit])

  return (
    <section style={{ minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', backgroundColor: C.paper }}>
      <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 24 }}>
        Sistema de gestión modular
      </p>

      <h1 style={{ fontFamily: FD, fontSize: 'clamp(46px, 7vw, 83px)', fontWeight: 700, lineHeight: 1.1, color: C.ink, marginBottom: 20, maxWidth: 800 }}>
        El sistema que enciendes<br />
        <span style={{ color: C.signal }}>módulo por módulo.</span>
      </h1>

      <p style={{ fontSize: 21, color: C.ink, opacity: 0.6, maxWidth: 560, marginBottom: 40, lineHeight: 1.6 }}>
        Ventas, inventario, compras, taller — paga solo por lo que tu negocio usa.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="https://app.kaltorpos.com/registro" style={{
          padding: '14px 32px', borderRadius: 12, backgroundColor: C.signal, color: '#fff',
          fontWeight: 600, fontSize: 18, textDecoration: 'none', transition: 'transform 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
          Comenzar gratis →
        </a>
        <a href="#planes" style={{
          padding: '14px 32px', borderRadius: 12, border: `2px solid ${C.line}`,
          color: C.ink, fontWeight: 600, fontSize: 18, textDecoration: 'none', transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.ink)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.line)}>
          Ver planes
        </a>
      </div>

      {/* Panel interactivo de módulos */}
      <HeroModuloPanel lit={lit} />
    </section>
  )
}

// ── Módulos ───────────────────────────────────────────────────────────────────
function Modulos() {
  return (
    <section id="modulos" style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Módulos</p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink, marginBottom: 8 }}>{MODULOS.length} módulos de negocio.</h2>
        <p style={{ fontSize: 20, color: C.ink, opacity: 0.6, marginBottom: 56, maxWidth: 560 }}>
          Activa los que tu empresa necesita hoy. Cada módulo es independiente — si no lo usas, no lo pagas.
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
        <h3 style={{ fontSize: 17, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{m.label}</h3>
        <p style={{ fontSize: 15, color: C.ink, opacity: 0.55, lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
        {hov && (
          <p style={{ fontSize: 14, color: C.signal, lineHeight: 1.5, margin: '10px 0 0', fontWeight: 600, borderTop: `1px solid ${C.signal}33`, paddingTop: 8 }}>
            ✦ {m.ventaja}
          </p>
        )}
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
            <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Planes</p>
            <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink }}>Elige tu plan.</h2>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, color: anual ? C.line : C.ink }}>Mensual</span>
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
              Anual <span style={{ color: C.mod, fontSize: 14 }}>· ahorra 2 meses</span>
            </span>
          </div>
        </div>

        {/* Familia básico */}
        <FamiliaLabel label="Familia básico" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 368px))', gap: 14, marginBottom: 40, justifyContent: 'center' }}>
          {basic.map(p => <PlanCard key={p.nombre} plan={p} anual={anual} />)}
        </div>

        {/* Familia taller */}
        <FamiliaLabel label="Familia taller" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 40 }}>
          {taller.map(p => <PlanCard key={p.nombre} plan={p} anual={anual} />)}
        </div>

        {/* Multi-tienda */}
        <FamiliaLabel label="Multi-sucursal" />
        <div style={{ maxWidth: '50%', margin: '0 auto' }}>
          {multi.map(p => <PlanCard key={p.nombre} plan={p} anual={anual} full />)}
        </div>

        {/* Tabla comparativa */}
        <TablaComparativa anual={anual} />
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

function PlanCard({ plan, anual, full = false }: { plan: Plan; anual: boolean; full?: boolean }) {
  const [hov, setHov] = useState(false)
  const precio = anual ? plan.precio_anual : plan.precio_mes
  const sufijo = anual ? '/año + IVA' : '/mes + IVA'

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
      {(plan.destacado || plan.addon) && (
        <div style={{ marginBottom: 8 }}>
          {plan.destacado && <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.signal, margin: 0 }}>⬥ Más elegido</p>}
          {plan.addon    && <p style={{ fontFamily: FM, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.mod,    margin: 0 }}>⬥ {plan.addon}</p>}
        </div>
      )}

      {/* Título centrado */}
      <h3 style={{ fontFamily: FD, fontSize: 23, fontWeight: 700, color: C.ink, marginBottom: 4, textAlign: 'center' }}>{plan.nombre}</h3>
      <p style={{ fontSize: 14, color: C.ink, opacity: 0.5, marginBottom: 16, textAlign: 'center' }}>{plan.usuarios}</p>

      {/* Precio */}
      <p style={{ marginBottom: 24, textAlign: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: 30, fontWeight: 700, color: C.ink }}>{clp(precio)}</span>
        <span style={{ fontSize: 14, color: C.ink, opacity: 0.45, marginLeft: 4 }}>{sufijo}</span>
      </p>

      {/* Módulos en 2 columnas — solo los incluidos en el plan */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '2px 20px', marginBottom: 24, alignContent: 'start', justifyContent: 'center', overflow: 'hidden' }}>
        {MODULOS.filter(m => plan.modulos.includes(m.key)).map(m => {
          const Icon = HERO_ICONS[m.key]
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
              <p style={{ fontSize: 11, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.25, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</p>
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
        Comenzar gratis
      </a>
    </div>
  )
}

// ── Tabla comparativa de planes ───────────────────────────────────────────────
function TablaComparativa({ anual }: { anual: boolean }) {
  return (
    <div style={{ marginTop: 72, paddingTop: 48, borderTop: `2px solid ${C.line}` }}>
      <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Comparativa</p>
      <h3 style={{ fontFamily: FD, fontSize: 'clamp(25px, 3.45vw, 37px)', fontWeight: 700, color: C.ink, marginBottom: 32 }}>Todos los planes, de un vistazo.</h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 780 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.line}` }}>
              <th style={{ textAlign: 'left', padding: '12px 12px', fontWeight: 600, color: C.ink, opacity: 0.45, minWidth: 140 }}>Módulo</th>
              {PLANES.map(p => (
                <th key={p.nombre} style={{
                  textAlign: 'center', padding: '12px 6px',
                  color: p.destacado ? C.signal : C.ink,
                  borderLeft: `1px solid ${C.line}44`,
                  minWidth: 100,
                }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{p.nombre}</p>
                  <p style={{ margin: '2px 0 0', fontFamily: FM, fontSize: 12, fontWeight: 400, color: C.ink, opacity: 0.5 }}>
                    {clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)}/mes
                  </p>
                </th>
              ))}
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
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          backgroundColor: C.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon size={12} color="#fff" strokeWidth={2} />
                        </span>
                      )}
                      <span style={{ fontWeight: 500, color: C.ink }}>{m.label}</span>
                    </div>
                  </td>
                  {PLANES.map(p => (
                    <td key={p.nombre} style={{ textAlign: 'center', padding: '9px 6px', borderLeft: `1px solid ${C.line}33` }}>
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
              <td style={{ padding: '9px 12px', fontWeight: 600, color: C.ink }}>Usuarios</td>
              {PLANES.map(p => (
                <td key={p.nombre} style={{ textAlign: 'center', padding: '9px 6px', fontSize: 13, color: C.ink, opacity: 0.7, borderLeft: `1px solid ${C.line}33` }}>
                  {p.usuarios}
                </td>
              ))}
            </tr>

            {/* Fila precio / CTA */}
            <tr style={{ borderTop: `2px solid ${C.line}`, backgroundColor: '#fff' }}>
              <td style={{ padding: '16px 12px', fontWeight: 700, color: C.ink }}>Precio/mes</td>
              {PLANES.map(p => (
                <td key={p.nombre} style={{ textAlign: 'center', padding: '16px 6px', borderLeft: `1px solid ${C.line}33` }}>
                  <p style={{ margin: '0 0 8px', fontFamily: FM, fontWeight: 700, fontSize: 16, color: p.destacado ? C.signal : C.ink }}>
                    {clp(anual ? Math.round(p.precio_anual / 12) : p.precio_mes)}
                  </p>
                  <a href="https://app.kaltorpos.com/registro" style={{
                    display: 'inline-block', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    backgroundColor: p.destacado ? C.signal : 'transparent',
                    color: p.destacado ? '#fff' : C.ink,
                    border: p.destacado ? 'none' : `1.5px solid ${C.line}`,
                  }}>
                    Elegir
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: C.ink, opacity: 0.35, marginTop: 16 }}>Precios en CLP · IVA no incluido</p>
    </div>
  )
}

// ── Misión y Visión ───────────────────────────────────────────────────────────
function MisionVision() {
  return (
    <section style={{ padding: '96px 48px', backgroundColor: C.navy, color: C.paper }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Frase central */}
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 24, textAlign: 'center' }}>
          Por qué existe Kaltor
        </p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 700, lineHeight: 1.2, color: C.paper, textAlign: 'center', marginBottom: 64 }}>
          Saber exactamente cuánto ganas,<br />
          cuánto gastas y <span style={{ color: C.signal }}>qué tan efectivo eres.</span>
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
              <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, margin: 0 }}>Misión</p>
            </div>
            <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: C.paper, marginBottom: 16, lineHeight: 1.3 }}>
              Orden real para tu emprendimiento.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: C.paper, opacity: 0.65, margin: 0 }}>
              Entregamos a cada emprendedor una herramienta simple para controlar su negocio sin complicaciones —
              sin hojas de cálculo desordenadas, sin números perdidos, sin adivinar si el mes fue bueno o malo.
              Solo claridad: lo que entra, lo que sale y lo que queda.
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
              <p style={{ fontFamily: FM, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.mod, margin: 0 }}>Visión</p>
            </div>
            <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: C.paper, marginBottom: 16, lineHeight: 1.3 }}>
              Ningún negocio opera a ciegas.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: C.paper, opacity: 0.65, margin: 0 }}>
              Que cualquier negocio tome decisiones con datos reales, sin importar su tamaño o rubro.
              Con información clara y ordenada, los emprendedores crecen con más seguridad,
              reducen sus pérdidas y construyen algo que dura.
            </p>
          </div>

        </div>

        {/* Línea divisoria + cifra de impacto */}
        <div style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid #ffffff12', display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap', textAlign: 'center' }}>
          {[
            { valor: '12', label: 'módulos de negocio' },
            { valor: '7',  label: 'planes disponibles' },
            { valor: '1',  label: 'objetivo: tu control total' },
          ].map(item => (
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
function ParaQuienEs() {
  const negocios = [
    { Icon: Wrench,    titulo: 'Talleres de reparación',   texto: 'Celulares, notebooks, electrodomésticos o motos — controla cada orden de trabajo de principio a fin.' },
    { Icon: Store,     titulo: 'Tiendas y minimarkets',     texto: 'Punto de venta rápido, boletas al instante y stock siempre bajo control.' },
    { Icon: Package,   titulo: 'Ferreterías y bodegas',     texto: 'Miles de productos, cero descuadres. Alertas antes de quedarte sin stock.' },
    { Icon: Truck,     titulo: 'Distribuidoras y mayoristas', texto: 'Vende al por mayor con catálogo B2B y precios diferenciados por cliente.' },
    { Icon: Building2, titulo: 'Pymes y emprendimientos',   texto: 'Si compras, vendes o entregas un servicio, necesitas saber cuánto ganas. Kaltor te lo muestra.' },
  ]

  const facil = [
    { Icon: Globe, texto: 'Sin instalar nada — funciona desde el navegador' },
    { Icon: Zap,   texto: 'Tu equipo aprende a usarlo en minutos, no en semanas' },
    { Icon: Users, texto: 'Celular, tablet o computador: mismo sistema, siempre a mano' },
  ]

  return (
    <section style={{ padding: '96px 48px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>
          Para quién es Kaltor
        </p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink, marginBottom: 8 }}>
          Hecho para negocios que compran, venden o reparan.
        </h2>
        <p style={{ fontSize: 20, color: C.ink, opacity: 0.6, marginBottom: 48, maxWidth: 620 }}>
          No importa el rubro: si necesitas orden en tu inventario, tus ventas y tus números, Kaltor calza con tu negocio.
        </p>

        {/* Grid de tipos de negocio */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 56 }}>
          {negocios.map(({ Icon, titulo, texto }) => (
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
          ))}
        </div>

        {/* Fácil de usar */}
        <div style={{
          padding: '36px 40px', borderRadius: 18,
          backgroundColor: C.navy,
          display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: C.paper, margin: 0, flexShrink: 0 }}>
            Fácil desde<br />el primer día.
          </p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', flex: 1 }}>
            {facil.map(({ Icon, texto }) => (
              <div key={texto} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
                <Icon size={18} color={C.signal} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 15, color: C.paper, opacity: 0.75, margin: 0, lineHeight: 1.4 }}>{texto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recomendación sutil */}
        <p style={{ textAlign: 'center', fontSize: 17, color: C.ink, opacity: 0.65, marginTop: 40, lineHeight: 1.6 }}>
          Si tu negocio se parece a alguno de estos, es muy probable que <strong style={{ opacity: 1 }}>Kaltor ya esté pensado para ti</strong>.{' '}
          <a href="#planes" style={{ color: C.signal, fontWeight: 600, textDecoration: 'none' }}>Descubre tu plan →</a>
        </p>
      </div>
    </section>
  )
}

// ── Ventajas / Por qué usar Kaltor ───────────────────────────────────────────
function VentajasKaltor() {
  const items = [
    {
      Icon: Eye,
      titulo: 'Sabes exactamente dónde estás',
      texto: 'Cada peso ingresado, cada gasto registrado. Todo visible en tiempo real.',
      accent: C.signal,
    },
    {
      Icon: Users,
      titulo: 'Tu competencia ya tomó la decisión',
      texto: 'Los que crecen tienen orden y datos. Los que no, adivinan. ¿De qué lado estás?',
      accent: C.mod,
    },
    {
      Icon: AlertTriangle,
      titulo: 'El desorden silencioso cuesta caro',
      texto: 'Registros olvidados, gastos sin detectar. Cuando los ves, ya es tarde.',
      accent: '#e8604c',
    },
    {
      Icon: Zap,
      titulo: 'Operativo desde el primer minuto',
      texto: 'Sin capacitaciones ni manuales. Tu equipo empieza a usarlo hoy.',
      accent: C.signal,
    },
    {
      Icon: SlidersHorizontal,
      titulo: 'Pagas solo lo que usas',
      texto: 'Sin módulos que no necesitas. Escalas cuando tú decides, no cuando te lo imponen.',
      accent: C.mod,
    },
    {
      Icon: Globe,
      titulo: 'Tu negocio no para. Tu sistema tampoco.',
      texto: 'Celular, tablet o computador. Siempre disponible, siempre sincronizado.',
      accent: C.signal,
    },
  ]

  return (
    <section style={{ padding: '96px 48px', backgroundColor: '#080F16' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Cabecera */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 72px' }}>
          <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#e8604c', marginBottom: 20 }}>
            Sin excusas
          </p>
          <h2 style={{ fontFamily: FD, fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 700, lineHeight: 1.2, color: C.paper, marginBottom: 24 }}>
            El desorden te está costando dinero<br />
            <span style={{ color: C.signal }}>ahora mismo.</span>
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: C.paper, opacity: 0.55 }}>
            Cada día sin claridad es un día de decisiones mal tomadas, gastos sin detectar
            y oportunidades que se van. Kaltor no es una opción — es la diferencia entre
            saber y adivinar.
          </p>
        </div>

        {/* Grid de ventajas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16, marginBottom: 72 }}>
          {items.map(({ Icon, titulo, texto, accent }) => (
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
          ))}
        </div>

        {/* CTA final */}
        <div style={{ textAlign: 'center', padding: '48px', borderRadius: 20, backgroundColor: '#ffffff06', border: '1px solid #ffffff0D' }}>
          <p style={{ fontFamily: FD, fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: C.paper, marginBottom: 10 }}>
            ¿Cuánto más vas a operar a ciegas?
          </p>
          <p style={{ fontSize: 16, color: C.paper, opacity: 0.5, marginBottom: 32 }}>
            Empieza gratis hoy. Sin tarjeta de crédito. Sin compromisos.
          </p>
          <a href="https://app.kaltorpos.com/registro" style={{
            display: 'inline-block', padding: '16px 40px', borderRadius: 12,
            backgroundColor: C.signal, color: '#fff',
            fontWeight: 700, fontSize: 16, textDecoration: 'none',
            boxShadow: `0 0 32px ${C.signal}55`,
          }}>
            Comenzar gratis →
          </a>
        </div>

      </div>
    </section>
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
        <p style={{ fontFamily: FM, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.signal, marginBottom: 12 }}>Cómo funciona</p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 700, color: C.ink, marginBottom: 56 }}>Tres pasos para empezar.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
          {pasos.map(p => (
            <div key={p.num}>
              <span style={{ fontFamily: FM, fontSize: 46, fontWeight: 700, color: C.line, display: 'block', marginBottom: 16 }}>{p.num}</span>
              <h3 style={{ fontSize: 21, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{p.titulo}</h3>
              <p style={{ fontSize: 17, color: C.ink, opacity: 0.6, lineHeight: 1.6 }}>{p.desc}</p>
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
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kaltor-logo.svg" alt="Kaltor" style={{ height: 44, filter: 'brightness(0) invert(1)' }} />
          </a>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['Módulos', '#modulos'], ['Planes', '#planes'], ['Entrar', '/login']].map(([label, href]) => (
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
          <p style={{ fontSize: 14, opacity: 0.35 }}>Precios en CLP · IVA no incluido</p>
        </div>
      </div>
    </footer>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: C.paper, color: C.ink }}>
      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <Nav />
      <Hero />
      <ParaQuienEs />
      <VentajasKaltor />
      <Modulos />
      <MisionVision />
      <Planes />
      <ComoFunciona />
      <Footer />
      <ChatWidget
        context="landing"
        welcomeMessage="¡Hola! Soy el asistente de Kaltor 👋 ¿Te ayudo a elegir un plan o tienes alguna pregunta sobre los módulos?"
        placeholder="Pregúntame sobre planes, módulos o precios…"
      />
    </div>
  )
}
