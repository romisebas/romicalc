# RomiCalc: maqueta 3D realista (intro, portada y "¿Qué quieres calcular?")

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail + threejs-geometry, threejs-materials, threejs-lighting, threejs-textures, threejs-animation, threejs-interaction. Estado: **Q1–Q10 aprobadas (todas las recomendadas), en ejecución**.

**Problema (capturas del usuario, 2026-10-09):** el edificio parece una mesa, el puente una caja y el box culvert un cubo. La intro y la portada tienen el mismo problema. Falta lo que hace reconocible a cada estructura.

## Qué hace reconocible a cada estructura (investigado)
- **Edificio aporticado (NSR-10):**
  - **Estructura:** varios pisos; columnas en cada piso; vigas descolgadas que sobresalen bajo la losa; losa de entrepiso, a veces aligerada con nervios; escalera entre pisos.
  - **Cimentación:** zapatas aisladas unidas por **vigas de amarre**.
  - **Detalle de obra:** en obra gris se ven los muros de ladrillo en algunos vanos y las **varillas que salen de las columnas en la cubierta**, la imagen típica de una obra en Colombia.
- **Puente de losa:**
  - **Tablero:** una losa maciza sobre dos **estribos**. Cada estribo es un muro frontal con **aletas** que contienen el terraplén, un espaldar y una mesa de apoyo con **neopreno**.
  - **Sobre la losa:** carpeta asfáltica con su demarcación, bordillos y **barandas**.
  - **Alrededor:** terraplén de acceso y el cauce con agua.
- **Puente de viga y losa:** lo mismo, pero con **vigas I** y diafragmas bajo la losa. Con dos luces aparece una **pila** central.
- **Box culvert:** un cajón de concreto, a menudo de **doble celda**, enterrado bajo el **terraplén de la vía**. Tiene losa superior, muros, **solera**, **cabezales** y **aletas** en la entrada y la salida, y el agua pasa por dentro (INVIAS art. 633).

## Idea central: una sola maqueta para las tres pantallas
Un **pedazo de territorio cortado como un bloque de maqueta**: el corte deja ver los estratos del suelo y las zapatas enterradas, y sobre el bloque está la escena completa.
- **Izquierda:** un edificio de 3 pisos en obra gris (pórtico de 3 × 2 vanos).
- **Derecha:** una vía que cruza un río por un puente de dos luces: una luz de losa maciza y otra de vigas y losa, con su pila central.
- **Al frente:** la misma vía sobre un terraplén, con un box culvert de doble celda por donde pasa una quebrada.

Un solo módulo `js/nucleo/maqueta3d.js` construye todo, agrupado por elemento (los mismos id de `js/tipos/elementos.js`). Cada pieza sabe en qué **etapa de obra** aparece. Así:
- **Página de elementos:** al elegir un elemento, se ilumina en azul, la cámara se acerca a él y la carga baja por su camino real. Por ejemplo, en el puente: carpeta → losa → neopreno → estribo → suelo.
- **Portada:** la maqueta gira despacio en despiece por capas y se arma al acercarse a "Diseñar".
- **Intro:** la obra se construye por etapas, termina con el logo y dura unos 8 s.

## Cómo se ve (skills de three.js)
- **Materiales (threejs-materials, threejs-textures):**
  - Concreto gris claro con un grano sutil, hecho en código con una textura pequeña de canvas.
  - Ladrillo, asfalto oscuro con líneas blancas, acero de las barandas y de las varillas, y tierra en capas en el corte.
  - Agua translúcida que se mueve.
  - Un borde fino en las piezas para que se lean como dibujo técnico.
- **Luz (threejs-lighting):**
  - Luz de día (hemisférica más sol).
  - Sombras suaves con el encuadre ajustado a la maqueta.
  - Una sombra de contacto falsa bajo el bloque, luz de entorno para los reflejos y niebla suave.
- **Geometría (threejs-geometry):**
  - `InstancedMesh` para lo repetido (varillas, postes de baranda, ladrillos y nervios) y `ExtrudeGeometry` para las vigas I y las aletas.
  - Piezas combinadas por material para que dibuje rápido.
- **Movimiento (threejs-animation, threejs-interaction):**
  - Etapas de obra con curvas suaves y la cámara que viaja al elemento elegido.
  - Los puntos de carga siguen el camino real y la selección se hace con rayo.
- **Rendimiento:**
  - En celular y equipos lentos se usa una versión simple: sin ladrillos ni barandas individuales y sin sombras.
  - Se dibuja solo si la pantalla está visible y, sin animaciones, solo cuando algo cambia.

## Fases
- **A · Maqueta estática:** el bloque de terreno, el edificio, el puente, el box culvert, la vía y el agua, con sus materiales y luces. Prueba de grupos y etapas. Capturas para revisar.
- **B · Página de elementos:** cambia al modelo nuevo, con resaltado, cámara que viaja y caminos de carga reales.
- **C · Portada:** la maqueta en despiece, que se arma al acercarse a "Diseñar". Se mantiene `Escultura.armar/estado`.
- **D · Intro:** la obra por etapas y el final con el logo. Se mantienen `Intro3D` y las fases.
- **E · Pruebas, capturas en claro, oscuro y celular, suite completa, PROGRESO y commit por fase.**

## Decisiones (con recomendación)
- **Q1. Estilo.**
  - (a) Maqueta realista: concreto, ladrillo, asfalto, agua.
  - (b) Plano técnico 3D en azul.
  - (c) **Realista pero sobrio, en grises y tierra, con el azul solo para lo resaltado** *(recomendada: se reconoce y no compite con la marca)*.
- **Q2. Un solo modelo compartido** por intro, portada y página de elementos *(recomendada: un solo código, todo coherente)*, o tres escenas distintas.
- **Q3. Escena:** **bloque de territorio cortado con estratos visibles, con el edificio, el río con su puente y el terraplén con el box culvert** *(recomendada)*, o cada estructura sobre su propia base.
- **Q4. Edificio:** **3 pisos, 3 × 2 vanos, vigas descolgadas, losa con nervios a la vista en un corte, escalera, zapatas con vigas de amarre, ladrillo en el primer piso y varillas saliendo en la cubierta** *(recomendada)*.
- **Q5. Puente:** **dos luces con pila central, una de losa maciza y otra de vigas I y losa; estribos con aletas, neopreno, bordillos, barandas y carpeta demarcada** *(recomendada: un solo puente muestra los dos tipos)*, o dos puentes separados.
- **Q6. Box culvert:** **doble celda bajo el terraplén de la vía, con cabezales, aletas, solera y agua corriendo** *(recomendada)*.
- **Q7. Intro.**
  - (a) **"Una obra en 8 s": la cámara sobrevuela el terreno, el edificio se construye piso a piso (zapatas y vigas de amarre, columnas, vigas y losa), se revelan el puente y el box culvert, la carga recorre todo y termina en el logo** *(recomendada)*.
  - (b) Solo el edificio que se construye.
- **Q8. Efectos.**
  - (a) **Sin descargar nada nuevo: sombras suaves reales, sombra de contacto falsa y niebla** *(recomendada)*.
  - (b) Agregar el postprocesado de three r170 (oclusión ambiental y brillo). Hay que descargar unos 5 archivos de la librería y pesa más en celular.
- **Q9. Celular y equipos lentos:** **versión simplificada automática** *(recomendada)*.
- **Q10. Revisión por hitos:** **te mando capturas después de A (maqueta), B, C y D** *(recomendada)*.

## Fuera de este plan
- Calcular vigas, columnas, losas, puentes o box culverts.
- Modelos descargados de internet: todo se construye en código, sin archivos 3D externos.
