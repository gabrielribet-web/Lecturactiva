/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadingDocument } from '../types';

// Pre-designed SVG images as base64 or raw data URIs for offline consistency

const finchBeaksSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="100%" height="100%" fill="%23f8fafc" rx="12"/>
  <text x="400" y="40" font-family="'Inter', sans-serif" font-size="20" font-weight="bold" fill="%231e293b" text-anchor="middle">ADAPTACIÓN EVOLUTIVA: PINZONES DE DARWIN</text>
  <text x="400" y="65" font-family="'Inter', sans-serif" font-size="13" fill="%2364748b" text-anchor="middle">Diferenciación morfológica del pico según el nicho alimenticio</text>
  
  <!-- Finch 1: Large Beak (Seeds) -->
  <g transform="translate(80, 100)">
    <!-- Beak -->
    <path d="M 120,120 L 220,130 L 120,180 Z" fill="%23475569" stroke="%231e293b" stroke-width="3"/>
    <!-- Head -->
    <path d="M 40,150 C 40,80 120,70 120,120 C 120,180 40,210 40,150 Z" fill="%23334155" stroke="%231e293b" stroke-width="2"/>
    <!-- Eye -->
    <circle cx="95" cy="120" r="8" fill="%23000"/>
    <circle cx="97" cy="118" r="3" fill="%23fff"/>
    <!-- Label -->
    <rect x="30" y="195" width="160" height="60" rx="8" fill="%23fee2e2" stroke="%23fca5a5" stroke-width="1"/>
    <text x="110" y="215" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%23991b1b" text-anchor="middle">Geospiza magnirostris</text>
    <text x="110" y="232" font-family="'Inter', sans-serif" font-size="11" fill="%237f1d1d" text-anchor="middle">Pico grueso / Semillas</text>
    <text x="110" y="247" font-family="'Inter', sans-serif" font-size="10" fill="%23991b1b" text-anchor="middle">Tritura cáscaras duras</text>
  </g>

  <!-- Finch 2: Slender Beak (Insects) -->
  <g transform="translate(310, 100)">
    <!-- Beak -->
    <path d="M 120,125 L 230,135 L 120,150 Z" fill="%2364748b" stroke="%231e293b" stroke-width="3"/>
    <!-- Head -->
    <path d="M 40,150 C 40,80 120,75 120,125 C 120,180 40,210 40,150 Z" fill="%23475569" stroke="%231e293b" stroke-width="2"/>
    <!-- Eye -->
    <circle cx="95" cy="122" r="8" fill="%23000"/>
    <circle cx="97" cy="120" r="3" fill="%23fff"/>
    <!-- Label -->
    <rect x="30" y="195" width="160" height="60" rx="8" fill="%23dcfce7" stroke="%2386efac" stroke-width="1"/>
    <text x="110" y="215" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%23166534" text-anchor="middle">Certhidea olivacea</text>
    <text x="110" y="232" font-family="'Inter', sans-serif" font-size="11" fill="%2314532d" text-anchor="middle">Pico fino / Insectos</text>
    <text x="110" y="247" font-family="'Inter', sans-serif" font-size="10" fill="%23166534" text-anchor="middle">Precisión en grietas</text>
  </g>

  <!-- Finch 3: Medium/Sharp Beak (Cactus/Fruits) -->
  <g transform="translate(540, 100)">
    <!-- Beak -->
    <path d="M 120,120 L 215,140 L 120,165 Z" fill="%2394a3b8" stroke="%231e293b" stroke-width="3"/>
    <!-- Head -->
    <path d="M 40,150 C 40,80 120,70 120,120 C 120,180 40,210 40,150 Z" fill="%2364748b" stroke="%231e293b" stroke-width="2"/>
    <!-- Eye -->
    <circle cx="95" cy="118" r="8" fill="%23000"/>
    <circle cx="97" cy="116" r="3" fill="%23fff"/>
    <!-- Label -->
    <rect x="30" y="195" width="160" height="60" rx="8" fill="%23fef9c3" stroke="%23fde047" stroke-width="1"/>
    <text x="110" y="215" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%23854d0e" text-anchor="middle">Geospiza scandens</text>
    <text x="110" y="232" font-family="'Inter', sans-serif" font-size="11" fill="%23713f12" text-anchor="middle">Pico cónico / Cactus</text>
    <text x="110" y="247" font-family="'Inter', sans-serif" font-size="10" fill="%23854d0e" text-anchor="middle">Abre frutos de cactus</text>
  </g>
</svg>`;

const photosynthesisSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="100%" height="100%" fill="%23f0fdf4" rx="12"/>
  <text x="400" y="40" font-family="'Inter', sans-serif" font-size="20" font-weight="bold" fill="%23166534" text-anchor="middle">ESQUEMA DE LA FOTOSÍNTESIS</text>
  
  <!-- Sun -->
  <circle cx="100" cy="90" r="40" fill="%23fef08a" stroke="%23eab308" stroke-width="2"/>
  <path d="M 100,30 L 100,10 M 100,150 L 100,170 M 40,90 L 20,90 M 160,90 L 180,90 M 58,48 L 44,34 M 142,132 L 156,146 M 142,48 L 156,34 M 58,132 L 44,146" stroke="%23eab308" stroke-width="3" stroke-linecap="round"/>
  <text x="100" y="95" font-family="'Inter', sans-serif" font-size="11" font-weight="bold" fill="%23854d0e" text-anchor="middle">ENERGÍA SOLAR</text>
  
  <!-- Plant -->
  <path d="M 400,360 L 400,200" stroke="%2315803d" stroke-width="12" stroke-linecap="round"/>
  <!-- Leaves -->
  <path d="M 400,280 Q 480,240 460,200 Q 380,240 400,280" fill="%2322c55e" stroke="%2315803d" stroke-width="3"/>
  <path d="M 400,240 Q 320,200 340,160 Q 420,200 400,240" fill="%2322c55e" stroke="%2315803d" stroke-width="3"/>
  
  <!-- Roots / Ground -->
  <rect x="250" y="350" width="300" height="15" fill="%2378350f" rx="4"/>
  <path d="M 400,350 Q 380,390 350,390 M 400,350 Q 420,385 450,390" stroke="%2378350f" stroke-width="3" stroke-linecap="round"/>
  
  <!-- Incoming Elements -->
  <!-- Water H2O -->
  <path d="M 280,380 Q 340,380 370,360" stroke="%233b82f6" stroke-width="3" stroke-dasharray="6,4" fill="none"/>
  <rect x="150" y="355" width="110" height="30" rx="6" fill="%23dbeafe" stroke="%23bfdbfe"/>
  <text x="205" y="374" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%231e40af" text-anchor="middle">Agua (H₂O) + Sales</text>

  <!-- Carbon Dioxide CO2 -->
  <path d="M 250,210 Q 310,210 330,210" stroke="%2364748b" stroke-width="3" stroke-dasharray="6,4" fill="none"/>
  <rect x="110" y="195" width="130" height="30" rx="6" fill="%23f1f5f9" stroke="%23e2e8f0"/>
  <text x="175" y="214" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%23334155" text-anchor="middle">Dióxido de Carbono</text>

  <!-- Outgoing Elements -->
  <!-- Oxygen O2 -->
  <path d="M 460,190 Q 520,180 560,180" stroke="%23ef4444" stroke-width="3" stroke-dasharray="6,4" fill="none"/>
  <rect x="570" y="165" width="110" height="30" rx="6" fill="%23fee2e2" stroke="%23fca5a5"/>
  <text x="625" y="184" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%23991b1b" text-anchor="middle">Oxígeno (O₂)</text>

  <!-- Glucose C6H12O6 -->
  <path d="M 450,260 Q 510,270 560,280" stroke="%23eab308" stroke-width="3" stroke-dasharray="6,4" fill="none"/>
  <rect x="570" y="265" width="120" height="30" rx="6" fill="%23fef9c3" stroke="%23fde047"/>
  <text x="630" y="284" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="%23854d0e" text-anchor="middle">Glucosa (Energía)</text>
</svg>`;

export const preloadedDocuments: ReadingDocument[] = [
  {
    id: 'darwin-finches',
    title: 'La Teoría de la Evolución y los Pinzones de Darwin',
    format: 'html',
    imageCount: 1,
    hasImages: true,
    isCustom: false,
    createdAt: new Date('2026-07-01T12:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-01T12:00:00Z').toISOString(),
    content: `
      <div class="prose max-w-none text-slate-800">
        <header class="mb-6 pb-4 border-b border-slate-100">
          <span class="text-xs font-semibold text-indigo-600 tracking-wider uppercase">Biología Evolutiva</span>
          <h1 class="text-3xl font-bold text-slate-900 mt-1 mb-2">La Selección Natural en el Archipiélago de Galápagos</h1>
          <p class="text-sm text-slate-500">Un estudio sobre las observaciones clave realizadas por Charles Darwin en 1835.</p>
        </header>

        <section class="mb-6">
          <h2 class="text-xl font-bold text-slate-800 mb-3">1. El Viaje del HMS Beagle</h2>
          <p class="mb-4 text-justify">
            Durante su histórico viaje de cinco años alrededor del mundo a bordo del <strong>HMS Beagle</strong>, el joven naturalista Charles Darwin recopiló una cantidad ingente de especímenes geológicos, botánicos y zoológicos. Su parada de cinco semanas en el archipiélago de las Islas Galápagos resultó ser la piedra angular de lo que posteriormente formularía como la <strong>Teoría de la Evolución por Selección Natural</strong>.
          </p>
          <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg my-4">
            <p class="text-sm text-indigo-900 italic font-medium">
              "La biogeografía insular demostró que los organismos cambian gradualmente al colonizar nuevos territorios y adaptarse a nichos ecológicos vacíos."
            </p>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-bold text-slate-800 mb-3">2. La Adaptación de los Picos</h2>
          <p class="mb-4 text-justify">
            Darwin observó una docena de especies de pequeños pájaros fringílidos (conocidos hoy como los <em>pinzones de Darwin</em>). Lo que más le llamó la atención fue que, a pesar de compartir un ancestro común muy similar procedente del continente sudamericano, cada isla poseía una variedad única adaptada de forma asombrosa a las fuentes de alimentación de su entorno inmediato.
          </p>
          
          <div class="my-6">
            <img src="${finchBeaksSvg}" alt="Diferenciación morfológica del pico en los pinzones de Darwin" class="w-full h-auto rounded-lg shadow-md border border-slate-100" />
            <p class="text-xs text-slate-500 mt-2 text-center italic">Esquema 1.1: Adaptaciones morfológicas de los pinzones según su dieta dominante.</p>
          </div>

          <p class="mb-4 text-justify">
            Por ejemplo, los ejemplares de <strong>Geospiza magnirostris</strong> (pinzón grande de tierra) desarrollaron picos masivos y musculosos capaces de triturar semillas duras con cáscaras resistentes, mientras que especies como <strong>Certhidea olivacea</strong> (pinzón cantor) mantuvieron picos extremadamente delgados y precisos, ideales para atrapar pequeños insectos entre las grietas de la corteza.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-bold text-slate-800 mb-3">3. El Concepto de Presión Selectiva</h2>
          <p class="mb-4 text-justify">
            La idea central es que aquellos individuos que nacen de manera fortuita con características morfológicas ligeramente más aptas para obtener alimento tienen mayores tasas de supervivencia y reproducción. Generación tras generación, los genes de estas adaptaciones ventajosas se propagan de manera diferencial, esculpiendo así la morfología de la especie a lo largo del tiempo geológico.
          </p>
        </section>
      </div>
    `
  },
  {
    id: 'photosynthesis-process',
    title: 'La Fotosíntesis: El Motor Energético de la Biosfera',
    format: 'markdown',
    imageCount: 1,
    hasImages: true,
    isCustom: false,
    createdAt: new Date('2026-07-02T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-02T10:00:00Z').toISOString(),
    content: `# La Fotosíntesis: La Transformación de la Luz en Materia Orgánica

## Introducción al Proceso Químico
La fotosíntesis es el proceso metabólico mediante el cual las plantas, algas y ciertas bacterias capturan la **energía lumínica del Sol** y la transforman en **energía química** almacenada en moléculas orgánicas, principalmente carbohidratos como la glucosa. Este proceso es el responsable fundamental de mantener la vida en la Tierra al liberar oxígeno molecular a la atmósfera.

## Reacción Química Global
El proceso fotosintético global puede resumirse formalmente en la siguiente ecuación molecular balanceada:

**6 CO₂ (Dióxido de Carbono) + 6 H₂O (Agua) + Luz Solar &rarr; C₆H₁₂O₆ (Glucosa) + 6 O₂ (Oxígeno)**

* **Dióxido de carbono (CO₂):** Es absorbido directamente por las hojas a través de unos poros microscópicos llamados *estomas*.
* **Agua (H₂O):** Es succionada desde el subsuelo por las raíces de la planta y conducida hacia arriba mediante los vasos capilares del xilema.

![Esquema didáctico detallado del proceso metabólico celular de la fotosíntesis en una planta terrestre](${photosynthesisSvg})

## Las Dos Fases Fundamentales
El proceso consta de dos etapas perfectamente coordinadas que ocurren dentro de los cloroplastos:

1. **Fase Luminosa (Dependiente de la Luz):** Ocurre en las membranas de los *tilacoides*. La clorofila absorbe los fotones solares, rompiendo moléculas de agua (fotólisis), liberando oxígeno y produciendo moléculas altamente energéticas (ATP y NADPH).
2. **Fase Oscura o Ciclo de Calvin (Independiente de la Luz):** Tiene lugar en el *estroma*. Se utiliza el ATP y NADPH de la fase luminosa para fijar el carbono del CO₂ y sintetizar glucosa.

## Importancia Ecológica Global
La fotosíntesis es el pilar de los ecosistemas mundiales por dos motivos críticos:
* Es el inicio de la cadena trófica (productores primarios).
* Purifica la atmósfera capturando el gas de efecto invernadero (CO₂) y produciendo oxígeno libre para la respiración de todos los seres aerobios.`
  },
  {
    id: 'cosmic-expansion',
    title: 'El Descubrimiento de la Expansión Cósmica',
    format: 'text',
    imageCount: 0,
    hasImages: false,
    isCustom: false,
    createdAt: new Date('2026-07-03T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-03T09:00:00Z').toISOString(),
    content: `EL DESCUBRIMIENTO DE LA EXPANSIÓN CÓSMICA

Introducción: El Paradigma del Universo Estático
A principios del siglo XX, la mayoría de los científicos de vanguardia, incluido el célebre físico Albert Einstein, creían que el universo era inmutable y eterno. Bajo este dogma del Universo Estático, el cosmos no se contraía ni se expandía. Sin embargo, las observaciones que surgieron a fines de la década de 1920 revolucionarían para siempre la astrofísica moderna.

La Ley de Hubble-Lemaître (1929)
El astrónomo estadounidense Edwin Hubble, utilizando el potente telescopio de 100 pulgadas Hooker en el observatorio del Monte Wilson, comenzó a medir las distancias a diversas galaxias remotas y a analizar la luz que emitían. Para su sorpresa, descubrió que casi todas las galaxias exhibían un desplazamiento al rojo ("redshift") en sus espectros lumínicos.

Este desplazamiento al rojo significa que la luz se estira hacia longitudes de onda más largas a medida que recorre el espacio, lo cual es una consecuencia del Efecto Doppler aplicado a galaxias que se alejan de nosotros.

La formulación matemática que describe este fenómeno es la famosa Ley de Hubble:
v = H0 * d

Donde:
- v representa la velocidad de recesión de la galaxia alejada.
- d representa la distancia que nos separa de ella.
- H0 es la constante de Hubble, que mide el ritmo actual de expansión del espacio.

La conclusión asombrosa:
Cuanto más distante se encuentra una galaxia del observador terrestre, más rápido parece estar alejándose. Esto no implica que la Tierra sea el centro del cosmos, sino que es el propio tejido del espacio-tiempo el que se está estirando en todas direcciones por igual de forma homogénea.

La Teoría del Big Bang y el Destino del Cosmos
Si proyectamos este estiramiento hacia atrás en el tiempo geológico, se infiere lógicamente que todo el cosmos debió estar concentrado en un único punto caliente de densidad infinita hace aproximadamente 13.800 millones de años. Este punto inicial daría lugar al inicio de la expansión de nuestro universo observable en el evento conocido universalmente como el Big Bang.`
  }
];
