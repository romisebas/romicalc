# Reglas del proyecto

- Leer `PROGRESO.md` al empezar y actualizarlo al cerrar cada tarea (casilla del plan + fila de checkpoint), en el mismo commit.
- Usar siempre la skill **ponytail** y el flujo de **Superpowers**: plan en `docs/superpowers/plans/` con preguntas Q y recomendación antes de construir; pruebas primero; verificar antes de decir que algo está listo.
- Responder en español, claro y sin jerga; el usuario aprueba los planes respondiendo "Q1–Qn de acuerdo".
- App estática (HTML, CSS y JS sin compilar). Motores sin DOM en `js/tipos/`, piezas compartidas en `js/nucleo/`, la combinada en `js/combinada/`.
- Pruebas: `py -3.12 -m pytest tests -q` (unos 10 min). Usar `py -3.12`, no `python`.
- Servidor local: `python herramientas/servidor.py` (puerto 8765, sin caché).
- Unidades internas: tonf, m, kgf/cm². Nunca cambiar las claves de almacenamiento del navegador (se perderían los proyectos).
- No subir a GitHub ni publicar sin aprobación explícita en cada ocasión. Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Autor: Sebastian Romario Martinez Guerrero (Romi), github.com/romisebas.
