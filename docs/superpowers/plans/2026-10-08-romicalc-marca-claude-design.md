# RomiCalc: logo y marca con Claude Design

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail + logo-design (solo como guía de oficio). Reemplaza la Fase B del [plan de RomiCalc](2026-10-08-romicalc.md). Estado: **Q1–Q6 respondidas, en ejecución**.

**Por qué:** al usuario no le gustó ninguno de los 4 conceptos (estribo, viga I, zapata, barras y nudos). Se rehace el logo y además se arma la marca completa en **Claude Design** (artefactos de claude.ai), donde se ven las opciones en un lienzo y se pueden comentar.

## Qué hay disponible (verificado)
- Tipo **Design**: lienzo con varias mesas de trabajo lado a lado. Sirve para explorar logos y ver cómo quedan en la app.
- Tipo **Design System**: la marca en un solo lugar (logo, colores, letras, tono, piezas de interfaz). Hoy la cuenta no tiene ninguno; se crea el primero.
- Los dos quedan **privados** en tu cuenta de claude.ai hasta que tú decidas compartirlos.

## Pasos
1. **Brief corto** con tus respuestas a Q1–Q3 (qué no gustó, tipo de logo, cómo debe sentirse).
2. **Lienzo de exploración (Design):** 6–8 direcciones de logo nuevas en negro, cada una con su idea en una línea, a tamaño grande, junto al nombre y a 32/16 px. Tú comentas en el lienzo o aquí; se itera hasta elegir una.
3. **Prueba en contexto (mismo lienzo):** el logo elegido en la portada, la barra superior, la pestaña del navegador y el PDF de la memoria.
4. **Sistema de marca (Design System):** logo (versiones horizontal, apilada, solo símbolo, una tinta y negativo), paleta, tipografía, tono de voz y piezas de la app (botones, anillos de chequeo, fichas).
5. **Traer a la app:** el logo final en SVG a `assets/logo/` y `js/nucleo/logo.js`; los colores como variables en `css/air.css` (si Q4 lo pide). Esto empalma con la Fase C (renombrar a RomiCalc).
6. PROGRESO.md: casilla B y fila de checkpoint, en el mismo commit.

## Decisiones (con recomendación)
- **Q1. Qué no funcionó de los 4.** Es lo más útil para no repetir el error. Opciones: (a) demasiado literales o "de ingeniero"; (b) se ven fríos o técnicos de más; (c) no querías una letra sino un símbolo; (d) otra cosa. *Recomiendo que me digas en una frase cuál te gustó menos y por qué.*
- **Q2. Tipo de logo.** (a) **Logotipo con un detalle propio** (la palabra RomiCalc bien dibujada, con un gesto único, más un símbolo corto "R" o "RC" para el ícono) *(recomendada: el nombre es corto y propio, y así se recuerda)*; (b) símbolo abstracto aparte + nombre; (c) monograma RC; (d) emblema o sello.
- **Q3. Cómo debe sentirse (3 palabras).** *Recomendada:* **preciso, cercano, moderno**. Otras: académico, sólido, ágil, artesanal.
- **Q4. Color.** La app hoy es casi blanco y negro (tinta #1b1b1b, un azul #426188 en un tema). (a) **Un color de marca nuevo para el logo y los acentos, sin tocar el resto de la app** *(recomendada)*; (b) logo solo en negro; (c) rehacer toda la paleta de la app con la marca.
- **Q5. Alcance del sistema de marca.** (a) **Fundamentos: logo, color, letras, tono y 4–5 piezas de la app** *(recomendada)*; (b) solo el logo con su guía; (c) sistema completo con todas las piezas de la interfaz.
- **Q6. Los 4 conceptos descartados.** (a) **Se borran del repo** (nunca se subieron) y queda una copia en la carpeta temporal *(recomendada)*; (b) se guardan en `assets/logo/conceptos/`.

## Fuera de este plan
- Búsqueda de marca registrada (la hace un profesional).
- Renombrar GitHub y Netlify (sigue pendiente, con aprobación).

## Respuestas del usuario (2026-10-08)
- **Q1:** los 4 se veían genéricos y literales. No tienen que ser en negro: le gusta el **azul, claro y oscuro**, el que mejor se vea con toda la app.
- **Q2:** prefiere **isotipo** (un símbolo que funciona solo, sin letras).
- **Q3:** preciso, cercano, moderno.
- **Q4:** el azul como base de la marca.
- **Q5:** fundamentos (logo, color, letras, tono, 4–5 piezas).
- **Q6:** los 4 conceptos salen del repo (copia en la carpeta temporal de la sesión). Hecho.

**Consecuencia para la exploración:** símbolos abstractos o con una idea indirecta (no columnas, vigas ni barras dibujadas tal cual), explorados en color desde el inicio con 2 azules (uno oscuro para fondo claro y uno claro para fondo oscuro), probados junto a la paleta actual de la app.

## Ronda 1 (A–F, trazos) descartada. Ronda 2 (G–P, formas sólidas)
- Investigación: las marcas modernas mejor resueltas (Vercel, Kotlin, npm, Square, Patreon, CircleCI; Stripe 2025) son **una forma sólida con un solo corte**, probadas a 16 px. Tendencia 2026: minimalismo "cálido" (esquinas algo redondeadas, colores tranquilos), el símbolo como sistema (sirve de ícono y de animación) y versiones claro/oscuro. En software de estructuras abunda el azul y las figuras literales (puentes, vigas).
- Ronda 2 en el lienzo (página "Ronda 2"): G Nudo, K R de piezas, M Superposición, N Triangulación, O Cota, P Estable.

## Ronda 2 descartada. Ronda 3 (4 isotipos)
- Referencias: el repo de la skill (kaankiziltug/logo-design-skill) trae la biblioteca de 1.400 logos (ya instalada) y ningún sitio externo. Pinterest pide iniciar sesión; de las primeras pines visibles se repite: azul intenso con blanco, formas macizas con facetas de dos tonos (volumen), cintas plegadas y R geométricas gruesas.
- Paleta nueva más viva: Noche #0B1F4D, Rey #1F4FE0, Cielo #6FA8FF.
- En el lienzo (página "Ronda 3"): Q R facetada, R Despiece, S Estribo, T Planta.

## Elegido: K · R de piezas (ronda 2) — 2026-10-08
- Archivos en `assets/logo/romicalc/`: `romicalc-isotipo.svg` (color), `-oscuro.svg` (fondo oscuro), `-una-tinta.svg` (huecos reales), `-black.svg`, `-white.svg`, `-pequeno.svg` (corte para 32 px o menos) y `web/` (favicon.ico/svg, PNG 16–512, apple-touch, maskable, site.webmanifest, head-snippet.html).
- Paleta de la marca: Obra #13315C, Cálculo #2A5DB0, Cielo #8DB8F2, Tinta #1B1B1B. Letras: Instrument Sans + Instrument Serif cursiva.
- Prueba en contexto en el lienzo (página "Elegido"): portada, barras clara y oscura, pestaña, PDF, ícono de celular.
- Falta: Design System (paso 4) y llevar a la app (paso 5 = fase C).
