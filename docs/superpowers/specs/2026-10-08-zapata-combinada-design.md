# Zapata combinada — diseño (beta 1.2)

> Fuente: PDF "Zapata Combinada" del Ing. Gustavo A. Chang Nieto (Diseño de Concreto II, Univ. del Magdalena), NSR-10.
> Decisiones Q1–Q6 aprobadas el 2026-10-08 (todas las recomendadas).

## 1. Objetivo

Agregar a ZapatAPP el tipo **Combinada** (dos columnas sobre una zapata rectangular) con:
- el cálculo completo del documento, más los chequeos que le faltan;
- una experiencia **distinta** a la aislada: en lugar del asistente de 7 pasos, un **lienzo interactivo** donde el estudiante ubica las columnas, ve el centroide, el largo, la presión y los diagramas de cortante y momento cambiar en vivo;
- las mismas salidas que la aislada (veredicto, planos, 3D, refuerzo, memoria en diapositivas, PDF), más un **despiece** con longitudes de barra.

Éxito: con el ejemplo del documento y la opción "Método del documento", la app reproduce sus valores (tabla de §7); con el método por defecto da los valores corregidos y los chequeos adicionales.

## 2. Alcance

Incluye: dos columnas rectangulares con carga axial (D, L, E); columna exterior en el lindero o con voladizo; largo L uniforme (L = 2x̄) o fijado a mano; ancho B por σadm o fijado; tres sistemas de unidades (curso, SI, inglés), igual que la aislada.

No incluye (por ahora): momentos en las columnas (el documento los ignora), más de dos columnas, zapata trapezoidal, viga de amarre, estribos (si el cortante no cumple se pide más altura).

## 3. Método de cálculo (motor `js/tipos/combinada.js`, sin DOM)

Convención: eje x a lo largo de la zapata, origen en el borde izquierdo (lindero); columna 1 = exterior, columna 2 = interior. Unidades internas tonf·m·kgf/cm².

1. **Cargas por columna:** D, L y Fs (sismo vertical, de la tabla de reacciones). E = Fs / R con R = R₀·φa·φp·φr.
2. **Servicio:** B.2.3-2 (D + L) y B.2.3-8 (D + 0.75·0.7E + 0.75L, con σadm × 1.33). Gobierna el caso que exige más área.
3. **Mayoradas:** 1.4D; 1.2D + 1.6L; 1.2D + 1.0L ± 1.0E; 0.9D ± 1.0E (B.2.4). Gobierna la combinación de mayor ΣPu (misma combinación para las dos columnas).
4. **Geometría en planta:**
   - x₁ = a + c₁/2 (a = voladizo exterior, 0 en el lindero); x₂ = x₁ + s (s = separación entre centros).
   - x̄ = Σ(Ps·x)/ΣPs.
   - Modo **uniforme**: L = 2x̄ (redondeado hacia arriba a 0.05 m). Modo **fijo**: L dado → e = L/2 − x̄; si |e| > L/6 no cumple.
   - B = A / L redondeado hacia arriba a 0.05 m (o fijado). Chequeo: σmax ≤ σadm (y ≤ 1.33σadm con sismo).
5. **Presión última (por defecto, equilibrio exacto):** distribución lineal q(x) con resultante en el punto de aplicación de ΣPu (si cae en L/2 queda uniforme). **Método del documento:** qu = ΣPu/(L·B) uniforme.
6. **Sentido longitudinal (viga invertida):** cargas puntuales en los centros de columna, w(x) = q(x)·B hacia arriba. V(x) y M(x) muestreados (≥ 400 puntos) más valores exactos en: centros de columna, caras, V = 0, puntos de inflexión.
   - Flexión: Mu⁻ máximo (acero superior, b = B) y Mu⁺ máximos (acero inferior). Mismo procedimiento de ρ que la aislada (Rn, ρ calculado, ρmin, ρmax).
   - ρmin: 0.0018·b·h (NSR-10 C.7.12, por defecto); 0.0018·b·d con "Método del documento".
   - Cortante en una dirección: a d de la cara de cada columna, en ambos lados; φVc = φ·0.53·λ√f'c·b·d (coeficiente según el sistema de unidades).
7. **Punzonamiento (agregado):** columna interior con perímetro de 4 lados (αs = 40); columna exterior con 3 lados si a < d/2 (αs = 30), si no 4 lados. Vu = Pu − q·área encerrada. Las tres ecuaciones de vc, igual que la aislada.
8. **Sentido transversal:** una franja bajo cada columna; ancho = d a cada lado de la columna, recortado por el borde (da c + d en el lindero y c + 2d en el interior, como el documento). wu = Pu/B, Lv = (B − c₂)/2, Mu = wu·Lv²/2; flexión y cortante a d de la cara igual que arriba. Entre franjas: acero mínimo de retracción 0.0018·b·h.
9. **Aplastamiento (agregado):** por columna, igual que la aislada (A₂ limitado a la zapata).
10. **Desarrollo y despiece (agregado):** ld a tracción (C.12.2.2, ψt = 1.3 para barras superiores); barras superiores cortadas en PI + ld (o corridas si no alcanzan), con ganchos en los extremos; barras inferiores longitudinales y transversales con recubrimiento r; dovelas con ldc de la aislada. Salida: lista por marca (diámetro, cantidad, longitud, forma, peso en kg) y total.

Selección de barras: igual que la aislada (#2–#10, por defecto la menor con s entre 10 y 30 cm; mallas no aplican).

Opción **"Método del documento"** (apagada por defecto): presión uniforme, ρmin con b·d y Vud longitudinal con la fórmula del documento, Vud = Vu,centro·(X − d)/X, con X = distancia de V = 0 a la cara (el redondeo de L y B es el mismo en ambos métodos). Sirve para comparar con el PDF; la memoria indica qué método se usó.

## 4. Experiencia: "mesa de la combinada"

Una sola pantalla, sin asistente:

- **Lienzo principal (alzado):** una regla horizontal con el lindero a la izquierda. Las dos columnas son piezas que se **arrastran** (la exterior ajusta el voladizo a; la interior, la separación s). Sobre cada columna una flecha de carga con su valor; un clic en el valor abre un editor pequeño de D, L y Fs.
- **En vivo:** marcador del centroide x̄ (se desliza al mover columnas o cambiar cargas), la zapata se estira hasta L = 2x̄ (modo uniforme), diagrama de presiones debajo, y debajo los **diagramas de cortante y momento** alineados al mismo eje x. Al pasar el cursor una línea vertical lee V(x) y M(x) en todos a la vez; los puntos de inflexión y las longitudes ld se marcan.
- **Panel lateral compacto** (plegable, hoja inferior en celular): suelo (σadm), materiales, R₀/φ, altura h y recubrimiento, modo de L y B, opción "Método del documento".
- **Veredicto** como cinta superior con los chequeos (suelo, punzonamiento ×2, cortante longitudinal, cortante transversal, flexión, aplastamiento, desarrollo) en píldoras que llevan a su sección.
- **Pestañas inferiores:** Planta (franjas, presiones, cotas, acero) · Cortes (longitudinal con armado superior/inferior y transversales por columna) · 3D · Refuerzo · Despiece · Memoria.
- **Primer uso:** estado vacío con una guía de tres pasos superpuesta ("Coloca la columna exterior", "Ubica la interior", "Escribe las cargas") y botón "Cargar ejemplo del documento".
- Mismo lenguaje visual de la beta 1.1 (fondo, tipografías, acento, animaciones con respeto a "animaciones desactivadas"). Teclado: columnas seleccionables con Tab y movibles con flechas (paso 0.05 m).

## 5. Arquitectura

- `js/tipos/combinada.js` — motor puro: `EJEMPLO`, `VACIO`, `preparar`, `faltantes`, `calcular(inp) → R`, `validarContraPdf()`. Reutiliza `Refuerzo`, `Unidades` y las funciones de flexión/vc/aplastamiento/desarrollo; las que hoy viven dentro de `aislada-momento.js` se extraen a `js/nucleo/concreto.js` (sin cambiar resultados de la aislada).
- `js/tipos/combinada-memoria.js` — capítulos/diapositivas para `Diapositivas` e `Informe`.
- `js/combinada/mesa.js` — pantalla del lienzo (arrastre, edición, lectura de diagramas).
- `js/combinada/dibujo-combinada.js` — SVG de alzado, diagramas V/M, planta con franjas, cortes, despiece.
- Integración: `catalogo.js` marca Combinada como disponible; elegirla abre la mesa. `Proyectos` ya guarda `datos.tipo`: los recientes abren la pantalla correcta según el tipo; importar/exportar .json igual. La carga creativa, el aviso con "Deshacer", ajustes y unidades se reutilizan. `app.js` pasa a elegir el módulo según `estado.tipo` en lugar de fijar la aislada.
- 3D: `Escena3D` con zapata larga, dos columnas y acero superior/inferior.

## 6. Memoria y PDF

Capítulos: 1 Cargas y combinaciones · 2 Dimensiones en planta (x̄, L, B, σ) · 3 Presión última · 4 Análisis longitudinal (diagramas V y M) · 5 Flexión longitudinal · 6 Cortante longitudinal · 7 Punzonamiento · 8 Sentido transversal (franjas) · 9 Aplastamiento y desarrollo · 10 Despiece · Conclusiones. Cada ecuación enlazada a su figura (como la aislada). El PDF usa la misma estructura de entrega (portada, contenido, firmas).

## 7. Validación contra el documento ("Método del documento")

| Valor | Documento | Tolerancia |
|---|---|---|
| Ps ext / int (sin sismo) | 99.07 / 183.62 tonf | 0.5 % |
| x̄ | 3.50 m | 0.01 m |
| L | 7.00 m | exacto |
| Área requerida | 23.56 m² | 0.5 % |
| B | 3.40 m | exacto |
| qu / wu | 15.20 tonf/m² / 51.68 tonf/m | 0.5 % |
| V ext (izq/der) | 12.91 / −113.27 tonf | 0.5 % |
| V int (izq/der) | 144.97 / −90.39 tonf | 0.5 % |
| x (V = 0) desde col. ext | 2.19 m | 0.01 m |
| Mu⁻ | −122.42 tonf·m | 0.5 % |
| Mu⁺ int / ext | 81.26 / 1.61 tonf·m | 1 % |
| As⁻ / As⁺ | 48.53 / 41.62 cm² | 1 % |
| Vud / φVc longitudinal | 106.46 / 153.78 tonf | 0.5 % |
| Franjas b ext / int | 1.18 / 1.86 m | exacto |
| Mu transv ext / int | 39.02 / 72.78 tonf·m | 0.5 % |
| As transv ext / int | 15.44 / 28.90 cm² | 2 % |
| Vu / φVc transv ext | 28.57 / 53.37 tonf | 0.5 % |
| Vu / φVc transv int | 53.30 / 84.13 tonf | 0.5 % |

Pruebas del método por defecto: equilibrio (ΣFy = 0 y ΣM = 0 con la presión lineal), M(L) = 0 y V(L) = 0, ρmin con b·h (As⁺ ≥ 45.90 cm² en el ejemplo), punzonamiento de 3 lados en la exterior.

## 8. Correcciones al documento (se muestran como nota en la memoria, no en el PDF)

1. Mu⁺ bajo la columna interior: 81.26 según el documento. Con presión uniforme da 80.85 desde la izquierda y 79.09 desde la derecha, porque la resultante mayorada cae en 3.505 m; con la presión lineal ambos lados coinciden.
2. ρmin para losas y zapatas: 0.0018·b·h (C.7.12), no b·d.
3. Faltaban punzonamiento (exterior con 3 lados), aplastamiento y desarrollo.
4. Vud longitudinal: el documento escala el cortante del centro de la columna (144.97) y obtiene 106.46 tonf; el cortante exacto a d de la cara es 96.94 tonf (cumple en ambos casos).
5. La carga exterior con sismo da 103.66 tonf, no 103.77 (no cambia el diseño).

## 9. Pruebas

- Motor: tabla §7 y pruebas del método por defecto (Playwright evaluando el motor en la página, como hoy).
- Aislada: los 35 tests actuales siguen pasando tras extraer `concreto.js`.
- Interfaz: abrir Combinada desde tipos; cargar ejemplo; arrastrar la columna interior cambia x̄ y L; editar una carga actualiza el veredicto; la lectura bajo el cursor muestra V y M; teclado mueve columnas; pestañas Planta/Cortes/3D/Despiece/Memoria se pintan; guardar y reabrir desde recientes; PDF se genera.

## 10. Entregas

Una sola versión, **beta 1.2**, construida en tres fases verificables: (1) motor + `concreto.js` + validación; (2) mesa, planos, 3D, refuerzo y despiece; (3) memoria, PDF e integración con proyectos/recientes. Local hasta que el usuario apruebe subirla.
