import { ShoppingCart, Building2, Package, Wrench, Hammer, BarChart2, Receipt, Store, Settings, BookOpen, Banknote, Truck } from 'lucide-react'

export type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>

// El texto (label/desc/ventaja) vive en MODULOS_TXT (src/lib/i18n/landing.ts), por idioma.
export const MODULOS = [
  { code: 'MOD-01', key: 'ventas',         abbr: 'VTA', icon: '💰' },
  { code: 'MOD-02', key: 'compras',        abbr: 'COM', icon: '🏭' },
  { code: 'MOD-03', key: 'productos',      abbr: 'INV', icon: '📦' },
  { code: 'MOD-04', key: 'servicios',      abbr: 'SVC', icon: '🔩' },
  { code: 'MOD-05', key: 'taller',         abbr: 'TAL', icon: '🔧' },
  { code: 'MOD-06', key: 'informes',       abbr: 'INF', icon: '📈' },
  { code: 'MOD-07', key: 'contabilidad',   abbr: 'CTB', icon: '🧾' },
  { code: 'MOD-08', key: 'canal_b2b',      abbr: 'B2B', icon: '🛍️' },
  { code: 'MOD-09', key: 'configuracion',  abbr: 'CFG', icon: '⚙️' },
  { code: 'MOD-10', key: 'manuales',       abbr: 'MAN', icon: '🧠' },
  { code: 'MOD-11', key: 'conciliaciones', abbr: 'BNK', icon: '🏦' },
  { code: 'MOD-12', key: 'trazabilidad',   abbr: 'TRZ', icon: '📍' },
] as const

export const HERO_ICONS: Record<string, LucideIcon> = {
  ventas:         ShoppingCart,
  compras:        Building2,
  productos:      Package,
  servicios:      Wrench,
  taller:         Hammer,
  informes:       BarChart2,
  contabilidad:   Receipt,
  canal_b2b:      Store,
  configuracion:  Settings,
  manuales:       BookOpen,
  conciliaciones: Banknote,
  trazabilidad:   Truck,
}

// El texto (nombre/usuarios/addon) vive en PLANES_TXT (src/lib/i18n/landing.ts), por idioma.
export type Plan = {
  id: string
  precio_mes: number
  precio_anual: number
  modulos: string[]
  familia: string
  destacado: boolean
  hasAddon?: boolean
}

export const PLANES: Plan[] = [
  { id: 'basico',              precio_mes: 14990, precio_anual: 149900, modulos: ['ventas','compras','productos','informes','trazabilidad','configuracion'],                                                                                 familia: 'básico',       destacado: false },
  { id: 'pro',                 precio_mes: 23990, precio_anual: 239900, modulos: ['ventas','compras','productos','informes','contabilidad','conciliaciones','trazabilidad','configuracion'],                                             familia: 'básico',       destacado: false },
  { id: 'taller-basico',       precio_mes: 19990, precio_anual: 199900, modulos: ['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion'],                                                        familia: 'taller',       destacado: false },
  { id: 'taller-basico-5u',    precio_mes: 29990, precio_anual: 299900, modulos: ['ventas','compras','productos','servicios','taller','manuales','trazabilidad','configuracion'],                                                        familia: 'taller',       destacado: true  },
  { id: 'taller-multiusuario', precio_mes: 36990, precio_anual: 369900, modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','trazabilidad','configuracion'],                              familia: 'taller',       destacado: false },
  { id: 'taller-pro',          precio_mes: 44990, precio_anual: 449900, modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','manuales','conciliaciones','trazabilidad','configuracion'],             familia: 'taller',       destacado: false },
  { id: 'taller-multi-tienda', precio_mes: 84990, precio_anual: 849900, modulos: ['ventas','compras','productos','servicios','taller','informes','contabilidad','canal_b2b','manuales','conciliaciones','trazabilidad','configuracion'], familia: 'multi-tienda', destacado: false, hasAddon: true },
]

export function clp(n: number) { return `$${n.toLocaleString('es-CL')}` }
