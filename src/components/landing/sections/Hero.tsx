'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { LANDING_TXT } from '@/lib/i18n/landing'
import { useLang } from '../LangContext'
import { C, FD, FM } from '../theme'
import GradientBlob from '../ui/GradientBlob'
import DeviceFrame from '../ui/DeviceFrame'
import DashboardMock from '../ui/DashboardMock'

export default function Hero() {
  const { lang } = useLang()
  const t = LANDING_TXT[lang]

  return (
    <section
      className="relative overflow-hidden px-5 md:px-12 pt-16 pb-20 md:pt-20 md:pb-28"
      style={{ backgroundColor: C.paper }}
    >
      <GradientBlob color={C.signal} size={520} top={-160} left={-120} opacity={0.22} />
      <GradientBlob color={C.mod} size={420} top={80} right={-140} opacity={0.16} />

      <div className="relative max-w-5xl mx-auto text-center" style={{ zIndex: 1 }}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 text-[13px] font-semibold uppercase tracking-[0.2em]"
          style={{ fontFamily: FM, color: C.signal }}
        >
          {t.hero.kicker}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-[clamp(38px,6.4vw,74px)] font-bold leading-[1.06] mb-5"
          style={{ fontFamily: FD, color: C.ink }}
        >
          Tu negocio, bajo{' '}
          <span
            style={{
              background: `linear-gradient(90deg, ${C.signal}, ${C.signalDk})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            control total
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg md:text-xl mx-auto mb-9"
          style={{ color: C.ink, opacity: 0.6, maxWidth: 580, lineHeight: 1.6 }}
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-6"
        >
          <a
            href="https://app.kaltorpos.com/registro"
            className="rounded-xl px-8 py-4 text-lg font-semibold no-underline transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: C.signal, color: '#fff', boxShadow: `0 12px 32px ${C.signal}45` }}
          >
            {t.hero.ctaStart}
          </a>
          <a
            href="#planes"
            className="rounded-xl px-8 py-4 text-lg font-semibold no-underline transition-colors"
            style={{ border: `2px solid ${C.line}`, color: C.ink }}
          >
            {t.hero.ctaPlans}
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm mb-16"
          style={{ color: C.ink }}
        >
          Sin tarjeta de crédito · Configura tu negocio en minutos
        </motion.p>

        {/* Mockup grande: laptop + tablet + phone sincronizados */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto flex items-end justify-center"
          style={{ maxWidth: 920 }}
        >
          <div className="hidden md:block" style={{ transform: 'translate(48px, 46px) rotate(4deg)' }}>
            <DeviceFrame kind="phone" style={{ transform: 'scale(0.72)' }}>
              <DashboardMock compact />
            </DeviceFrame>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }} className="w-full max-w-[620px]">
            <DeviceFrame kind="laptop">
              <DashboardMock />
            </DeviceFrame>
            {/* Base del laptop */}
            <div
              style={{
                height: 12,
                margin: '0 -18px',
                borderRadius: '0 0 10px 10px',
                background: 'linear-gradient(180deg, #2b2f33, #17191b)',
                boxShadow: '0 14px 24px rgba(0,0,0,0.25)',
              }}
            />
          </div>

          <div className="hidden md:block" style={{ transform: 'translate(-56px, 30px) rotate(-5deg)', zIndex: 1 }}>
            <DeviceFrame kind="tablet" style={{ transform: 'scale(0.8)' }}>
              <DashboardMock compact />
            </DeviceFrame>
          </div>

          {/* Chips flotantes glassmorphism */}
          <div
            className="kaltor-animate-float hidden sm:flex items-center gap-2 absolute"
            style={{
              top: 10, left: -10,
              padding: '10px 16px', borderRadius: 14,
              background: 'var(--kaltor-glass-bg)',
              border: '1px solid var(--kaltor-glass-brd)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              zIndex: 3,
            }}
          >
            <TrendingUp size={16} color={C.mod} />
            <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: C.ink }}>+12% ventas hoy</span>
          </div>

          <div
            className="kaltor-animate-float hidden sm:flex items-center gap-2 absolute"
            style={{
              bottom: 40, right: -10,
              animationDelay: '1.5s',
              padding: '10px 16px', borderRadius: 14,
              background: 'var(--kaltor-glass-bg)',
              border: '1px solid var(--kaltor-glass-brd)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              zIndex: 3,
            }}
          >
            <CheckCircle2 size={16} color={C.signal} />
            <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: C.ink }}>Sincronizado en la nube</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
