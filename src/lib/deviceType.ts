export type TipoDispositivo = 'movil' | 'computador'

export function detectarTipoDispositivo(userAgent: string | null): TipoDispositivo {
  if (!userAgent) return 'computador'
  return /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(userAgent) ? 'movil' : 'computador'
}
