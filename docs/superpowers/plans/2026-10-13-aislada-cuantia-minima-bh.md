# RomiCalc: cuantía mínima de la zapata aislada con b·h (NSR-10 C.7.12)

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail + prog-nsr10. Pasos con casillas (`- [ ]`). Estado: **Q1–Q4 aprobadas (todas las recomendadas), ejecutado el 2026-10-13**.

**Objetivo:** que el acero mínimo de la zapata aislada sea 0.0018·b·**h** (altura total), como pide la NSR-10 C.7.12 y como ya lo hace la combinada en su método corregido. Hoy usa 0.0018·b·**d** (criterio del curso) y se queda corto.

## El problema
- `js/tipos/aislada-momento.js`, `flexionDir` (línea 211): `CO.flexion(Mu, b, d, fc, fy, phiF, 'bd')` → As,min = ρmin·b·d.
- La línea 212 recalcula `gobiernaMin` comparando cuantías (`rhoCalc > rhoMin`), y eso deja de valer con b·h: hay que tomarlo de `s.gobiernaMin`.
- La memoria (`aislada-momento-memoria.js`, líneas 165 y 168) escribe ρ = max(ρcalc, ρmin) y A<sub>s</sub> = ρ·b·d, y cita C.7.12.2.1 aunque calcula con d.

## Cuánto cambia (ejemplo "Nudo 206": d = 0.475 m, r = 0.075 m, h = 0.55 m)
En las dos direcciones gobierna el mínimo.

| | Hoy (b·d) | Corregido (b·h) | Diferencia |
|---|---|---|---|
| A<sub>sx</sub> (b = 2.00 m) | 17.10 cm² | 19.80 cm² | +16 % |
| A<sub>sy</sub> (b = 2.50 m) | 21.38 cm² | 24.75 cm² | +16 % |

Sin cambios: presiones, punzonamiento, cortante, momentos, aplastamiento, desarrollo y la elección del peralte (`optimizarPeralte` usa `fx.ok`, que con b·h compara ρcalc con ρmax igual que antes).

## Tareas
- [x] **A · Prueba primero:** en `tests/test_app.py`, una prueba que pida A<sub>sx</sub> = 19.80 y A<sub>sy</sub> = 24.75 cm² en el ejemplo (falla hoy) y que `fx.gobiernaMin` sea verdadero. Ajustar `VALORES_PDF` según Q1.
- [x] **B · Motor:** `flexionDir` recibe `h` y llama `CO.flexion(..., 'bh', h)`; `gobiernaMin` sale de `s.gobiernaMin`. Las mallas usan `fx.As` y `fy.As`, así que se actualizan solas.
- [x] **C · Memoria:** diapositiva de cuantía y de acero requerido con A<sub>s</sub> = max(ρ·b·d, 0.0018·b·h), igual que la combinada, citando C.7.12.2.1; nota según Q2.
- [x] **D · Cierre:** suite completa (`py -3.12 -m pytest tests -q`), revisar en el navegador Refuerzo, Planos y el PDF del ejemplo, actualizar `PROGRESO.md` y la skill `prog-nsr10` (quitar el "Pendiente" de `references/zapatas.md`).

## Decisiones (con recomendación)
- **Q1. Validación contra el PDF del curso:**
  - (a) **Comparar A<sub>sx</sub> y A<sub>sy</sub> con el valor corregido y dejar el del PDF en la etiqueta, como ya se hace con M<sub>uy</sub>** ("A<sub>sx</sub> (corregido, PDF: 17.1)") *(recomendada: la aislada ya corrige el PDF en M<sub>uy</sub> sin un selector; no agrega interfaz)*.
  - (b) Agregar a la aislada el selector "Método: corregido / documento" como en la combinada, para reproducir el PDF tal cual. Más trabajo: asistente, riel, informe y memoria.
- **Q2. Aviso en la memoria:**
  - (a) **Una nota corta en la diapositiva de acero: "El curso usa 0.0018·b·d; la NSR-10 C.7.12 pide la altura total h."** *(recomendada: un estudiante que compare con el PDF entiende la diferencia)*.
  - (b) Sin nota.
- **Q3. ρmin para f<sub>y</sub> < 420 MPa (0.0020 en vez de 0.0018):** **fuera de este plan** hasta verificarlo con el Título C en PDF *(recomendada: no está confirmado y con f<sub>y</sub> = 4200 kgf/cm² no cambia nada)*, o incluirlo ahora.
- **Q4. Proyectos guardados:** **no se toca nada guardado**; al abrir un proyecto viejo se recalcula con b·h y puede cambiar la barra sugerida *(recomendada: las claves de almacenamiento no cambian, solo el resultado)*.
