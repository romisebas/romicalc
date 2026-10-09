# RomiCalc: inicio didáctico para todos los elementos estructurales

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail + skills de diseño (impeccable, emil-design-eng, threejs-*). Estado: **Q1–Q10 aprobadas (todas las recomendadas), en ejecución**.

**Objetivo:** RomiCalc deja de verse como "la calculadora de zapatas". El inicio enseña qué elementos estructurales existen y cómo viaja la carga entre ellos. Hoy se pueden calcular las zapatas y el resto aparece como "próximamente": vigas, columnas, losas, losas solas, puentes de losa, puentes de viga y losa, y box culverts. El azul del logo acompaña toda la app.

## Cómo está hoy (revisado en el código)
- **Intro 3D** (`js/nucleo/intro3d.js`): arma una zapata (terreno, excavación, parrilla, columna, vaciado, carga) y al final la varilla se dobla en la R.
- **Portada** (`#bv-portada`): zapata de vidrio en 3D (`js/nucleo/escultura.js`), "beta 1.2 · NSR-10" arriba, botón de ajustes. **No tiene botón de tema**: solo existe dentro del tablero.
- **"¿Qué quieres hacer?"** (`#bv-opciones`): Nueva zapata, Importar, Ejemplos y Recientes. Todo habla de zapatas.
- **Tipos** (`#bv-tipos`, `js/tipos/catalogo.js`): 6 tarjetas. Disponibles: aislada con momento y combinada. Próximamente: concéntrica, medianera, esquinera y corrida.
- **Azul hoy:** casi no aparece. Solo `--titular` y `--acento-10` (#426188 / #6f8db5, un azul apagado) en títulos, pestaña activa y barra de carga.

## Flujo nuevo
```
Intro 3D → Portada → ¿Qué quieres calcular? (elementos) → Zapatas: empezar (nueva, ejemplos) → Tipo (aislada o combinada) → asistente
```
Importar y Recientes sirven para cualquier elemento, así que suben a la página de elementos.

## Fases
**A · Diseño en Claude Design (antes del código, Q10):** en el lienzo de RomiCalc armo la página de elementos, la portada nueva y la intro en cuadros, en claro y oscuro. Tú comentas y luego programo.

**B · Página "¿Qué quieres calcular?"** (reemplaza a "¿Qué quieres hacer?")
- **Arriba, un diagrama del camino de las cargas (Q2):** un corte de edificio y un puente dibujados con líneas.
  - Al pasar el ratón o tocar un elemento, se ilumina en azul y aparece una frase de qué hace. Ejemplo: "La losa recibe la carga del piso y la pasa a las vigas".
  - Una flecha muestra por dónde baja la carga: losa → viga → columna → zapata → suelo, y en el puente, tablero → vigas → estribo → cimentación.
- **Abajo, las tarjetas de los elementos (Q3)**, en dos grupos:
  - Edificaciones (NSR-10): losas, vigas, columnas, zapatas.
  - Puentes y obras (CCP-14): puente de losa, puente de viga y losa, box culvert.
- **Cada tarjeta lleva:**
  - Un ícono de trazo que se dibuja.
  - Qué es, en una frase.
  - Qué revisa la norma, en 2 o 3 palabras clave.
  - Estado: "Disponible" en azul o "Próximamente".
  - Solo Zapatas abre algo.
- **Importar proyecto y Continuar un proyecto** quedan en esta misma página.
- **Datos nuevos:** un catálogo en `js/tipos/elementos.js`, igual a como hoy funciona `catalogo.js`.

**C · Zapatas: empezar y tipo**
- **Al entrar a Zapatas:** Nueva zapata o Ejemplos. Es la pantalla de opciones actual, sin Importar y con el texto ajustado.
- **Tipos:** solo las dos que funcionan, aislada con momento y combinada (Q6). Las otras 4 salen del catálogo y sus íconos se guardan para cuando lleguen.

**D · Intro 3D nueva (Q4)**
- Se arma un pórtico pieza por pieza: zapatas, columnas, vigas y losa. Cada pieza se ilumina en azul al llegar y se ve cómo baja la carga.
- Al final las piezas se juntan en la R del isotipo: la barra, la bola y la pata.
- Dura lo mismo de hoy (unos 7 s), se puede saltar y respeta "animaciones desactivadas".

**E · Portada**
- **3D:** la zapata de vidrio se reemplaza (Q5).
- **Arriba:** se quita "beta 1.2 · NSR-10". La versión pasa a Ajustes, abajo y en pequeño, para no perderla.
- **Logo de la esquina (Q8):** se arma al cargar, se vuelve a armar al pasar el ratón y tiene un gesto suave cada tanto.
- **Botón de tema claro/oscuro (Q9):** va junto a Ajustes, en la portada y en las pantallas de inicio. Usa la misma clave de guardado de hoy (`zapatapp-tema`), así nadie pierde su preferencia.

**F · Azul de la marca en toda la app (Q7)**
- `--titular` y `--acento-10` pasan al azul de la marca: Cálculo #2A5DB0 en tema claro y Cielo #8DB8F2 en oscuro. Los dos superan 4.5:1 de contraste.
- **Dónde aparece el azul:**
  - Etiquetas de sección y pestaña activa.
  - Barras de progreso del asistente y de la carga.
  - Anillo de foco del teclado, selección de texto y casilla elegida.
  - Punto "completo" del riel, cotas destacadas en Planos y luz de la intro y del 3D.
  - Enlaces y la línea bajo el título de cada capítulo de la memoria.
- **Se queda igual:** verde, ámbar y rojo de los chequeos (dicen cumple o no cumple), el botón principal en tinta y el PDF en una tinta.

**G · Pruebas y cierre**
- Pruebas primero en cada fase:
  - Página de elementos: 7 próximamente y 1 disponible.
  - Solo 2 tipos de zapata.
  - Sin "beta" en la portada.
  - Botón de tema en la portada.
  - Colores de acento nuevos.
  - Intro sin errores.
- Suite completa en verde, revisión en el navegador (claro, oscuro y celular), PROGRESO.md y commit por fase. Para subir a GitHub, pido permiso aparte.

## Decisiones (con recomendación)
- **Q1. Flujo.** (a) **Portada → elementos → zapatas → tipo** *(recomendada)*; (b) la página de elementos reemplaza también a la de tipos y muestra las zapatas abiertas dentro de su tarjeta.
- **Q2. Cómo enseñar.**
  - (a) **Diagrama del camino de las cargas arriba y tarjetas abajo** *(recomendada: enseña cómo se relacionan los elementos, no solo una lista)*.
  - (b) Solo tarjetas con su animación y explicación.
  - (c) Un modelo 3D para explorar con el ratón (más vistoso, pero más pesado en el celular).
- **Q3. Lista de elementos.** *Recomendada:*
  - **Edificaciones:** Losas (maciza y aligerada en una tarjeta), Vigas, Columnas, Zapatas.
  - **Puentes y obras:** Puente de losa, Puente de viga y losa, Box culvert.
  - **Duda:** ¿"losas solas" es otra cosa? Por ejemplo, losa de contrapiso apoyada en el suelo. Si es así, sería una tarjeta aparte.
  - **Nota:** en Colombia los puentes y box culverts se diseñan con la **CCP-14** (Norma Colombiana de Diseño de Puentes), no con la NSR-10. ¿Lo indico en sus tarjetas?
- **Q4. Intro.** (a) **Pórtico que se arma y termina en la R** *(recomendada)*; (b) se arma un puente; (c) intro corta: solo el logo que se arma.
- **Q5. 3D de la portada.**
  - (a) **Maqueta de vidrio de una estructura (pórtico con losa sobre zapatas y un puente de losa al lado) que gira lento; las zapatas brillan en azul porque son lo disponible** *(recomendada)*.
  - (b) Las piezas de la R en 3D flotando.
  - (c) Sin 3D, una ilustración de líneas.
- **Q6. Tipos de zapata.** Las que funcionan hoy son **aislada con momento y combinada**. La "corrida bajo muro" aún no existe. *Recomendada:* dejar aislada y combinada, y quitar las otras 4.
- **Q7. Cuánto azul.** (a) **Acentos en azul de marca y el botón principal en tinta** *(recomendada: el azul se nota sin competir con cumple / no cumple)*; (b) también el botón principal en azul; (c) además, los títulos del PDF en azul.
- **Q8. Logo de la portada.** (a) **Se arma al cargar y al pasar el ratón, y la bola "respira" suave cada 6 s** *(recomendada)*; (b) solo al cargar y al pasar el ratón.
- **Q9. Botón de tema.** (a) **Junto a Ajustes en la portada y en todas las pantallas de inicio** *(recomendada)*; (b) solo en la portada.
- **Q10. Diseñar primero en Claude Design.** (a) **Sí: maqueta de la página de elementos y la portada en el lienzo antes de programar** *(recomendada, como hicimos con el logo)*; (b) programar directo y revisar en localhost.

## Fuera de este plan
- Calcular vigas, columnas, losas, puentes o box culverts: cada uno será su propio plan.
- Cambiar la dirección del sitio de Netlify (la hace el usuario en su panel).

## Respuestas del usuario (2026-10-09)
- Q1–Q10 de acuerdo, todas las recomendadas.
- Q3: una sola tarjeta de Losas (maciza y aligerada); los puentes y el box culvert llevan "CCP-14".
- Q6: tipos de zapata = aislada con momento y combinada.
- Q10 (ajustada para ahorrar tokens): en Claude Design solo la página "¿Qué quieres calcular?", tema oscuro, escritorio. Lo demás va directo a código y se revisa en localhost.
