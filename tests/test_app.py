"""Pruebas automáticas de Diseño de Zapatas (v3) con Playwright.

Ejecutar desde la carpeta del proyecto:
    py -3.12 -m pytest tests -q
Las capturas quedan en tests/capturas/.
"""
import functools
import http.server
import json
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
CAPTURAS = Path(__file__).resolve().parent / "capturas"
EJEMPLO = {
    "cargas.D.P": "44.262", "cargas.D.Mx": "0.196", "cargas.D.My": "0.3",
    "cargas.L.P": "8.534", "cargas.L.Mx": "0.036", "cargas.L.My": "0.057",
}


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


def abrir(navegador, url, ancho=1440, alto=900, tema="light", intro=False, anim="desactivadas"):
    ctx = navegador.new_context(viewport={"width": ancho, "height": alto}, color_scheme=tema)
    pagina = ctx.new_page()
    errores = []
    pagina.on("pageerror", lambda e: errores.append(str(e)))
    pagina.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pagina.goto(url)
    ajustes = json.dumps({"anim": anim, "sinIntro": not intro})
    pagina.evaluate(f"localStorage.clear(); localStorage.setItem('dz-ajustes', {json.dumps(ajustes)})")
    pagina.reload()
    if not intro:
        pagina.wait_for_selector("#bv-portada:not([hidden])")
    pagina.evaluate("document.fonts.ready")
    return pagina, errores


def entrar_ejemplo(pagina):
    pagina.click("#btn-disenar")
    pagina.click("#op-ejemplo")
    pagina.wait_for_selector("#chequeos .chequeo")


def editar(pagina, categoria, valores):
    """Abre la ventana de una categoría desde el dashboard, llena los campos y la cierra."""
    pagina.click(f'#categorias [data-cat="{categoria}"]')
    pagina.wait_for_selector("#asistente[open]")
    for k, v in valores.items():
        sel = f'#asistente [data-k="{k}"]'
        if pagina.locator(sel).evaluate("e => e.tagName") == "SELECT":
            pagina.select_option(sel, v)
        else:
            pagina.fill(sel, v)
    pagina.click("#wz-siguiente")
    pagina.wait_for_selector("#asistente", state="hidden")


def test_validacion_contra_pdf(navegador, url):
    pagina, errores = abrir(navegador, url)
    res = pagina.evaluate("Zapata.validarContraPdf().map(r => ({lbl: r.lbl, ok: r.ok}))")
    assert len(res) == 26 and all(r["ok"] for r in res), res
    assert not errores, errores


def test_intro_y_saltar(navegador, url):
    pagina, errores = abrir(navegador, url, intro=True, anim="activadas")
    pagina.wait_for_selector("#intro:not([hidden]) canvas")
    pagina.wait_for_timeout(600)
    pagina.click("#btn-saltar")
    pagina.wait_for_selector("#bv-portada:not([hidden])", timeout=4000)
    assert "DISEÑO" in pagina.text_content("#titulo-app").upper()
    assert not errores, errores


def test_ejemplo_cumple_y_memoria_katex(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    assert "cumple" in pagina.text_content("#v-tit")
    assert pagina.locator(".chequeo.mal").count() == 0
    pagina.click("#btn-abrir")
    pagina.wait_for_function("document.querySelectorAll('#memoria .katex').length > 60")
    assert pagina.locator("#memoria .katex-error").count() == 0
    assert not errores, errores


def test_nueva_zapata_vacia_y_asistente(navegador, url):
    pagina, errores = abrir(navegador, url)
    pagina.click("#btn-disenar")
    pagina.click("#op-nueva")
    pagina.click('.tipo-tarjeta[data-tipo="aislada-momento"]')
    pagina.wait_for_selector("#asistente[open]")
    # Todos los campos numéricos vacíos, en el asistente y en el dashboard
    llenos = pagina.evaluate("[...document.querySelectorAll('[data-k]')].filter(e => e.type !== 'checkbox' && e.value !== '').map(e => e.dataset.k)")
    assert llenos == [], llenos
    assert "Paso 1 de 7" in pagina.text_content("#wz-contador")
    pagina.fill('#asistente [data-k="proyecto.nombre"]', "Bloque B")
    pagina.click("#wz-siguiente")
    # Cargas vacías: aviso y botón para continuar de todos modos
    pagina.click("#wz-siguiente")
    assert "Faltan" in pagina.text_content("#wz-error")
    for k, v in EJEMPLO.items():
        pagina.fill(f'#asistente [data-k="{k}"]', v)
    pagina.click("#wz-siguiente")
    pagina.fill('#asistente [data-k="suelo.qadm"]', "12")
    pagina.fill('#asistente [data-k="suelo.Df"]', "1.5")
    pagina.click("#wz-siguiente")
    pagina.fill('#asistente [data-k="columna.Cx"]', "0.5")
    pagina.fill('#asistente [data-k="columna.Cy"]', "0.4")
    pagina.select_option('#asistente [data-k="columna.barra"]', "7")
    pagina.fill('#asistente [data-k="columna.nBarras"]', "8")
    pagina.select_option('#asistente [data-k="columna.alpha"]', "40")
    pagina.click("#wz-siguiente")
    pagina.fill('#asistente [data-k="materiales.fc"]', "280")
    pagina.fill('#asistente [data-k="materiales.fy"]', "4200")
    pagina.click("#btn-nsr")
    assert pagina.input_value('#asistente [data-k="materiales.phiV"]') == "0.75"
    pagina.click("#wz-siguiente")
    assert "Planta" in pagina.text_content("#wz-titulo")
    pagina.click("#btn-opt-planta")
    assert "cumplen" in pagina.text_content("#wz-planta-v")
    assert pagina.locator("#wz-planta svg").count() == 1
    pagina.click("#wz-siguiente")
    pagina.click("#btn-opt-d")
    pagina.wait_for_selector("#wz-altura li.ok")
    pagina.click("#wz-siguiente")
    pagina.wait_for_selector("#asistente", state="hidden")
    assert "cumple" in pagina.text_content("#v-tit")
    assert not errores, errores


def test_recientes(navegador, url):
    pagina, _ = abrir(navegador, url)
    entrar_ejemplo(pagina)
    pagina.wait_for_timeout(500)  # guardado diferido
    pagina.click("#btn-inicio")
    pagina.wait_for_selector("#recientes:not([hidden]) .reciente")
    assert pagina.locator(".reciente").count() == 1
    assert "Cumple" in pagina.text_content(".rc-estado")
    pagina.click(".reciente")
    pagina.wait_for_selector("#chequeos .chequeo")


def test_zapata_pequena_falla(navegador, url):
    pagina, _ = abrir(navegador, url)
    entrar_ejemplo(pagina)
    pagina.fill('.dims [data-k="zapata.Lx"]', "1.5")
    assert "no cumple" in pagina.text_content("#v-tit")
    pagina.click('.dims .pn-btn[data-paso-k="zapata.Lx"][data-delta="0.05"]')
    assert pagina.input_value('.dims [data-k="zapata.Lx"]') == "1.55"


def test_malla_insuficiente_en_el_ejemplo(navegador, url):
    pagina, _ = abrir(navegador, url)
    entrar_ejemplo(pagina)
    pagina.click('#tipo-refuerzo [data-ref="malla"]')
    assert pagina.locator("#tabla-mallas tbody tr").count() == 20
    assert "Ninguna malla" in pagina.text_content("#malla-req")


def test_malla_en_zapata_liviana(navegador, url):
    pagina, _ = abrir(navegador, url)
    entrar_ejemplo(pagina)
    editar(pagina, "cargas", {"cargas.D.P": "6", "cargas.L.P": "2", "cargas.D.Mx": "0.05", "cargas.D.My": "0.05", "cargas.L.Mx": "0", "cargas.L.My": "0"})
    editar(pagina, "columna", {"columna.Cx": "0.3", "columna.Cy": "0.3", "columna.barra": "4"})
    editar(pagina, "planta", {"zapata.Lx": "1.0", "zapata.Ly": "1.0"})
    pagina.fill('.dims [data-k="zapata.d"]', "0.15")
    pagina.click('#tipo-refuerzo [data-ref="malla"]')
    assert pagina.locator("#tabla-mallas tr.sel.est-ok").count() == 1


def test_tipos_de_zapata(navegador, url):
    pagina, _ = abrir(navegador, url)
    pagina.click("#btn-disenar")
    pagina.click("#op-nueva")
    assert pagina.locator(".tipo-tarjeta").count() == 6
    assert pagina.locator(".tipo-tarjeta.pronto").count() == 5


def test_informe_paginado_y_documento_listo(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    pagina.evaluate("window.print = () => {}")
    pagina.click("#btn-imprimir")
    pagina.wait_for_selector("#dlg-informe[open]")
    pagina.fill("#inf-titulo", "Memoria Z-1")
    pagina.click("#inf-imprimir")
    pagina.wait_for_function("document.body.classList.contains('con-informe')")
    assert pagina.title() == "Memoria Z-1"
    assert pagina.locator("#informe .inf-resumen .katex").count() == 6  # chequeos en LaTeX
    assert pagina.locator("#informe .inf-datos .katex").count() > 15  # símbolos de los datos
    desbordes = pagina.evaluate("[...document.querySelectorAll('#informe .hoja')].filter(h => h.scrollHeight > h.clientHeight + 1).length")
    assert desbordes == 0
    pagina.evaluate("window.dispatchEvent(new Event('afterprint'))")
    pagina.wait_for_selector("#doc-listo[open]")
    assert "Documento listo" in pagina.text_content("#doc-listo")
    assert not errores, errores


def test_capturas_y_sin_scroll_horizontal(navegador, url):
    CAPTURAS.mkdir(exist_ok=True)
    for nombre, ancho, alto, tema in [("escritorio", 1440, 900, "light"), ("escritorio-oscuro", 1440, 900, "dark"), ("celular", 390, 844, "light")]:
        pagina, errores = abrir(navegador, url, ancho, alto, tema)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}-portada.png"))
        pagina.click("#btn-disenar")
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}-opciones.png"))
        pagina.click("#op-ejemplo")
        pagina.wait_for_selector("#chequeos .chequeo")
        pagina.wait_for_timeout(300)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}-dashboard.png"), full_page=True)
        assert pagina.evaluate("document.documentElement.scrollWidth") <= ancho
        pagina.click('#categorias [data-cat="planta"]')
        pagina.wait_for_selector("#asistente[open]")
        pagina.wait_for_timeout(250)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}-asistente-planta.png"))
        assert not errores, errores
