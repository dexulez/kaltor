// Traducciones de la landing page pública. Fase 1 del proyecto de i18n
// (landing primero, dashboard en una segunda etapa).

export type Lang = 'es' | 'pt' | 'en'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
]

// Países de habla inglesa reconocidos → 'en'. Brasil → 'pt'. Todo el resto → 'es' (mercado principal).
const PAISES_EN = new Set(['US', 'GB', 'CA', 'AU', 'NZ', 'IE'])

export function detectarIdioma(countryCode: string | null): Lang {
  const pais = (countryCode || '').toUpperCase()
  if (pais === 'BR') return 'pt'
  if (PAISES_EN.has(pais)) return 'en'
  return 'es'
}

export function esLangValido(valor: string | undefined | null): valor is Lang {
  return valor === 'es' || valor === 'pt' || valor === 'en'
}

// ── Módulos de negocio ──────────────────────────────────────────────────────
type ModuloTxt = { label: string; desc: string; ventaja: string }

export const MODULOS_TXT: Record<Lang, Record<string, ModuloTxt>> = {
  es: {
    ventas:         { label: 'Ventas',        desc: 'Caja, punto de venta, clientes y venta directa desde cualquier dispositivo.',             ventaja: 'Cobra en segundos con POS táctil. Boleta y factura integradas, sin papeleos.' },
    compras:        { label: 'Compras',       desc: 'Órdenes de compra, proveedores, recepciones y control de pagos pendientes.',             ventaja: 'Nunca pierdas trazabilidad de un pago. Cada OC, recepción y abono en un solo lugar.' },
    productos:      { label: 'Inventario',    desc: 'Control de stock, movimientos, alertas de quiebre y valorización.',                       ventaja: 'Stock en tiempo real. Alertas automáticas antes de quedarte sin mercadería.' },
    servicios:      { label: 'Servicios',     desc: 'Catálogo de servicios del taller con precios y tiempos estándar.',                       ventaja: 'Cotiza cualquier reparación en segundos con precios y tiempos predefinidos.' },
    taller:         { label: 'Taller',        desc: 'Órdenes de trabajo, seguimiento de reparaciones y etiquetas térmicas.',                   ventaja: 'Desde la recepción hasta la entrega. El cliente sabe en qué etapa está su equipo.' },
    informes:       { label: 'Informes',      desc: 'Dashboard financiero, punto de equilibrio e informes exportables a Excel.',               ventaja: 'Ve la rentabilidad de tu negocio en un vistazo. Exporta a Excel con un clic.' },
    contabilidad:   { label: 'Contabilidad',  desc: 'Libro de ingresos/egresos, IVA, PPM y preparación de declaraciones.',                    ventaja: 'IVA y PPM calculados automáticamente. Tu contador agradecerá el orden.' },
    canal_b2b:      { label: 'Canal B2B',     desc: 'Catálogo mayorista para compradores externos con pedidos y precios diferenciados.',      ventaja: 'Vende al por mayor con precios exclusivos por cliente. Tu catálogo, siempre actualizado.' },
    configuracion:  { label: 'Configuración', desc: 'Usuarios, roles, permisos y ajustes generales del sistema.',                             ventaja: 'Permisos finos por módulo y acción. Cada usuario ve solo lo que necesita.' },
    manuales:       { label: 'Manuales',      desc: 'Base de conocimiento para reparaciones con guías paso a paso y tiempos estándar por modelo y falla.', ventaja: 'Tu equipo resuelve fallas complejas sin depender de un solo técnico. Saber colectivo.' },
    conciliaciones: { label: 'Conciliaciones',desc: 'Conciliación bancaria: cruza movimientos de caja con el extracto del banco y detecta diferencias.',   ventaja: 'Detecta diferencias antes de cerrar el mes. Sin sorpresas al enfrentar la contabilidad.' },
    trazabilidad:   { label: 'Trazabilidad',  desc: 'Seguimiento de compra y venta de mercancía: desde el proveedor de origen hasta la venta final al cliente.', ventaja: 'Sabe exactamente de dónde viene cada producto y adónde fue. Auditoría y control total.' },
  },
  pt: {
    ventas:         { label: 'Vendas',         desc: 'Caixa, ponto de venda, clientes e venda direta em qualquer dispositivo.',                      ventaja: 'Receba pagamentos em segundos com PDV touch. Recibo e nota fiscal integrados, sem burocracia.' },
    compras:        { label: 'Compras',        desc: 'Ordens de compra, fornecedores, recebimentos e controle de pagamentos pendentes.',            ventaja: 'Nunca perca a rastreabilidade de um pagamento. Cada pedido, recebimento e abatimento em um só lugar.' },
    productos:      { label: 'Estoque',        desc: 'Controle de estoque, movimentações, alertas de ruptura e valorização.',                        ventaja: 'Estoque em tempo real. Alertas automáticos antes de faltar mercadoria.' },
    servicios:      { label: 'Serviços',       desc: 'Catálogo de serviços da oficina com preços e tempos padrão.',                                  ventaja: 'Orce qualquer reparo em segundos com preços e tempos predefinidos.' },
    taller:         { label: 'Oficina',        desc: 'Ordens de serviço, acompanhamento de reparos e etiquetas térmicas.',                           ventaja: 'Do recebimento à entrega. O cliente sabe em que etapa está seu equipamento.' },
    informes:       { label: 'Relatórios',     desc: 'Painel financeiro, ponto de equilíbrio e relatórios exportáveis para Excel.',                  ventaja: 'Veja a rentabilidade do seu negócio de relance. Exporte para Excel com um clique.' },
    contabilidad:   { label: 'Contabilidade',  desc: 'Livro de receitas/despesas, impostos e preparação de declarações.',                            ventaja: 'Impostos calculados automaticamente. Seu contador vai agradecer a organização.' },
    canal_b2b:      { label: 'Canal B2B',      desc: 'Catálogo atacadista para compradores externos com pedidos e preços diferenciados.',           ventaja: 'Venda no atacado com preços exclusivos por cliente. Seu catálogo, sempre atualizado.' },
    configuracion:  { label: 'Configurações',  desc: 'Usuários, perfis, permissões e ajustes gerais do sistema.',                                    ventaja: 'Permissões detalhadas por módulo e ação. Cada usuário vê só o que precisa.' },
    manuales:       { label: 'Manuais',        desc: 'Base de conhecimento para reparos com guias passo a passo e tempos padrão por modelo e defeito.', ventaja: 'Sua equipe resolve defeitos complexos sem depender de um único técnico. Conhecimento coletivo.' },
    conciliaciones: { label: 'Conciliações',   desc: 'Conciliação bancária: cruza movimentos de caixa com o extrato do banco e detecta diferenças.',  ventaja: 'Detecte diferenças antes de fechar o mês. Sem surpresas na hora da contabilidade.' },
    trazabilidad:   { label: 'Rastreabilidade',desc: 'Rastreamento de compra e venda de mercadoria: do fornecedor de origem até a venda final ao cliente.', ventaja: 'Saiba exatamente de onde vem cada produto e para onde foi. Auditoria e controle total.' },
  },
  en: {
    ventas:         { label: 'Sales',          desc: 'Register, point of sale, customers and direct sales from any device.',                  ventaja: 'Charge in seconds with a touch POS. Receipts and invoices built in, no paperwork.' },
    compras:        { label: 'Purchasing',     desc: 'Purchase orders, suppliers, receiving and pending payment tracking.',                    ventaja: 'Never lose track of a payment. Every PO, receipt and payment in one place.' },
    productos:      { label: 'Inventory',      desc: 'Stock control, movements, low-stock alerts and valuation.',                              ventaja: 'Real-time stock. Automatic alerts before you run out of goods.' },
    servicios:      { label: 'Services',       desc: 'Catalog of repair shop services with standard prices and times.',                       ventaja: 'Quote any repair in seconds with predefined prices and turnaround times.' },
    taller:         { label: 'Repair Shop',    desc: 'Work orders, repair tracking and thermal labels.',                                       ventaja: 'From intake to delivery. The customer always knows what stage their device is in.' },
    informes:       { label: 'Reports',        desc: 'Financial dashboard, break-even point and reports exportable to Excel.',                 ventaja: 'See your business profitability at a glance. Export to Excel with one click.' },
    contabilidad:   { label: 'Accounting',     desc: 'Income/expense ledger, taxes and filing preparation.',                                   ventaja: 'Taxes calculated automatically. Your accountant will thank you for the order.' },
    canal_b2b:      { label: 'B2B Channel',    desc: 'Wholesale catalog for external buyers with orders and tiered pricing.',                  ventaja: 'Sell wholesale with exclusive prices per customer. Your catalog, always up to date.' },
    configuracion:  { label: 'Settings',       desc: 'Users, roles, permissions and general system settings.',                                 ventaja: 'Fine-grained permissions per module and action. Each user sees only what they need.' },
    manuales:       { label: 'Manuals',        desc: 'Knowledge base for repairs with step-by-step guides and standard times per model and issue.', ventaja: 'Your team solves complex issues without depending on a single technician. Shared knowledge.' },
    conciliaciones: { label: 'Reconciliation', desc: 'Bank reconciliation: matches register movements with the bank statement and flags differences.', ventaja: 'Catch differences before closing the month. No surprises at accounting time.' },
    trazabilidad:   { label: 'Traceability',   desc: 'Track purchases and sales of goods: from the original supplier to the final sale to the customer.', ventaja: 'Know exactly where each product came from and where it went. Full audit and control.' },
  },
}

// ── Planes ────────────────────────────────────────────────────────────────
type PlanTxt = { nombre: string; usuarios: string; addon?: string }

export const PLANES_TXT: Record<Lang, Record<string, PlanTxt>> = {
  es: {
    'basico':              { nombre: 'Básico',              usuarios: '1 usuario · 1 sesión' },
    'pro':                 { nombre: 'Pro',                 usuarios: 'Multiusuario' },
    'taller-basico':       { nombre: 'Taller Básico',       usuarios: '1 usuario · 1 sesión' },
    'taller-basico-5u':    { nombre: 'Taller Básico 5U',    usuarios: 'Hasta 5 usuarios' },
    'taller-multiusuario': { nombre: 'Taller Multiusuario', usuarios: 'Usuarios ilimitados' },
    'taller-pro':          { nombre: 'Taller Pro',          usuarios: 'Multiusuario + informes' },
    'taller-multi-tienda': { nombre: 'Taller Multi-tienda', usuarios: 'Multi-usuario · Multi-sucursal', addon: 'Incluye Canal B2B' },
  },
  pt: {
    'basico':              { nombre: 'Básico',              usuarios: '1 usuário · 1 sessão' },
    'pro':                 { nombre: 'Pro',                 usuarios: 'Multiusuário' },
    'taller-basico':       { nombre: 'Oficina Básico',      usuarios: '1 usuário · 1 sessão' },
    'taller-basico-5u':    { nombre: 'Oficina Básico 5U',   usuarios: 'Até 5 usuários' },
    'taller-multiusuario': { nombre: 'Oficina Multiusuário',usuarios: 'Usuários ilimitados' },
    'taller-pro':          { nombre: 'Oficina Pro',         usuarios: 'Multiusuário + relatórios' },
    'taller-multi-tienda': { nombre: 'Oficina Multi-loja',  usuarios: 'Multiusuário · Multi-loja', addon: 'Inclui Canal B2B' },
  },
  en: {
    'basico':              { nombre: 'Basic',                     usuarios: '1 user · 1 session' },
    'pro':                 { nombre: 'Pro',                       usuarios: 'Multi-user' },
    'taller-basico':       { nombre: 'Repair Shop Basic',         usuarios: '1 user · 1 session' },
    'taller-basico-5u':    { nombre: 'Repair Shop Basic 5U',      usuarios: 'Up to 5 users' },
    'taller-multiusuario': { nombre: 'Repair Shop Multi-user',    usuarios: 'Unlimited users' },
    'taller-pro':          { nombre: 'Repair Shop Pro',           usuarios: 'Multi-user + reports' },
    'taller-multi-tienda': { nombre: 'Repair Shop Multi-location',usuarios: 'Multi-user · Multi-location', addon: 'Includes B2B Channel' },
  },
}

// ── Resto de la landing ──────────────────────────────────────────────────────
export type LandingTxt = {
  nav: { modulos: string; planes: string; contacto: string; entrar: string }
  hero: { kicker: string; titleLine1: string; titleHighlight: string; subtitle: string; ctaStart: string; ctaPlans: string; hint: string }
  modulosSection: { kicker: string; title: (n: number) => string; subtitle: string }
  paraQuienEs: {
    kicker: string; title: string; subtitle: string
    negocios: { titulo: string; texto: string; beneficio: string }[]
    facilTitle1: string; facilTitle2: string
    facil: { texto: string }[]
    recomendacionPre: string; recomendacionBold: string; recomendacionLink: string
  }
  ventajasKaltor: {
    kicker: string; titleLine1: string; titleHighlight: string; subtitle: string
    items: { titulo: string; texto: string }[]
    ctaTitle: string; ctaSubtitle: string; ctaButton: string
  }
  misionVision: {
    kicker: string; titleLine1: string; titlePre2: string; titleHighlight: string
    misionLabel: string; misionTitle: string; misionText: string
    visionLabel: string; visionTitle: string; visionText: string
    stats: { valor: string; label: string }[]
  }
  planes: {
    kicker: string; title: string; mensual: string; anual: string; ahorra: string
    familiaBasico: string; familiaTaller: string; familiaMulti: string
    masElegido: string; comenzarGratis: string; sufijoMes: string; sufijoAnio: string
    cobroReal: string
    comparativa: { kicker: string; title: string; modulo: string; usuarios: string; precioMes: string; mesSufijo: string; elegir: string; footnoteClp: string; footnoteConversion: string }
  }
  comoFunciona: { kicker: string; title: string; pasos: { titulo: string; desc: string }[] }
  footer: { entrar: string; footnoteClp: string }
  chat: { welcome: string; placeholder: string }
}

export const LANDING_TXT: Record<Lang, LandingTxt> = {
  es: {
    nav: { modulos: 'Módulos', planes: 'Planes', contacto: 'Contacto', entrar: 'Entrar →' },
    hero: { kicker: 'Sistema de gestión modular', titleLine1: 'El sistema que enciendes', titleHighlight: 'módulo por módulo.', subtitle: 'Ventas, inventario, compras, taller — paga solo por lo que tu negocio usa.', ctaStart: 'Comenzar gratis →', ctaPlans: 'Ver planes', hint: 'Haz clic en cualquier módulo para saber más' },
    modulosSection: { kicker: 'Módulos', title: n => `${n} módulos de negocio.`, subtitle: 'Activa los que tu empresa necesita hoy. Cada módulo es independiente — si no lo usas, no lo pagas.' },
    paraQuienEs: {
      kicker: 'Para quién es Kaltor',
      title: 'Hecho para negocios que compran, venden o reparan.',
      subtitle: 'No importa el rubro: si necesitas orden en tu inventario, tus ventas y tus números, Kaltor calza con tu negocio.',
      negocios: [
        { titulo: 'Talleres de reparación', texto: 'Celulares, notebooks, electrodomésticos o motos — controla cada orden de trabajo de principio a fin.', beneficio: 'Cada equipo que entra queda con su propia orden de trabajo: fotos, clave de acceso y estado en tiempo real. Tu cliente sigue el avance desde un link sin llamarte, y tú controlas repuestos, tiempos y la ganancia real de cada reparación.' },
        { titulo: 'Tiendas y minimarkets', texto: 'Punto de venta rápido, boletas al instante y stock siempre bajo control.', beneficio: 'El punto de venta cobra en segundos y emite boleta o factura al instante. Cada venta descuenta el stock automáticamente, así que siempre sabes qué se está vendiendo y qué reponer antes de quedarte sin nada.' },
        { titulo: 'Ferreterías y bodegas', texto: 'Miles de productos, cero descuadres. Alertas antes de quedarte sin stock.', beneficio: 'Con miles de productos es fácil perder el control: Kaltor te avisa antes de que se acabe el stock, valoriza todo tu inventario y te muestra qué rota más, para comprar mejor y no descuadrar la caja.' },
        { titulo: 'Distribuidoras y mayoristas', texto: 'Vende al por mayor con catálogo B2B y precios diferenciados por cliente.', beneficio: 'Tu catálogo queda disponible para que tus clientes pidan solos, con precios distintos por cliente o volumen. Tú apruebas, despachas y controlas los cobros sin perder tiempo tomando pedidos por WhatsApp.' },
        { titulo: 'Pymes y emprendimientos', texto: 'Si compras, vendes o entregas un servicio, necesitas saber cuánto ganas. Kaltor te lo muestra.', beneficio: 'Aunque seas un equipo chico, sabrás cuánto ganas de verdad: ventas, costos, IVA y punto de equilibrio en un panel simple. Partes gratis y activas solo los módulos que tu negocio necesita hoy.' },
      ],
      facilTitle1: 'Fácil desde', facilTitle2: 'el primer día.',
      facil: [
        { texto: 'Sin instalar nada — funciona desde el navegador' },
        { texto: 'Tu equipo aprende a usarlo en minutos, no en semanas' },
        { texto: 'Celular, tablet o computador: mismo sistema, siempre a mano' },
      ],
      recomendacionPre: 'Si tu negocio se parece a alguno de estos, es muy probable que ',
      recomendacionBold: 'Kaltor ya esté pensado para ti',
      recomendacionLink: 'Descubre tu plan →',
    },
    ventajasKaltor: {
      kicker: 'Sin excusas',
      titleLine1: 'El desorden te está costando dinero',
      titleHighlight: 'ahora mismo.',
      subtitle: 'Cada día sin claridad es un día de decisiones mal tomadas, gastos sin detectar y oportunidades que se van. Kaltor no es una opción — es la diferencia entre saber y adivinar.',
      items: [
        { titulo: 'Sabes exactamente dónde estás', texto: 'Cada peso ingresado, cada gasto registrado. Todo visible en tiempo real.' },
        { titulo: 'Tu competencia ya tomó la decisión', texto: 'Los que crecen tienen orden y datos. Los que no, adivinan. ¿De qué lado estás?' },
        { titulo: 'El desorden silencioso cuesta caro', texto: 'Registros olvidados, gastos sin detectar. Cuando los ves, ya es tarde.' },
        { titulo: 'Operativo desde el primer minuto', texto: 'Sin capacitaciones ni manuales. Tu equipo empieza a usarlo hoy.' },
        { titulo: 'Pagas solo lo que usas', texto: 'Sin módulos que no necesitas. Escalas cuando tú decides, no cuando te lo imponen.' },
        { titulo: 'Tu negocio no para. Tu sistema tampoco.', texto: 'Celular, tablet o computador. Siempre disponible, siempre sincronizado.' },
      ],
      ctaTitle: '¿Cuánto más vas a operar a ciegas?',
      ctaSubtitle: 'Empieza gratis hoy. Sin tarjeta de crédito. Sin compromisos.',
      ctaButton: 'Comenzar gratis →',
    },
    misionVision: {
      kicker: 'Por qué existe Kaltor',
      titleLine1: 'Saber exactamente cuánto ganas,', titlePre2: 'cuánto gastas y ', titleHighlight: 'qué tan efectivo eres.',
      misionLabel: 'Misión', misionTitle: 'Orden real para tu emprendimiento.',
      misionText: 'Entregamos a cada emprendedor una herramienta simple para controlar su negocio sin complicaciones — sin hojas de cálculo desordenadas, sin números perdidos, sin adivinar si el mes fue bueno o malo. Solo claridad: lo que entra, lo que sale y lo que queda.',
      visionLabel: 'Visión', visionTitle: 'Ningún negocio opera a ciegas.',
      visionText: 'Que cualquier negocio tome decisiones con datos reales, sin importar su tamaño o rubro. Con información clara y ordenada, los emprendedores crecen con más seguridad, reducen sus pérdidas y construyen algo que dura.',
      stats: [{ valor: '12', label: 'módulos de negocio' }, { valor: '7', label: 'planes disponibles' }, { valor: '1', label: 'objetivo: tu control total' }],
    },
    planes: {
      kicker: 'Planes', title: 'Elige tu plan.', mensual: 'Mensual', anual: 'Anual', ahorra: '· ahorra 2 meses',
      familiaBasico: 'Familia básico', familiaTaller: 'Familia taller', familiaMulti: 'Multi-sucursal',
      masElegido: 'Más elegido', comenzarGratis: 'Comenzar gratis', sufijoMes: '/mes + IVA', sufijoAnio: '/año + IVA',
      cobroReal: 'Cobro real:',
      comparativa: { kicker: 'Comparativa', title: 'Todos los planes, de un vistazo.', modulo: 'Módulo', usuarios: 'Usuarios', precioMes: 'Precio/mes', mesSufijo: '/mes', elegir: 'Elegir', footnoteClp: 'Precios en CLP · IVA no incluido', footnoteConversion: ' · conversión referencial, el cobro siempre es en CLP' },
    },
    comoFunciona: {
      kicker: 'Cómo funciona', title: 'Tres pasos para empezar.',
      pasos: [
        { titulo: 'Elige tu plan', desc: 'Selecciona el plan que calce con tu negocio hoy. Puedes cambiar o escalar cuando lo necesites.' },
        { titulo: 'Enciende tus módulos', desc: 'Activa exactamente los módulos que usas. Cada uno es un interruptor: lo prendes, lo apagas.' },
        { titulo: 'Empieza a operar', desc: 'Accede desde cualquier dispositivo, sin instalar nada. Tu equipo listo para trabajar en minutos.' },
      ],
    },
    footer: { entrar: 'Entrar', footnoteClp: 'Precios en CLP · IVA no incluido' },
    chat: { welcome: '¡Hola! Soy el asistente de Kaltor 👋 ¿Te ayudo a elegir un plan o tienes alguna pregunta sobre los módulos?', placeholder: 'Pregúntame sobre planes, módulos o precios…' },
  },
  pt: {
    nav: { modulos: 'Módulos', planes: 'Planos', contacto: 'Contato', entrar: 'Entrar →' },
    hero: { kicker: 'Sistema de gestão modular', titleLine1: 'O sistema que você liga', titleHighlight: 'módulo por módulo.', subtitle: 'Vendas, estoque, compras, oficina — pague só pelo que seu negócio usa.', ctaStart: 'Comece grátis →', ctaPlans: 'Ver planos', hint: 'Clique em qualquer módulo para saber mais' },
    modulosSection: { kicker: 'Módulos', title: n => `${n} módulos de negócio.`, subtitle: 'Ative os que sua empresa precisa hoje. Cada módulo é independente — se você não usa, não paga.' },
    paraQuienEs: {
      kicker: 'Para quem é o Kaltor',
      title: 'Feito para negócios que compram, vendem ou consertam.',
      subtitle: 'Não importa o ramo: se você precisa de ordem no seu estoque, nas suas vendas e nos seus números, o Kaltor combina com seu negócio.',
      negocios: [
        { titulo: 'Assistências técnicas', texto: 'Celulares, notebooks, eletrodomésticos ou motos — controle cada ordem de serviço do início ao fim.', beneficio: 'Cada aparelho que entra ganha sua própria ordem de serviço: fotos, senha de acesso e status em tempo real. Seu cliente acompanha o andamento por um link, sem precisar te ligar, e você controla peças, prazos e o lucro real de cada conserto.' },
        { titulo: 'Lojas e mercadinhos', texto: 'PDV rápido, recibos na hora e estoque sempre sob controle.', beneficio: 'O PDV recebe pagamentos em segundos e emite o recibo ou nota fiscal na hora. Cada venda baixa o estoque automaticamente, então você sempre sabe o que está vendendo e o que repor antes de faltar.' },
        { titulo: 'Lojas de material e depósitos', texto: 'Milhares de produtos, zero divergências. Alertas antes de faltar estoque.', beneficio: 'Com milhares de produtos é fácil perder o controle: o Kaltor avisa antes de faltar estoque, valoriza todo o seu inventário e mostra o que mais gira, para comprar melhor e não ter divergência de caixa.' },
        { titulo: 'Distribuidoras e atacadistas', texto: 'Venda no atacado com catálogo B2B e preços diferenciados por cliente.', beneficio: 'Seu catálogo fica disponível para os clientes pedirem sozinhos, com preços diferentes por cliente ou volume. Você aprova, despacha e controla os pagamentos sem perder tempo anotando pedido por WhatsApp.' },
        { titulo: 'PMEs e empreendedores', texto: 'Se você compra, vende ou presta um serviço, precisa saber quanto ganha. O Kaltor mostra isso.', beneficio: 'Mesmo sendo uma equipe pequena, você vai saber quanto realmente ganha: vendas, custos, impostos e ponto de equilíbrio num painel simples. Comece grátis e ative só os módulos que seu negócio precisa hoje.' },
      ],
      facilTitle1: 'Fácil desde', facilTitle2: 'o primeiro dia.',
      facil: [
        { texto: 'Sem instalar nada — funciona no navegador' },
        { texto: 'Sua equipe aprende a usar em minutos, não em semanas' },
        { texto: 'Celular, tablet ou computador: mesmo sistema, sempre à mão' },
      ],
      recomendacionPre: 'Se o seu negócio se parece com algum destes, é bem provável que ',
      recomendacionBold: 'o Kaltor já tenha sido pensado para você',
      recomendacionLink: 'Descubra seu plano →',
    },
    ventajasKaltor: {
      kicker: 'Sem desculpas',
      titleLine1: 'A desorganização está custando dinheiro',
      titleHighlight: 'agora mesmo.',
      subtitle: 'Cada dia sem clareza é um dia de decisões mal tomadas, gastos não detectados e oportunidades perdidas. O Kaltor não é uma opção — é a diferença entre saber e adivinhar.',
      items: [
        { titulo: 'Você sabe exatamente onde está', texto: 'Cada real que entra, cada gasto registrado. Tudo visível em tempo real.' },
        { titulo: 'Sua concorrência já decidiu', texto: 'Quem cresce tem ordem e dados. Quem não tem, adivinha. De que lado você está?' },
        { titulo: 'A desorganização silenciosa custa caro', texto: 'Registros esquecidos, gastos não detectados. Quando você percebe, já é tarde.' },
        { titulo: 'Operando desde o primeiro minuto', texto: 'Sem treinamentos nem manuais. Sua equipe começa a usar hoje.' },
        { titulo: 'Você paga só o que usa', texto: 'Sem módulos que você não precisa. Você escala quando decide, não quando te impõem.' },
        { titulo: 'Seu negócio não para. Seu sistema também não.', texto: 'Celular, tablet ou computador. Sempre disponível, sempre sincronizado.' },
      ],
      ctaTitle: 'Até quando você vai operar às cegas?',
      ctaSubtitle: 'Comece grátis hoje. Sem cartão de crédito. Sem compromisso.',
      ctaButton: 'Comece grátis →',
    },
    misionVision: {
      kicker: 'Por que o Kaltor existe',
      titleLine1: 'Saber exatamente quanto você ganha,', titlePre2: 'quanto gasta e ', titleHighlight: 'quão eficiente você é.',
      misionLabel: 'Missão', misionTitle: 'Ordem de verdade para o seu empreendimento.',
      misionText: 'Entregamos a cada empreendedor uma ferramenta simples para controlar o negócio sem complicação — sem planilhas bagunçadas, sem números perdidos, sem adivinhar se o mês foi bom ou ruim. Só clareza: o que entra, o que sai e o que sobra.',
      visionLabel: 'Visão', visionTitle: 'Nenhum negócio opera às cegas.',
      visionText: 'Que qualquer negócio tome decisões com dados reais, não importa o tamanho ou o ramo. Com informação clara e organizada, os empreendedores crescem com mais segurança, reduzem suas perdas e constroem algo que dura.',
      stats: [{ valor: '12', label: 'módulos de negócio' }, { valor: '7', label: 'planos disponíveis' }, { valor: '1', label: 'objetivo: seu controle total' }],
    },
    planes: {
      kicker: 'Planos', title: 'Escolha seu plano.', mensual: 'Mensal', anual: 'Anual', ahorra: '· economize 2 meses',
      familiaBasico: 'Família básico', familiaTaller: 'Família oficina', familiaMulti: 'Multi-loja',
      masElegido: 'Mais escolhido', comenzarGratis: 'Comece grátis', sufijoMes: '/mês + impostos', sufijoAnio: '/ano + impostos',
      cobroReal: 'Cobrança real:',
      comparativa: { kicker: 'Comparativo', title: 'Todos os planos, de relance.', modulo: 'Módulo', usuarios: 'Usuários', precioMes: 'Preço/mês', mesSufijo: '/mês', elegir: 'Escolher', footnoteClp: 'Preços em CLP (peso chileno) · impostos não incluídos', footnoteConversion: ' · conversão referencial, a cobrança é sempre em CLP' },
    },
    comoFunciona: {
      kicker: 'Como funciona', title: 'Três passos para começar.',
      pasos: [
        { titulo: 'Escolha seu plano', desc: 'Selecione o plano que combina com seu negócio hoje. Você pode mudar ou escalar quando precisar.' },
        { titulo: 'Ligue seus módulos', desc: 'Ative exatamente os módulos que você usa. Cada um é um interruptor: liga, desliga.' },
        { titulo: 'Comece a operar', desc: 'Acesse de qualquer dispositivo, sem instalar nada. Sua equipe pronta para trabalhar em minutos.' },
      ],
    },
    footer: { entrar: 'Entrar', footnoteClp: 'Preços em CLP (peso chileno) · impostos não incluídos' },
    chat: { welcome: 'Olá! Sou o assistente do Kaltor 👋 Posso te ajudar a escolher um plano ou tirar dúvidas sobre os módulos?', placeholder: 'Pergunte sobre planos, módulos ou preços…' },
  },
  en: {
    nav: { modulos: 'Modules', planes: 'Plans', contacto: 'Contact', entrar: 'Log in →' },
    hero: { kicker: 'Modular management system', titleLine1: 'The system you switch on', titleHighlight: 'module by module.', subtitle: 'Sales, inventory, purchasing, repair shop — pay only for what your business uses.', ctaStart: 'Start for free →', ctaPlans: 'View plans', hint: 'Click any module to learn more' },
    modulosSection: { kicker: 'Modules', title: n => `${n} business modules.`, subtitle: "Turn on the ones your company needs today. Each module is independent — if you don't use it, you don't pay for it." },
    paraQuienEs: {
      kicker: 'Who Kaltor is for',
      title: 'Built for businesses that buy, sell or repair.',
      subtitle: 'No matter your industry: if you need order in your inventory, your sales and your numbers, Kaltor fits your business.',
      negocios: [
        { titulo: 'Repair shops', texto: 'Phones, laptops, appliances or motorcycles — track every work order from start to finish.', beneficio: 'Every device that comes in gets its own work order: photos, an access code and real-time status. Your customer tracks progress through a link without calling you, while you control parts, turnaround times and the real profit on every repair.' },
        { titulo: 'Stores and minimarkets', texto: 'Fast point of sale, instant receipts and stock always under control.', beneficio: "The point of sale charges in seconds and prints a receipt or invoice instantly. Every sale deducts stock automatically, so you always know what's selling and what to restock before you run out." },
        { titulo: 'Hardware stores and warehouses', texto: 'Thousands of products, zero mismatches. Alerts before you run out of stock.', beneficio: "With thousands of products it's easy to lose control: Kaltor warns you before you run out of stock, values your entire inventory and shows what sells fastest, so you buy smarter and never come up short at closing." },
        { titulo: 'Distributors and wholesalers', texto: 'Sell wholesale with a B2B catalog and tiered pricing per customer.', beneficio: 'Your catalog is available for customers to order on their own, with different prices by customer or volume. You approve, ship and track payments without wasting time taking orders over WhatsApp.' },
        { titulo: 'SMBs and entrepreneurs', texto: 'If you buy, sell or deliver a service, you need to know how much you make. Kaltor shows you.', beneficio: "Even as a small team, you'll know exactly how much you make: sales, costs, taxes and break-even point in one simple dashboard. Start for free and turn on only the modules your business needs today." },
      ],
      facilTitle1: 'Easy from', facilTitle2: 'day one.',
      facil: [
        { texto: 'Nothing to install — works from the browser' },
        { texto: 'Your team learns to use it in minutes, not weeks' },
        { texto: 'Phone, tablet or computer: same system, always at hand' },
      ],
      recomendacionPre: 'If your business looks like any of these, chances are ',
      recomendacionBold: 'Kaltor was already built for you',
      recomendacionLink: 'Discover your plan →',
    },
    ventajasKaltor: {
      kicker: 'No excuses',
      titleLine1: 'Disorganization is costing you money',
      titleHighlight: 'right now.',
      subtitle: "Every day without clarity is a day of bad decisions, undetected expenses and missed opportunities. Kaltor isn't optional — it's the difference between knowing and guessing.",
      items: [
        { titulo: 'You know exactly where you stand', texto: 'Every dollar in, every expense logged. All visible in real time.' },
        { titulo: 'Your competitors already made the call', texto: "Those who grow have order and data. Those who don't, guess. Which side are you on?" },
        { titulo: 'Silent disorder costs you dearly', texto: "Forgotten records, undetected expenses. By the time you see them, it's too late." },
        { titulo: 'Up and running from minute one', texto: 'No training, no manuals. Your team starts using it today.' },
        { titulo: 'You only pay for what you use', texto: "No modules you don't need. You scale when you decide, not when you're forced to." },
        { titulo: 'Your business never stops. Neither does your system.', texto: 'Phone, tablet or computer. Always available, always in sync.' },
      ],
      ctaTitle: 'How much longer will you fly blind?',
      ctaSubtitle: 'Start for free today. No credit card. No commitments.',
      ctaButton: 'Start for free →',
    },
    misionVision: {
      kicker: 'Why Kaltor exists',
      titleLine1: 'Know exactly how much you earn,', titlePre2: 'how much you spend and ', titleHighlight: 'how effective you are.',
      misionLabel: 'Mission', misionTitle: 'Real order for your venture.',
      misionText: "We give every entrepreneur a simple tool to run their business without complications — no messy spreadsheets, no lost numbers, no guessing whether the month was good or bad. Just clarity: what comes in, what goes out and what's left.",
      visionLabel: 'Vision', visionTitle: 'No business operates blind.',
      visionText: 'That any business can make decisions with real data, regardless of size or industry. With clear, organized information, entrepreneurs grow with more confidence, cut their losses and build something that lasts.',
      stats: [{ valor: '12', label: 'business modules' }, { valor: '7', label: 'available plans' }, { valor: '1', label: 'goal: your full control' }],
    },
    planes: {
      kicker: 'Plans', title: 'Choose your plan.', mensual: 'Monthly', anual: 'Yearly', ahorra: '· save 2 months',
      familiaBasico: 'Basic family', familiaTaller: 'Repair shop family', familiaMulti: 'Multi-location',
      masElegido: 'Most popular', comenzarGratis: 'Start for free', sufijoMes: '/mo + tax', sufijoAnio: '/yr + tax',
      cobroReal: 'Actual charge:',
      comparativa: { kicker: 'Comparison', title: 'All plans, at a glance.', modulo: 'Module', usuarios: 'Users', precioMes: 'Price/mo', mesSufijo: '/mo', elegir: 'Choose', footnoteClp: 'Prices in CLP (Chilean pesos) · tax not included', footnoteConversion: ' · reference conversion, the charge is always in CLP' },
    },
    comoFunciona: {
      kicker: 'How it works', title: 'Three steps to get started.',
      pasos: [
        { titulo: 'Choose your plan', desc: 'Pick the plan that fits your business today. You can change or scale up whenever you need.' },
        { titulo: 'Turn on your modules', desc: 'Activate exactly the modules you use. Each one is a switch: turn it on, turn it off.' },
        { titulo: 'Start operating', desc: 'Access from any device, nothing to install. Your team ready to work in minutes.' },
      ],
    },
    footer: { entrar: 'Log in', footnoteClp: 'Prices in CLP (Chilean pesos) · tax not included' },
    chat: { welcome: "Hi! I'm the Kaltor assistant 👋 Want help choosing a plan or have a question about the modules?", placeholder: 'Ask about plans, modules or pricing…' },
  },
}
