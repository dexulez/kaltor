import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface VendedorActual {
  id: string
  user_id: string
  codigo: string
  nombre: string
  email: string
  telefono: string | null
  rut: string | null
  banco: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  titular_cuenta: string | null
  estado: string
}

// Requiere que el layout de (vendedor) ya haya verificado que hay sesión y que
// el vendedor está activo — esto solo reobtiene los datos para la página actual.
export async function getVendedorActual(): Promise<VendedorActual | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceClient()
  const { data: vendedor } = await admin
    .from('vendedores_externos')
    .select('id, user_id, codigo, nombre, email, telefono, rut, banco, tipo_cuenta, numero_cuenta, titular_cuenta, estado')
    .eq('user_id', user.id)
    .maybeSingle()

  return vendedor
}
