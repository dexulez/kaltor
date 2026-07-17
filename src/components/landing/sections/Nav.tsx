'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LANGS, LANDING_TXT } from '@/lib/i18n/landing'
import { useLang } from '../LangContext'
import { C, FM } from '../theme'

function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div className="hidden md:flex gap-0.5 rounded-lg p-0.5" style={{ border: `1px solid ${C.line}` }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => {
            setLang(l.code)
            document.cookie = `kaltor_lang=${l.code}; path=/; max-age=31536000`
          }}
          className="rounded-md px-2 py-1 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
          style={{
            fontFamily: FM,
            backgroundColor: lang === l.code ? C.signal : 'transparent',
            color: lang === l.code ? '#fff' : C.ink,
            opacity: lang === l.code ? 1 : 0.55,
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

export default function Nav() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between h-16 px-5 md:px-12 transition-all"
      style={{
        backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        backgroundColor: scrolled ? 'rgba(245,246,244,0.75)' : 'transparent',
        borderBottom: `1px solid ${scrolled ? C.line : 'transparent'}`,
      }}
    >
      <Link href="/" className="flex items-center no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kaltor-logo.svg" alt="Kaltor" style={{ height: 44 }} />
      </Link>

      <div className="flex items-center gap-6 md:gap-8">
        <div className="hidden lg:flex items-center gap-8">
          {[[t.nav.modulos, '#modulos'], ['Cómo funciona', '#como-funciona'], [t.nav.planes, '#planes'], ['FAQ', '#faq']].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[15px] no-underline transition-opacity hover:opacity-100"
              style={{ color: C.ink, opacity: 0.65 }}
            >
              {label}
            </a>
          ))}
        </div>
        <LangSwitcher />
        <a href="/login" className="hidden sm:inline-block text-[15px] no-underline" style={{ color: C.ink, opacity: 0.7 }}>
          {t.nav.entrar}
        </a>
        <a
          href="https://app.kaltorpos.com/registro"
          className="rounded-lg px-4 py-2 text-[14px] md:text-[15px] font-semibold no-underline transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: C.signal, color: '#fff', boxShadow: `0 4px 16px ${C.signal}40` }}
        >
          Empieza gratis
        </a>
      </div>
    </nav>
  )
}
