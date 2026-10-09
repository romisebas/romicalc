# Progreso

Checkpoints del proyecto. Se actualiza al cerrar cada tarea, en el mismo commit del cambio.

## Estado actual
- **Versión:** beta 1.2, publicada en GitHub (github.com/romisebas/romicalc, pre-release beta-1.2) y en Netlify (zapatapp.netlify.app).
- **Nombre:** RomiCalc (antes ZapatAPP). El sitio sigue en zapatapp.netlify.app hasta renombrarlo.
- **Funciona:** zapata aislada con momento y zapata combinada (asistente, veredicto, planos, 3D, refuerzo, memoria y PDF). 57 pruebas.

## En curso: RomiCalc ([plan](docs/superpowers/plans/2026-10-08-romicalc.md))
- [x] A · Skills y plugins: quitar karpathy-guidelines y redesign-existing-projects; Chrome DevTools MCP; skills de rendimiento y seguridad
- [x] B · Logo de RomiCalc: isotipo K · R de piezas, íconos web y Design System en Claude Design ([plan](docs/superpowers/plans/2026-10-08-romicalc-marca-claude-design.md))
- [x] C · Renombrar la app a RomiCalc (lema: "Cálculo de elementos estructurales según la NSR-10")
- [x] D · Auditoría 1–3: números como texto y barra desconocida al importar; CSS muerto

## Checkpoints
| Fecha | Qué se hizo | Commit | Pruebas |
|---|---|---|---|
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
- Renombrar el sitio de Netlify a romicalc.netlify.app (lo hace el usuario en su panel de Netlify). El repositorio ya se llama romicalc.
