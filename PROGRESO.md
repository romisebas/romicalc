# Progreso

Checkpoints del proyecto. Se actualiza al cerrar cada tarea, en el mismo commit del cambio.

## Estado actual
- **Versión:** beta 1.2 en `main`, solo local (sin subir). En línea sigue la beta 1.1 (zapatapp.netlify.app).
- **Funciona:** zapata aislada con momento y zapata combinada (asistente, veredicto, planos, 3D, refuerzo, memoria y PDF). 56 pruebas.

## En curso: RomiCalc ([plan](docs/superpowers/plans/2026-10-08-romicalc.md))
- [x] A · Skills y plugins: quitar karpathy-guidelines y redesign-existing-projects; Chrome DevTools MCP; skills de rendimiento y seguridad
- [x] B · Logo de RomiCalc: isotipo K · R de piezas, íconos web y Design System en Claude Design ([plan](docs/superpowers/plans/2026-10-08-romicalc-marca-claude-design.md))
- [ ] C · Renombrar la app a RomiCalc (lema: "Cálculo de elementos estructurales según la NSR-10")
- [ ] D · Auditoría 1–3: números como texto y barra desconocida al importar; CSS muerto

## Checkpoints
| Fecha | Qué se hizo | Commit | Pruebas |
|---|---|---|---|
| 2026-10-08 | B · Isotipo K · R de piezas (tras 3 rondas en el lienzo de Claude Design) en `assets/logo/romicalc/` con íconos web; Design System "RomiCalc" (tokens reales de la app, libro de marca, 5 piezas) | (este) | — |
| 2026-10-08 | A · karpathy-guidelines y redesign-existing-projects a `~/.claude/skills-respaldo`; skills performance-optimization y security-and-hardening; Chrome DevTools MCP (`--isolated`) en `~/.claude.json` (activo en la próxima sesión) | — | — |
| 2026-10-08 | Se crean PROGRESO.md y CLAUDE.md | a2b5980 | 56 ✓ |

## Pendientes y deuda
- Auditoría 4: pasar la aislada al motor de asistente nuevo (−200 líneas aprox.).
- Auditoría 5: lógica repetida entre los tableros de la aislada y la combinada.
- Auditoría 6: separar la bienvenida de `js/app.js`.
- Auditoría 7: unir `styles.css` y `flujo.css` dentro de `air.css`.
- Auditoría 8: avisar cuando el navegador no deja guardar.
- Auditoría 9: la separación s se ajusta al mínimo mientras se escribe.
- Auditoría 10: prueba de archivos importados con errores (va con la fase D).
- Auditoría 11: el arrastre en Planos repinta todo el tablero.
- Auditoría 12: bucle 3D repetido en cuatro módulos.
- 3D de la combinada: se rehace detrás del asistente al arrastrar en el paso de ubicación.
- Renombrar el repositorio de GitHub y el sitio de Netlify a RomiCalc (con aprobación).
