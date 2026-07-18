'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle, Mail } from 'lucide-react'
import { LANDING_TXT } from '@/lib/i18n/landing'
import { useLang } from '../LangContext'
import { MODULOS, HERO_ICONS } from '../data/modulos'
import { FAQ } from '../data/content'
import { C, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'

function FAQItem({ p, r }: { p: string; r: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${C.line}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer bg-transparent border-0"
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{p}</span>
        <ChevronDown size={18} color={C.ink} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
      </button>
      {open && <p style={{ fontSize: 15, color: C.ink, opacity: 0.6, lineHeight: 1.6, margin: '0 0 20px' }}>{r}</p>}
    </div>
  )
}

function FaqSection() {
  return (
    <section id="faq" className="px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-2xl mx-auto">
        <SectionHeading center kicker="PREGUNTAS FRECUENTES" title="¿Tienes dudas?" maxWidth={400} />
        <div className="mt-10">
          {FAQ.map(item => <FAQItem key={item.p} p={item.p} r={item.r} />)}
        </div>
      </div>
    </section>
  )
}

export default function Footer() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]

  return (
    <>
      <FaqSection />
      <footer className="px-5 md:px-12 pt-16 pb-8" style={{ backgroundColor: C.navy, color: C.paper }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-10 mb-14" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div>
              <Link href="/" className="inline-flex items-center no-underline mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/kaltor-logo.svg" alt="Kaltor" style={{ height: 40, filter: 'brightness(0) invert(1)' }} />
              </Link>
              <p style={{ fontSize: 14, color: C.paper, opacity: 0.45, lineHeight: 1.6, maxWidth: 220 }}>
                Gestión de negocio todo en uno: ventas, inventario, taller, reportes y más.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <a href="https://wa.me/56900000000" aria-label="WhatsApp" style={{ color: C.paper, opacity: 0.6 }}><MessageCircle size={18} /></a>
                <a href="mailto:contacto@kaltorpos.com" aria-label="Correo" style={{ color: C.paper, opacity: 0.6 }}><Mail size={18} /></a>
              </div>
            </div>

            <div>
              <p style={{ fontFamily: FM, fontSize: 12, letterSpacing: '0.1em', color: C.paper, opacity: 0.4, marginBottom: 14 }}>PRODUCTO</p>
              <div className="flex flex-col gap-3">
                <a href="#modulos" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>{t.nav.modulos}</a>
                <a href="#como-funciona" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Cómo funciona</a>
                <a href="#planes" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>{t.nav.planes}</a>
                <a href="#faq" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>FAQ</a>
              </div>
            </div>

            <div>
              <p style={{ fontFamily: FM, fontSize: 12, letterSpacing: '0.1em', color: C.paper, opacity: 0.4, marginBottom: 14 }}>EMPRESA</p>
              <div className="flex flex-col gap-3">
                <a href="/login" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>{t.footer.entrar}</a>
                <a href="/quiero-ser-vendedor" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Quiero ser vendedor</a>
                <a href="#" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Blog</a>
                <a href="mailto:contacto@kaltorpos.com" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Contacto</a>
                <a href="https://wa.me/56900000000" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Soporte por WhatsApp</a>
              </div>
            </div>

            <div>
              <p style={{ fontFamily: FM, fontSize: 12, letterSpacing: '0.1em', color: C.paper, opacity: 0.4, marginBottom: 14 }}>LEGAL</p>
              <div className="flex flex-col gap-3">
                <a href="/politicas/privacidad" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Política de privacidad</a>
                <a href="/politicas/terminos" style={{ fontSize: 14.5, color: C.paper, opacity: 0.65, textDecoration: 'none' }}>Términos de servicio</a>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 mb-10 flex-wrap opacity-25">
            {MODULOS.map(m => {
              const Icon = HERO_ICONS[m.key]
              return Icon ? (
                <span key={m.key} className="inline-flex items-center justify-center rounded-full" style={{ width: 26, height: 26, backgroundColor: C.signal }}>
                  <Icon size={12} color="#fff" strokeWidth={2} />
                </span>
              ) : null
            })}
          </div>

          <div className="flex justify-between flex-wrap gap-2 pt-5" style={{ borderTop: '1px solid #ffffff15' }}>
            <p style={{ fontSize: 13.5, opacity: 0.35 }}>© {new Date().getFullYear()} Kaltor · kaltorpos.com</p>
            <p style={{ fontSize: 13.5, opacity: 0.35 }}>{t.footer.footnoteClp}</p>
          </div>
        </div>
      </footer>
    </>
  )
}
