export const TIPOS_EQUIPO = [
  { value: 'smartphone',    label: 'Smartphone',       icon: '📱' },
  { value: 'tablet',        label: 'Tablet',            icon: '📱' },
  { value: 'laptop',        label: 'Laptop / Notebook', icon: '💻' },
  { value: 'pc_all_in_one', label: 'PC / All In One',   icon: '🖥' },
  { value: 'smartwatch',    label: 'Smartwatch',        icon: '⌚' },
  { value: 'auriculares',   label: 'Auriculares',       icon: '🎧' },
  { value: 'parlante',      label: 'Parlante',          icon: '🔊' },
  { value: 'consola',       label: 'Consola',           icon: '🎮' },
  { value: 'tv',            label: 'TV / Televisor',    icon: '📺' },
  { value: 'mando',         label: 'Mando / Control',   icon: '🕹' },
  { value: 'camara',        label: 'Cámara',            icon: '📷' },
  { value: 'impresora',     label: 'Impresora',         icon: '🖨' },
  { value: 'accesorio',     label: 'Accesorio',         icon: '🔌' },
  { value: 'otro',          label: 'Otro',              icon: '🔧' },
]

export function labelTipoEquipo(value: string | null | undefined): string {
  if (!value) return ''
  return TIPOS_EQUIPO.find(t => t.value === value)?.label
    ?? value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
