# Progreso

Checkpoints del proyecto. Se actualiza al cerrar cada tarea, en el mismo commit del cambio.

## Estado actual
- **Versión:** beta 1.2 en GitHub (github.com/romisebas/romicalc) y en línea en https://romicalc.netlify.app/ (la dirección vieja zapatapp.netlify.app ya no responde).
- **Nombre:** RomiCalc (antes ZapatAPP).
- **Funciona:** zapata aislada con momento y zapata combinada (asistente, veredicto, planos, 3D, refuerzo, memoria y PDF). 61 pruebas.

## En curso: RomiCalc ([plan](docs/superpowers/plans/2026-10-08-romicalc.md))
- [x] A · Skills y plugins: quitar karpathy-guidelines y redesign-existing-projects; Chrome DevTools MCP; skills de rendimiento y seguridad
- [x] B · Logo de RomiCalc: isotipo K · R de piezas, íconos web y Design System en Claude Design ([plan](docs/superpowers/plans/2026-10-08-romicalc-marca-claude-design.md))
- [x] C · Renombrar la app a RomiCalc (lema: "Cálculo de elementos estructurales según la NSR-10")
- [x] D · Auditoría 1–3: números como texto y barra desconocida al importar; CSS muerto

## Siguiente: inicio didáctico ([plan](docs/superpowers/plans/2026-10-09-romicalc-inicio-didactico.md))
- [x] A · Maqueta de "¿Qué quieres calcular?" en Claude Design
- [x] B · Página de elementos (camino de las cargas + tarjetas)
- [x] C · Zapatas: empezar y solo 2 tipos
- [x] D · Intro 3D: pórtico que termina en la R
- [x] E · Portada: maqueta de vidrio (pórtico + puente de losa, zapatas en azul), sin "beta", logo que respira, botón de tema, cinta con los elementos
- [x] F · Azul de la marca en toda la app
- [x] G · Pruebas y cierre

## En curso: maqueta 3D realista ([plan](docs/superpowers/plans/2026-10-09-romicalc-maqueta-3d.md))
- [x] A · Maqueta compartida (js/nucleo/maqueta3d.js): terreno con estratos, edificio en obra gris, puente de dos luces, box culvert
- [x] B · Página de elementos con la maqueta: resaltado, cámara al elemento, rayos X, "Ver todo"
- [x] C · Portada con la maqueta en despiece
- [x] D · Intro: la obra por etapas y el logo
- [x] E · Pruebas y cierre

## En curso: figuras de la memoria ([plan](docs/superpowers/plans/2026-10-09-romicalc-figuras-memoria.md))
- [x] A · Base del SVG técnico (js/nucleo/svg-tecnico.js)
- [x] B · SVG técnico de la aislada (9 figuras, a escala)
- [x] C · SVG técnico de la combinada (cargas, presión, V y M, punzonamiento)
- [x] D · Motor mini-3D
- [x] E · Mini-3D de la aislada
- [x] F · Mini-3D de la combinada
- [x] G · Cierre (PDF en blanco y negro, pruebas, capturas)

## En curso: acero real en todos los 3D ([plan](docs/superpowers/plans/2026-10-09-romicalc-acero-3d.md))
- [x] A · Motor de la combinada: cara superior a cuantía mínima (L3/L4 en los extremos, empalme 1.3·ld con L1; T4 de repartición) en el despiece, la memoria y el PDF
- [x] B · Armador 3D compartido (js/nucleo/armado3d.js): ganchos de 90° con doblez curvo, una malla por marca, corte por un plano
- [x] C · 3D de Planos de la combinada (grupo "Mínima") y de la aislada con el armador
- [x] D · Mini-3D de las plantas (presión, punzonamiento, acero) y del corte de la aislada
- [x] E · Mini-3D de la planta, el corte longitudinal y los cortes transversales de la combinada
- [x] F · Pruebas, capturas y cierre

## Checkpoints
| Fecha | Qué se hizo | Commit | Pruebas |
|---|---|---|---|
| 2026-10-09 | Acero A–F: la combinada lleva la cara superior completa a cuantía mínima (L3/L4 y T4, en despiece, memoria y PDF); un solo armador 3D con ganchos curvos para Planos (aislada y combinada) y la memoria; las 41 diapositivas en mini-3D, también plantas y cortes con su acero; nota en la aislada sobre la cara superior | (este) | 61 ✓ |
| 2026-10-09 | Figuras D–G: mini-3D quieto en las diapositivas (un solo renderizador, se arrastra y vuelve, etiquetas HTML, ligas en los dos sentidos) para las 13 figuras de la aislada y las 9 de la combinada; SVG técnico como respaldo y en el PDF (patrones con id propio para que el achurado salga impreso) | (este) | 61 ✓ |
| 2026-10-09 | Figuras A–C: dibujo técnico en SVG (achurados, cotas, momentos con signo, subíndices, acero real en el corte, a escala) para las 9 figuras de la aislada y las 4 de la combinada | 85417ab | 60 ✓ (parcial) |
| 2026-10-09 | README interactivo (insignias, diagramas, galería, hoja de ruta, preguntas) con capturas nuevas y el sitio romicalc.netlify.app; subida a GitHub | bf00cf1 | 60 ✓ |
| 2026-10-09 | Maqueta C–E: portada con la maqueta en despiece (zapatas en azul) e intro "una obra en 8 segundos" (terreno, edificio piso a piso, puente, box culvert, carga y logo); luces compartidas | b60e96d | 60 ✓ |
| 2026-10-09 | Maqueta A–B: un solo modelo 3D realista (edificio de 3 pisos en obra gris, puente de losa + vigas I con pila, box culvert de doble celda, río y quebrada) en "¿Qué quieres calcular?", con cámara que viaja al elemento y rayos X para zapatas y box culvert | 4934118 | 60 ✓ (parcial) |
| 2026-10-09 | D y E · Intro "del pórtico al logo" (zapatas, columnas, vigas, losa, carga y el isotipo que se arma) y portada con maqueta de vidrio de pórtico y puente de losa; cinta con los elementos | 5507166 | 59 ✓ |
| 2026-10-09 | F · Azul de la marca (Cielo #8DB8F2 en oscuro, Cálculo #2A5DB0 en claro) en títulos, pestaña activa, progreso, foco, selección, riel, presiones 3D y capítulo de la memoria; el 3D de elementos solo redibuja si algo cambia | b2a669b | 59 ✓ |
| 2026-10-09 | Inicio didáctico A–C y parte de E: maqueta en Claude Design; "¿Qué quieres calcular?" con 3D Three.js del camino de las cargas (edificio y puente) y 7 elementos (solo Zapatas disponible); pantalla Zapatas y solo 2 tipos; portada sin "beta", botón de tema y logo que respira | fab68f2 | 58 ✓ |
| 2026-10-08 | Publicación: repositorio renombrado a romisebas/romicalc, push de main, etiqueta y pre-release beta-1.2 | (este) | 57 ✓ |
| 2026-10-08 | D · Auditoría 1 y 2: al importar un .json, "2.5" cuenta como número y una barra que no existe queda como dato faltante (aislada y combinada); 10: prueba de importación con datos raros; 3: 73 líneas de CSS `mesa-*` muerto fuera | 6cb977b | 57 ✓ |
| 2026-10-08 | C · App renombrada a RomiCalc: portada ROMICALC y lema nuevo, isotipo en barra, pie, carga y PDF (una tinta), favicon e íconos, intro 3D dobla la varilla en la R; logo viejo a `assets/logo/conceptos/zapatapp/`; claves de guardado sin tocar | 58ae939 | 56 ✓ |
| 2026-10-08 | B · Isotipo K · R de piezas (tras 3 rondas en el lienzo de Claude Design) en `assets/logo/romicalc/` con íconos web; Design System "RomiCalc" (tokens reales de la app, libro de marca, 5 piezas) | 1263c26 | — |
| 2026-10-08 | A · karpathy-guidelines y redesign-existing-projects a `~/.claude/skills-respaldo`; skills performance-optimization y security-and-hardening; Chrome DevTools MCP (`--isolated`) en `~/.claude.json` (activo en la próxima sesión) | — | — |
| 2026-10-08 | Se crean PROGRESO.md y CLAUDE.md | a2b5980 | 56 ✓ |

## Pendientes y deuda
- Auditoría 4: pasar la aislada al motor de asistente nuevo (−200 líneas aprox.).
- Auditoría 5: lógica repetida entre los tableros de la aislada y la combinada.
- Auditoría 6: separar la bienvenida de `js/app.js`.
- Auditoría 7: unir `styles.css` y `flujo.css` dentro de `air.css`.
- Auditoría 8: avisar cuando el navegador no deja guardar.
- Auditoría 9: la separación s se ajusta al mínimo mientras se escribe.
- Auditoría 11: el arrastre en Planos repinta todo el tablero.
- Auditoría 12: bucle 3D repetido en cuatro módulos.
- 3D de la combinada: se rehace detrás del asistente al arrastrar en el paso de ubicación.
