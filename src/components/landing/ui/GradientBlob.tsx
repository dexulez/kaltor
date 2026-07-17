export default function GradientBlob({
  color,
  size = 480,
  top,
  left,
  right,
  bottom,
  opacity = 0.35,
  animate = true,
}: {
  color: string
  size?: number
  top?: number | string
  left?: number | string
  right?: number | string
  bottom?: number | string
  opacity?: number
  animate?: boolean
}) {
  return (
    <div
      aria-hidden
      className={animate ? 'kaltor-animate-float' : undefined}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top, left, right, bottom,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
