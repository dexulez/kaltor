import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CerrarSesionButton from './_components/CerrarSesionButton'

export const metadata = { title: 'Kaltor · Panel de Vendedor', robots: 'noindex' }

const ESTADO_MSG: Record<string, { titulo: string; texto: string }> = {
  pendiente: {
    titulo: 'Solicitud en revisión',
    texto: 'Tu registro como vendedor externo está pendiente de aprobación. Te avisaremos por correo apenas esté listo.',
  },
  rechazado: {
    titulo: 'Solicitud rechazada',
    texto: 'Tu solicitud para ser vendedor externo no fue aprobada. Si crees que es un error, escríbenos.',
  },
  suspendido: {
    titulo: 'Cuenta suspendida',
    texto: 'Tu cuenta de vendedor está suspendida temporalmente. Contáctanos para más información.',
  },
}

const NAV = [
  { href: '/panel-vendedor',            label: 'Resumen' },
  { href: '/panel-vendedor/clientes',   label: 'Clientes' },
  { href: '/panel-vendedor/comisiones', label: 'Comisiones' },
  { href: '/panel-vendedor/perfil',     label: 'Perfil' },
]

export default async function VendedorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createServiceClient()
  const { data: vendedor } = await admin
    .from('vendedores_externos')
    .select('id, codigo, nombre, estado')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!vendedor) redirect('/dashboard')

  if (vendedor.estado !== 'activo') {
    const msg = ESTADO_MSG[vendedor.estado] ?? ESTADO_MSG.pendiente
    return (
      <div className="min-h-screen bg-[#F5F6F4] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaltor-logo.svg" alt="Kaltor" className="h-10 mx-auto" />
          <h1 className="text-lg font-bold text-gray-900">{msg.titulo}</h1>
          <p className="text-sm text-gray-500">{msg.texto}</p>
          <CerrarSesionButton className="text-sm text-[#FF7A1A] hover:underline font-medium" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6F4]">
      <header className="bg-[#121B1F] sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <div className="flex items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kaltor-logo-hex.svg" alt="Kaltor" className="h-7 w-7" />
            <span className="text-white font-bold text-sm tracking-tight">Kaltor</span>
            <span className="text-[10px] bg-[#FF7A1A]/20 text-[#FF7A1A] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">
              Vendedor
            </span>
          </div>

          <nav className="flex items-center gap-1 text-sm flex-1">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-gray-500">{vendedor.nombre}</span>
            <CerrarSesionButton className="text-xs text-gray-400 hover:text-white transition-colors" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
