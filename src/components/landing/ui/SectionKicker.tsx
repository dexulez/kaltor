import { FM, C } from '../theme'

export default function SectionKicker({ children, color = C.signal }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      className="mb-3 text-[13px] font-semibold uppercase tracking-[0.2em]"
      style={{ fontFamily: FM, color }}
    >
      {children}
    </p>
  )
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
  kickerColor,
  center = false,
  light = false,
  maxWidth = 640,
}: {
  kicker: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  kickerColor?: string
  center?: boolean
  light?: boolean
  maxWidth?: number
}) {
  return (
    <div className={center ? 'mx-auto text-center' : ''} style={{ maxWidth: center ? maxWidth + 160 : undefined }}>
      <SectionKicker color={kickerColor}>{kicker}</SectionKicker>
      <h2
        className="text-[clamp(30px,4.6vw,48px)] font-bold leading-tight mb-3"
        style={{ fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)', color: light ? C.paper : C.ink }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="text-lg md:text-xl leading-relaxed"
          style={{ color: light ? C.paper : C.ink, opacity: 0.6, maxWidth, margin: center ? '0 auto' : undefined }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
