'use client'

import { useState } from 'react'
import ChatWidget from '@/components/chat/ChatWidget'
import type { ConversionInfo } from '@/lib/currency'
import { LANDING_TXT, type Lang } from '@/lib/i18n/landing'
import { LangContext } from './LangContext'
import { C } from './theme'

import Nav from './sections/Nav'
import Hero from './sections/Hero'
import Stats from './sections/Stats'
import SocialProof from './sections/SocialProof'
import Modulos from './sections/Modulos'
import ComoFunciona from './sections/ComoFunciona'
import Comparacion from './sections/Comparacion'
import DashboardVivo from './sections/DashboardVivo'
import AIDemo from './sections/AIDemo'
import Automatizacion from './sections/Automatizacion'
import Seguridad from './sections/Seguridad'
import Dispositivos from './sections/Dispositivos'
import VideoDemo from './sections/VideoDemo'
import Planes from './sections/Planes'
import CTAFinal from './sections/CTAFinal'
import Footer from './sections/Footer'

type PreciosPorPlan = Record<string, { mensual: number; anual: number }>

export default function LandingPage({
  conversion = null,
  lang: initialLang = 'es',
  precios,
  conversionPorPlan,
}: {
  conversion?: ConversionInfo | null
  lang?: Lang
  precios?: PreciosPorPlan
  conversionPorPlan?: Record<string, ConversionInfo | null>
}) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = LANDING_TXT[lang]

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: C.paper, color: C.ink }}>
        <Nav />
        <Hero />
        <Stats />
        <SocialProof />
        <Modulos />
        <ComoFunciona />
        <Comparacion />
        <DashboardVivo />
        <AIDemo />
        <Automatizacion />
        <Seguridad />
        <Dispositivos />
        <VideoDemo />
        <Planes conversion={conversion} precios={precios} conversionPorPlan={conversionPorPlan} />
        <CTAFinal />
        <Footer />
        <ChatWidget context="landing" welcomeMessage={t.chat.welcome} placeholder={t.chat.placeholder} />
      </div>
    </LangContext.Provider>
  )
}
