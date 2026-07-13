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

// ── Sugerencia de icono para tipos de equipo personalizados ─────────────────
const ICONO_KEYWORDS: [RegExp, string][] = [
  [/dron/, '🚁'],
  [/(bici|scooter|patinet)/, '🛴'],
  [/(cel|movil|móvil|phone|iphone)/, '📱'],
  [/tablet|ipad/, '📱'],
  [/(laptop|notebook|portátil|portatil)/, '💻'],
  [/(pc|computador|desktop|torre)/, '🖥'],
  [/(reloj|watch)/, '⌚'],
  [/(auricular|audífono|audifono|earbud)/, '🎧'],
  [/(parlante|bocina|altavoz)/, '🔊'],
  [/(consola|xbox|playstation|nintendo|switch)/, '🎮'],
  [/(tv|televisor|pantalla)/, '📺'],
  [/(mando|control|joystick)/, '🕹'],
  [/(camara|cámara|gopro)/, '📷'],
  [/(impresora|printer)/, '🖨'],
  [/(router|modem|módem)/, '📶'],
  [/(bateria|batería|power ?bank|cargador)/, '🔋'],
]

export function sugerirIcono(nombre: string): string {
  const n = nombre.toLowerCase()
  return ICONO_KEYWORDS.find(([re]) => re.test(n))?.[1] ?? '🔧'
}

// ── Íconos disponibles para elegir manualmente al crear un tipo ─────────────
export const ICONOS_EQUIPO = [
  '📱', '💻', '🖥', '⌚', '🎧', '🔊', '🎮', '📺',
  '🕹', '📷', '🖨', '🔌', '🔋', '📶', '🚁', '🛴',
  '🖱', '⌨', '🧰', '📡', '💾', '🔧',
]

/**
 * Resuelve la plantilla de accesorios/condición a usar para un tipo de equipo
 * dado, consultando el catálogo cargado desde `equipment_types`. Si el tipo no
 * está en el catálogo (aún no cargó o es libre), usa el valor tal cual.
 */
export function resolveTemplate(
  tipos: { value: string; template: string }[],
  tipoEquipo: string
): string
export function resolveTemplate(
  tipos: { value: string; template: string }[],
  tipoEquipo: string | null | undefined
): string | null | undefined
export function resolveTemplate(
  tipos: { value: string; template: string }[],
  tipoEquipo: string | null | undefined
): string | null | undefined {
  if (!tipoEquipo) return tipoEquipo
  return tipos.find(t => t.value === tipoEquipo)?.template ?? tipoEquipo
}

// ── Configuración de accesorios/condición por tipo de equipo ─────────────────
// Define qué campos de "Accesorios entregados" y "Condición visual y física"
// se muestran en la recepción/edición de OT según el tipo de equipo elegido.

export interface AccesorioConfig {
  /** Etiquetas de accesorios simples (chips on/off), propias del tipo. */
  simples: string[]
  /** Bloque de Bandeja de SIM + SIM card (con operadora) — solo smartphone/tablet. */
  sim: boolean
  /** Etiqueta del slot de almacenamiento removible ("MicroSD", "Tarjeta SD / MicroSD") o null si no aplica. */
  microsdLabel: string | null
  /** Bloque "Mando ×N" con selector de cantidad (consolas). */
  mandoCantidad: boolean
  /** Campo de texto libre en vez de chips (Accesorio / Otro). */
  notaLibre: boolean
}

export interface CondicionConfig {
  /** Muestra el bloque "Carga" (sí/no carga + voltios/amperaje). */
  cargaPuerto: boolean
  /** Fallas/condiciones simples propias del tipo (chips on/off). */
  simples: string[]
  /** Áreas para Rayones/Golpes. Vacío = chip genérico sin desglose por área. */
  areasRayones: string[]
  /** Áreas para Humedad/Quemaduras. Vacío = chip genérico sin desglose por área. */
  areasHumedad: string[]
}

export interface ConfigTipoEquipo {
  identificacion: { imei: boolean; numeroSerie: boolean }
  accesorios: AccesorioConfig
  condicion: CondicionConfig
}

const CONFIG_DEFAULT: ConfigTipoEquipo = {
  identificacion: { imei: false, numeroSerie: false },
  accesorios: { simples: [], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: true },
  condicion: { cargaPuerto: false, simples: [], areasRayones: [], areasHumedad: [] },
}

const CONFIG_TIPO_EQUIPO: Record<string, ConfigTipoEquipo> = {
  smartphone: {
    identificacion: { imei: true, numeroSerie: true },
    accesorios: { simples: ['Cargador', 'Cable', 'Funda'], sim: true, microsdLabel: 'MicroSD', mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: ['Pantalla trizada', 'Marco doblado'],
      areasRayones: ['Pantalla', 'Middle Frame', 'Tapa trasera'],
      areasHumedad: ['Conector de carga', 'Bandeja de SIM', 'Auriculares'],
    },
  },
  tablet: {
    identificacion: { imei: true, numeroSerie: true },
    accesorios: { simples: ['Cargador', 'Cable', 'Funda'], sim: true, microsdLabel: 'MicroSD', mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: ['Pantalla trizada', 'Marco doblado'],
      areasRayones: ['Pantalla', 'Middle Frame', 'Tapa trasera'],
      areasHumedad: ['Conector de carga', 'Bandeja de SIM', 'Auriculares'],
    },
  },
  laptop: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Cargador / Fuente de poder', 'Cable', 'Funda / Estuche', 'Mouse'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: ['Bisagra rota', 'Teclas faltantes', 'Pantalla trizada'],
      areasRayones: ['Pantalla', 'Carcasa superior', 'Carcasa inferior', 'Teclado'],
      areasHumedad: ['Conector de carga', 'Puertos USB', 'Teclado'],
    },
  },
  pc_all_in_one: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Cable de poder', 'Mouse', 'Teclado'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: false,
      simples: [],
      areasRayones: ['Carcasa', 'Pantalla'],
      areasHumedad: ['Puertos traseros', 'Fuente de poder'],
    },
  },
  impresora: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Cable de poder', 'Cable USB', 'Cartuchos / Tóner', 'Bandeja de papel'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: false,
      simples: ['Atasco de papel', 'Inyectores tapados'],
      areasRayones: ['Carcasa plástica', 'Tapa de escáner'],
      areasHumedad: ['Conector de carga / poder', 'Placa lógica'],
    },
  },
  smartwatch: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Cable de carga magnético', 'Correas / Malla'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: [],
      areasRayones: ['Pantalla', 'Bisel', 'Sensor inferior'],
      areasHumedad: ['Pines de carga', 'Altavoz / Micrófono'],
    },
  },
  auriculares: {
    identificacion: { imei: false, numeroSerie: false },
    accesorios: { simples: ['Caja de carga', 'Cable', 'Almohadillas de repuesto'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: [],
      areasRayones: ['Estuche de carga', 'Auricular izquierdo', 'Auricular derecho'],
      areasHumedad: ['Conector de carga (estuche)', 'Pines de contacto internos'],
    },
  },
  parlante: {
    identificacion: { imei: false, numeroSerie: false },
    accesorios: { simples: ['Cargador', 'Cable auxiliar'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: [],
      areasRayones: ['Grilla / Malla frontal', 'Botonera'],
      areasHumedad: ['Conector de carga', 'Puertos auxiliares'],
    },
  },
  consola: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Cable de poder', 'Cable HDMI', 'Almacenamiento externo', 'Juego'], sim: false, microsdLabel: null, mandoCantidad: true, notaLibre: false },
    condicion: {
      cargaPuerto: false,
      simples: [],
      areasRayones: ['Carcasa externa', 'Bahía de discos'],
      areasHumedad: ['Puertos HDMI / USB', 'Ventilación'],
    },
  },
  mando: {
    identificacion: { imei: false, numeroSerie: false },
    accesorios: { simples: ['Cable de carga', 'Pilas / Baterías', 'Funda'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: ['Drift en palancas', 'Botones pegados'],
      areasRayones: ['Carcasa', 'Joysticks', 'Gatillos'],
      areasHumedad: ['Conector de carga', 'Compartimento de baterías'],
    },
  },
  tv: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Mando / Control', 'Cable de poder', 'Soporte / Patas'], sim: false, microsdLabel: null, mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: false,
      simples: ['Pantalla trizada', 'Líneas en el display'],
      areasRayones: ['Pantalla', 'Marco frontal', 'Carcasa trasera'],
      areasHumedad: ['Puertos HDMI', 'Placa principal'],
    },
  },
  camara: {
    identificacion: { imei: false, numeroSerie: true },
    accesorios: { simples: ['Lente / Objetivo', 'Batería', 'Cargador de batería', 'Correa'], sim: false, microsdLabel: 'Tarjeta SD / MicroSD', mandoCantidad: false, notaLibre: false },
    condicion: {
      cargaPuerto: true,
      simples: [],
      areasRayones: ['Cuerpo de la cámara', 'Lente / Cristal', 'Pantalla LCD'],
      areasHumedad: ['Compartimento de batería', 'Ranura SD'],
    },
  },
  accesorio: CONFIG_DEFAULT,
  otro: CONFIG_DEFAULT,
}

export function getConfigTipoEquipo(tipo: string | null | undefined): ConfigTipoEquipo {
  if (!tipo) return CONFIG_DEFAULT
  return CONFIG_TIPO_EQUIPO[tipo] ?? CONFIG_DEFAULT
}
