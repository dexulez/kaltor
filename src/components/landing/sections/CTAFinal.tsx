import { C, FD } from '../theme'
import GradientBlob from '../ui/GradientBlob'
import Reveal from '../ui/Reveal'

export default function CTAFinal() {
  return (
    <section className="relative overflow-hidden px-5 md:px-12 py-24 md:py-32 text-center" style={{ backgroundColor: C.navy }}>
      <GradientBlob color={C.signal} size={600} top="-30%" left="50%" opacity={0.28} animate={false} />
      <div className="relative" style={{ zIndex: 1 }}>
        <Reveal>
          <h2
            className="text-[clamp(34px,6vw,64px)] font-bold mb-6"
            style={{ fontFamily: FD, color: '#fff', letterSpacing: '-0.01em' }}
          >
            EMPIEZA GRATIS
          </h2>
          <p className="mx-auto mb-10 text-lg md:text-xl" style={{ color: C.paper, opacity: 0.6, maxWidth: 480 }}>
            Configura tu negocio en minutos. Sin tarjeta de crédito, sin permanencia.
          </p>
          <a
            href="https://app.kaltorpos.com/registro"
            className="inline-block rounded-xl px-12 py-5 text-xl font-bold no-underline transition-transform hover:-translate-y-1"
            style={{ backgroundColor: C.signal, color: '#fff', boxShadow: `0 16px 44px ${C.signal}55` }}
          >
            Crear mi cuenta →
          </a>
        </Reveal>
      </div>
    </section>
  )
}
