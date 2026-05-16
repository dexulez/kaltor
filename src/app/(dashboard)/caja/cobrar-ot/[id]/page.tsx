import { redirect } from 'next/navigation'

export default async function CobrarOTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/caja/venta-directa?ot=${id}`)
}
