import Link from 'next/link'
import ManualForm from '@/components/manuales/ManualForm'
import { obtenerGuiaIFixit, guiaAManualPrellenado, type ManualPrellenado } from '@/lib/ifixit'

export default async function NuevoManualPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; guideid?: string; marca?: string; modelo?: string; url?: string }>
}) {
  const { tipo, guideid, marca, modelo, url } = await searchParams

  let prellenado: (ManualPrellenado & { marca: string; modelo: string }) | undefined
  if (guideid) {
    try {
      const guia = await obtenerGuiaIFixit(Number(guideid))
      const datos = guiaAManualPrellenado(guia, url)
      prellenado = { marca: marca ?? '', modelo: modelo ?? '', ...datos }
    } catch {
      // Si falla la importación, el formulario queda vacío para completar a mano.
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/manuales" className="text-sm text-blue-600 hover:underline">← Volver a manuales</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nueva entrada</h1>
        <p className="text-gray-500 text-sm">Agrega una falla, plano, test point u otro conocimiento técnico</p>
      </div>
      <ManualForm prellenado={prellenado} tipoInicial={tipo} />
    </div>
  )
}
