'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Bot, User } from 'lucide-react'
import { AI_PREGUNTAS } from '../data/content'
import { C, FM } from '../theme'
import { SectionHeading } from '../ui/SectionKicker'
import GradientBlob from '../ui/GradientBlob'
import Reveal from '../ui/Reveal'

/** Fase de la conversación simulada: pregunta escribiéndose → respuesta escribiéndose → pausa → siguiente. */
export default function AIDemo() {
  const [idx, setIdx] = useState(0)
  const [fase, setFase] = useState<'pregunta' | 'respuesta' | 'pausa'>('pregunta')

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const tiempos = { pregunta: 900, respuesta: 1600, pausa: 1400 }
    const t = setTimeout(() => {
      if (fase === 'pregunta') setFase('respuesta')
      else if (fase === 'respuesta') setFase('pausa')
      else { setFase('pregunta'); setIdx(i => (i + 1) % AI_PREGUNTAS.length) }
    }, tiempos[fase])
    return () => clearTimeout(t)
  }, [fase])

  const actual = AI_PREGUNTAS[idx]
  const mostrarRespuesta = fase === 'respuesta' || fase === 'pausa'

  return (
    <section className="relative overflow-hidden px-5 md:px-12 py-20 md:py-24" style={{ backgroundColor: '#080F16' }}>
      <GradientBlob color={C.signal} size={460} top={-100} right={-120} opacity={0.18} />
      <div className="relative max-w-4xl mx-auto text-center" style={{ zIndex: 1 }}>
        <SectionHeading
          center
          light
          kickerColor={C.signal}
          kicker="ASISTENTE IA"
          title="Pregúntale a tu negocio, literalmente"
          subtitle="Un asistente que responde en lenguaje simple usando los datos reales de tu operación."
          maxWidth={520}
        />

        <Reveal delay={0.15}>
          <div
            className="mt-12 mx-auto rounded-2xl text-left overflow-hidden"
            style={{ maxWidth: 560, background: '#0F1720', border: '1px solid #1E2A36' }}
          >
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid #1E2A36' }}>
              <Sparkles size={15} color={C.signal} />
              <span style={{ fontFamily: FM, fontSize: 12, color: C.paper, opacity: 0.6 }}>Kaltor IA</span>
            </div>

            <div className="px-5 py-6 flex flex-col gap-4" style={{ minHeight: 170 }}>
              <div className="flex items-start gap-2.5 justify-end">
                <span style={{ fontSize: 14.5, color: '#fff', background: C.signal, borderRadius: '14px 14px 4px 14px', padding: '10px 14px', maxWidth: 380 }}>
                  {actual.pregunta}
                </span>
                <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 26, height: 26, background: '#233240' }}>
                  <User size={13} color="#8BA3B8" />
                </div>
              </div>

              {mostrarRespuesta && (
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 26, height: 26, background: `${C.signal}25` }}>
                    <Bot size={13} color={C.signal} />
                  </div>
                  <span style={{ fontSize: 14.5, color: C.paper, opacity: 0.9, background: '#182430', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', maxWidth: 380 }}>
                    {actual.respuesta}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 px-5 pb-5">
              {AI_PREGUNTAS.map((q, i) => (
                <span
                  key={q.pregunta}
                  style={{
                    fontFamily: FM, fontSize: 10.5, padding: '4px 9px', borderRadius: 999,
                    border: `1px solid ${i === idx ? C.signal : '#1E2A36'}`,
                    color: i === idx ? C.signal : '#8BA3B8',
                    transition: 'all 0.3s',
                  }}
                >
                  {q.pregunta}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
        <p className="mt-6" style={{ fontFamily: FM, fontSize: 11, color: C.paper, opacity: 0.3 }}>
          * Conversación de demostración con datos de ejemplo.
        </p>
      </div>
    </section>
  )
}
