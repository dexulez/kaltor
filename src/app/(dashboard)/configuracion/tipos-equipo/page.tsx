import BotonVolver from '@/components/shared/BotonVolver'
import TiposEquipoManager from '@/components/configuracion/TiposEquipoManager'

export default function TiposEquipoPage() {
  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <BotonVolver label="← Volver a Configuración" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Tipos de equipo</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Agrega o elimina los tipos de equipo disponibles al crear una orden de trabajo, cada uno con su ícono y su configuración de accesorios/condición.
        </p>
      </div>
      <TiposEquipoManager />
    </div>
  )
}
