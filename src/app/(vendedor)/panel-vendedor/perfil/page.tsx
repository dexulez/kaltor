import { redirect } from 'next/navigation'
import { getVendedorActual } from '@/lib/vendedores/getVendedorActual'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import PerfilForm from './_components/PerfilForm'

export const dynamic = 'force-dynamic'

export default async function PerfilVendedorPage() {
  const vendedor = await getVendedorActual()
  if (!vendedor) redirect('/login')

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Datos de contacto y bancarios usados para pagarte tus comisiones.</p>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{vendedor.email}</CardTitle>
          <CardDescription>Código: <span className="font-mono">{vendedor.codigo}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm vendedor={vendedor} />
        </CardContent>
      </Card>
    </div>
  )
}
