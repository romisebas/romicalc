"""Pruebas automáticas de Diseño de Zapatas con Playwright.

Ejecutar desde la carpeta del proyecto:
    py -3.12 -m pytest tests -q
Las capturas quedan en tests/capturas/.
"""
import functools
import http.server
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
CAPTURAS = Path(__file__).resolve().parent / "capturas"


@pytest.fixture(scope="session")
def url():
    manejador = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(RAIZ))
    manejador.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}/index.html"
    srv.shutdown()


@pytest.fixture(scope="session")
def navegador():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


def abrir(navegador, url, ancho=1440, alto=900, tema="light"):
    # Movimiento reducido: las capturas no dependen de animaciones a medio camino.
    ctx = navegador.new_context(viewport={"width": ancho, "height": alto}, reduced_motion="reduce", color_scheme=tema)
    pagina = ctx.new_page()
    errores = []
    pagina.on("pageerror", lambda e: errores.append(str(e)))
    pagina.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pagina.goto(url)
    pagina.evaluate("localStorage.clear()")
    pagina.reload()
    pagina.wait_for_selector("#chequeos .chequeo")
    pagina.evaluate("document.fonts.ready")
    return pagina, errores


def test_validacion_contra_pdf(navegador, url):
    pagina, errores = abrir(navegador, url)
    res = pagina.evaluate("Zapata.validarContraPdf().map(r => ({lbl: r.lbl, ok: r.ok, err: r.err}))")
    fallas = [r for r in res if not r["ok"]]
    assert not fallas, f"Valores fuera de tolerancia: {fallas}"
    assert len(res) == 26
    assert not errores, errores


def test_ejemplo_cumple_y_memoria_katex(navegador, url):
    pagina, errores = abrir(navegador, url)
    pagina.click("#btn-ejemplo")
    assert "cumple" in pagina.inner_text("#v-tit")
    assert pagina.locator(".chequeo.mal").count() == 0
    pagina.click("#btn-abrir")  # las secciones cerradas se dibujan al abrirlas
    pagina.wait_for_function("document.querySelectorAll('#memoria .katex').length > 60")
    assert pagina.locator("#memoria .katex-error").count() == 0
    assert pagina.locator("#memoria details.paso").count() == 6
    assert not errores, errores


def test_zapata_pequena_falla(navegador, url):
    pagina, _ = abrir(navegador, url)
    pagina.fill('[data-k="zapata.Lx"]', "1.5")
    assert "no cumple" in pagina.inner_text("#v-tit")
    assert pagina.locator(".chequeo.mal").count() >= 1


def test_malla_insuficiente_en_el_ejemplo(navegador, url):
    pagina, _ = abrir(navegador, url)
    pagina.click('#tipo-refuerzo [data-ref="malla"]')
    assert pagina.locator("#tabla-mallas tbody tr").count() == 20
    assert "Ninguna malla" in pagina.inner_text("#malla-req")
    assert "no cumple" in pagina.inner_text("#v-tit")


def test_malla_en_zapata_liviana(navegador, url):
    pagina, _ = abrir(navegador, url)
    # Zapata pequeña y poco cargada: la demanda queda en el mínimo de cuantía
    for k, v in {"cargas.D.P": "6", "cargas.L.P": "2", "cargas.D.Mx": "0.05", "cargas.D.My": "0.05",
                 "cargas.L.Mx": "0", "cargas.L.My": "0", "zapata.Lx": "1.0", "zapata.Ly": "1.0",
                 "zapata.d": "0.15", "columna.Cx": "0.3", "columna.Cy": "0.3", "columna.barra": "4"}.items():
        sel = f'[data-k="{k}"]'
        if k == "columna.barra":
            pagina.select_option(sel, v)
        else:
            pagina.fill(sel, v)
    pagina.click('#tipo-refuerzo [data-ref="malla"]')
    assert pagina.locator("#tabla-mallas tr.est-ok").count() >= 1
    assert pagina.locator("#tabla-mallas tr.sel.est-ok").count() == 1


def test_menu_de_tipos(navegador, url):
    pagina, _ = abrir(navegador, url)
    pagina.click("#btn-tipo")
    pagina.wait_for_selector("#menu-tipo.abierto")
    assert pagina.locator("#menu-tipo .menu-item").count() == 6
    assert pagina.locator("#menu-tipo .mi-tag.pronto").count() == 5
    pagina.keyboard.press("Escape")
    assert pagina.get_attribute("#btn-tipo", "aria-expanded") == "false"


def test_ventana_de_informe_y_paginacion(navegador, url):
    pagina, errores = abrir(navegador, url)
    assert pagina.locator("#inf-md").count() == 0  # sin opción de descargar Markdown
    pagina.evaluate("window.print = () => {}")
    pagina.click("#btn-imprimir")
    pagina.wait_for_selector("#dlg-informe[open]")
    pagina.fill("#inf-titulo", "")
    pagina.click("#inf-imprimir")
    assert "título" in pagina.inner_text("#inf-error")  # el título es obligatorio
    pagina.fill("#inf-titulo", "Memoria Z-1")
    pagina.fill("#inf-elaboro", "Juan Reyes")
    pagina.click("#inf-imprimir")
    pagina.wait_for_function("document.body.classList.contains('con-informe')")
    assert pagina.title() == "Memoria Z-1"  # nombre sugerido del PDF
    assert pagina.locator("#informe .inf-portada .inf-titulo").inner_text() == "Memoria Z-1"
    assert pagina.locator("#informe .inf-ec").count() > 60
    assert pagina.locator("#informe .inf-nota-pdf").count() == 0  # sin notas de corrección del documento
    # Ninguna hoja se desborda: el contenido cabe en el alto útil de cada hoja
    desbordes = pagina.evaluate("[...document.querySelectorAll('#informe .hoja')].filter(h => h.scrollHeight > h.clientHeight + 1).length")
    assert desbordes == 0
    assert not errores, errores


def test_capturas_y_sin_scroll_horizontal(navegador, url):
    CAPTURAS.mkdir(exist_ok=True)
    for nombre, ancho, alto, tema in [("escritorio", 1440, 900, "light"), ("escritorio-oscuro", 1440, 900, "dark"), ("celular", 390, 844, "light")]:
        pagina, errores = abrir(navegador, url, ancho, alto, tema)
        pagina.evaluate("document.querySelectorAll('#memoria details.paso').forEach((d, i) => { d.open = i < 2; })")
        pagina.wait_for_timeout(400)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}.png"), full_page=True)
        assert pagina.evaluate("document.documentElement.scrollWidth") <= ancho
        assert not errores, errores
