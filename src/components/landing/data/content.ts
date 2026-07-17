// Copy de las secciones nuevas del landing (español). Todo el contenido marcado
// como "ejemplo" es ilustrativo — no son cifras ni testimonios reales todavía.

export const ESTADISTICAS = [
  { valor: '+5.000', label: 'negocios usarían un sistema así', ejemplo: true },
  { valor: '+10M', label: 'ventas procesadas / año (ejemplo)', ejemplo: true },
  { valor: '99.9%', label: 'disponibilidad objetivo', ejemplo: true },
  { valor: '12', label: 'módulos reales incluidos', ejemplo: false },
] as const

export const TESTIMONIOS = [
  {
    nombre: 'Taller Ejemplo',
    rubro: 'Taller mecánico',
    texto: 'Con un sistema como Kaltor podríamos ver en segundos qué se vendió hoy y qué repuestos hay que reponer, sin planillas sueltas.',
  },
  {
    nombre: 'Tienda Ejemplo',
    rubro: 'Retail de barrio',
    texto: 'La idea de tener ventas, inventario y caja en un solo lugar — sin depender de tres programas distintos — es justo lo que un negocio chico necesita.',
  },
  {
    nombre: 'Distribuidora Ejemplo',
    rubro: 'Distribución B2B',
    texto: 'Poder controlar compras, proveedores y reportes desde el mismo panel simplificaría mucho el cierre de mes.',
  },
] as const

export const LOGOS_PLACEHOLDER = ['Negocio A', 'Negocio B', 'Negocio C', 'Negocio D', 'Negocio E', 'Negocio F']

export const COMPARACION = [
  { sin: 'Planillas Excel desordenadas y duplicadas', con: 'Todo tu negocio en un solo sistema, en la nube' },
  { sin: 'No sabes cuánto vendiste hoy hasta cuadrar caja', con: 'Ventas y caja en tiempo real, siempre a la vista' },
  { sin: 'Stock que se pierde o se agota sin aviso', con: 'Alertas automáticas de stock bajo' },
  { sin: 'Reportes armados a mano, una vez al mes', con: 'Reportes e indicadores generados al instante' },
  { sin: 'Cada sucursal o dispositivo con su propia información', con: 'Un mismo dato, sincronizado en todos tus dispositivos' },
  { sin: 'Decisiones "a ojo", sin datos reales', con: 'Decisiones basadas en información actualizada' },
] as const

export const PASOS_FUNCIONA = [
  { num: '01', titulo: 'Registra tus productos', desc: 'Carga tu inventario, precios y servicios una sola vez.' },
  { num: '02', titulo: 'Vende', desc: 'Cobra desde el punto de venta en mostrador, taller o reparto.' },
  { num: '03', titulo: 'Controla tu inventario', desc: 'El stock se descuenta solo y te avisa cuando algo se agota.' },
  { num: '04', titulo: 'Obtén reportes', desc: 'Ventas, utilidades y compras, siempre actualizados.' },
  { num: '05', titulo: 'Toma mejores decisiones', desc: 'Con datos reales de tu negocio, no con suposiciones.' },
] as const

export const AI_PREGUNTAS = [
  { pregunta: '¿Cuánto vendí hoy?', respuesta: 'Hoy llevas $487.300 en 23 ventas, un 12% más que ayer.' },
  { pregunta: '¿Qué producto deja mayor utilidad?', respuesta: 'Filtro de aceite premium: 48% de margen promedio este mes.' },
  { pregunta: '¿Qué debo comprar mañana?', respuesta: '3 productos bajo el stock mínimo: pastillas de freno, aceite 20W-50 y correas.' },
  { pregunta: '¿Cuáles clientes compran más?', respuesta: 'Tus 5 mejores clientes generan el 34% de tus ventas del mes.' },
] as const

export const AUTOMATIZACIONES = [
  { titulo: 'Stock bajo', desc: 'Te avisa antes de que un producto se agote, con sugerencia de reposición.' },
  { titulo: 'Pagos pendientes', desc: 'Alerta automática de clientes con crédito vencido o por vencer.' },
  { titulo: 'Recordatorios de servicio', desc: 'Notifica cuando una orden de taller lleva demasiado tiempo sin avanzar.' },
  { titulo: 'Cierres de caja', desc: 'Aviso si una caja quedó abierta o con una diferencia sin justificar.' },
] as const

export const SEGURIDAD = [
  { titulo: 'Respaldo automático', desc: 'Tu información se respalda todos los días, sin que tengas que hacer nada.' },
  { titulo: '100% en la nube', desc: 'Accede desde cualquier lugar, sin depender de un computador específico.' },
  { titulo: 'Datos cifrados', desc: 'La información viaja y se guarda cifrada de extremo a extremo.' },
  { titulo: 'Permisos por usuario', desc: 'Decides qué puede ver y hacer cada persona de tu equipo.' },
] as const

export const FAQ = [
  { p: '¿Necesito instalar algo?', r: 'No. Kaltor funciona 100% desde el navegador, en computador, tablet o celular.' },
  { p: '¿Puedo cambiar de plan más adelante?', r: 'Sí, puedes subir o bajar de plan cuando quieras desde tu panel de facturación.' },
  { p: '¿Mis datos están seguros?', r: 'Sí, se respaldan automáticamente y viajan cifrados. Nadie más que tu equipo accede a tu información.' },
  { p: '¿Hay contrato de permanencia?', r: 'No, los planes son mensuales o anuales y puedes cancelar cuando quieras.' },
  { p: '¿Ofrecen soporte?', r: 'Sí, por chat y WhatsApp, incluido en todos los planes.' },
] as const
