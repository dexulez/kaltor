import ProveedorForm from '@/components/compras/ProveedorForm'
import BotonVolver from '@/components/shared/BotonVolver'

export default function NuevoProveedorPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo proveedor</h1>
      </div>
      <ProveedorForm />
    </div>
  )
}
