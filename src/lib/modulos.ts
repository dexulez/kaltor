export const MODULOS = [
  { key: 'dashboard',     label: 'Dashboard',      icon: '📊', href: '/dashboard' },
  { key: 'clientes',      label: 'Clientes',        icon: '👤', href: '/clientes' },
  { key: 'reparaciones',  label: 'Reparaciones',    icon: '🔧', href: '/reparaciones' },
  { key: 'inventario',    label: 'Inventario',      icon: '📦', href: '/inventario' },
  { key: 'caja',          label: 'Caja / Ventas',   icon: '💰', href: '/caja' },
  { key: 'compras',       label: 'Compras',         icon: '🏭', href: '/compras' },
  { key: 'usuarios',      label: 'Usuarios',        icon: '👥', href: '/usuarios' },
  { key: 'informes',      label: 'Informes',        icon: '📈', href: '/informes' },
  { key: 'configuracion', label: 'Configuración',   icon: '⚙️', href: '/configuracion' },
] as const

export type ModuloKey = typeof MODULOS[number]['key']

// Acceso por defecto según nombre de rol (se usa cuando permisos_modulos es null)
export const MODULOS_ROL_DEFAULT: Record<string, ModuloKey[]> = {
  administrador:     ['dashboard', 'clientes', 'reparaciones', 'inventario', 'caja', 'compras', 'usuarios', 'informes', 'configuracion'],
  tecnico:           ['dashboard', 'reparaciones', 'inventario', 'informes'],
  vendedor:          ['dashboard', 'clientes', 'reparaciones', 'inventario', 'caja', 'informes'],
  supervisor_ventas: ['dashboard', 'clientes', 'reparaciones', 'inventario', 'caja', 'compras', 'informes'],
}

export function getDefaultPermisos(rolNombre: string): Record<ModuloKey, boolean> {
  const defaults = MODULOS_ROL_DEFAULT[rolNombre] ?? []
  return Object.fromEntries(
    MODULOS.map(m => [m.key, defaults.includes(m.key)])
  ) as Record<ModuloKey, boolean>
}

export function tieneAccesoModulo(
  modulo: ModuloKey,
  rolNombre: string,
  permisosModulos: Record<string, boolean> | null | undefined
): boolean {
  // Admin siempre tiene acceso a todo
  if (rolNombre === 'administrador') return true
  // Si hay permisos explícitos por usuario, usarlos
  if (permisosModulos != null) return !!permisosModulos[modulo]
  // Fallback a defaults del rol
  return MODULOS_ROL_DEFAULT[rolNombre]?.includes(modulo) ?? false
}
