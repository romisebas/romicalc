"""Pruebas automáticas de ZapatAPP (v3.2) con Playwright.

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
    # Cola amplia: el navegador pide muchos archivos a la vez y la cola por defecto (5) rechaza conexiones
    servidor = type("Servidor", (http.server.ThreadingHTTPServer,), {"request_queue_size": 128})
    srv = servidor(("127.0.0.1", 0), manejador)
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
    assert "ZAPATAPP" in pagina.text_content("#titulo-app").upper()
    assert not errores, errores


def test_identidad_zapatapp_oscura(navegador, url):
    """v3.2: nombre ZapatAPP, tema oscuro por defecto (aunque el sistema pida claro), fuentes y escultura de vidrio."""
    pagina, errores = abrir(navegador, url, tema="light")
    assert pagina.title() == "ZapatAPP"
    assert "ZAPATAPP" in pagina.text_content("#titulo-app").upper()
    assert pagina.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(0, 0, 0)"
    for f in ['500 16px "Inter"', '400 40px "Anton"', 'italic 400 20px "Instrument Serif"']:
        assert pagina.evaluate(f"document.fonts.check({json.dumps(f)})"), f
    assert pagina.evaluate("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join()").count("Manrope") == 0
    assert pagina.locator("#bv-portada .escultura canvas").count() == 1
    assert pagina.locator(".esfera").count() == 0
    pagina.click("#btn-disenar")
    pagina.click("#op-ejemplo")
    pagina.wait_for_selector("#chequeos .chequeo")
    assert pagina.text_content(".marca-nombre").strip() == "ZapatAPP"
    pagina.click("#btn-tema")
    pagina.wait_for_function("getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)'")
    assert not errores, errores


def test_pestanas_veredicto_y_logo(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    assert pagina.locator("#marca-logo path.lg-varilla").count() == 1
    assert pagina.is_visible("#panel-veredicto") and not pagina.is_visible("#panel-planos")
    assert pagina.get_attribute("#veredicto", "class").split() == ["veredicto", "ok", "anima"]
    pagina.click("#tab-planos")
    assert pagina.is_visible("#panel-planos") and not pagina.is_visible("#panel-veredicto")
    assert pagina.locator("#planta svg").count() == 1
    pagina.keyboard.press("ArrowRight")
    assert pagina.get_attribute("#tab-refuerzo", "aria-selected") == "true"
    assert pagina.is_visible("#acero-x")
    # Un chequeo lleva a su paso en la pestaña Memoria
    pagina.click("#tab-veredicto")
    pagina.click('#chequeos [data-paso="pz"]')
    assert pagina.is_visible("#panel-memoria")
    # Al dejar de cumplir: veredicto en rojo con su propia animación
    pagina.click("#tab-veredicto")
    pagina.fill('.dims [data-k="zapata.Lx"]', "1.5")
    pagina.wait_for_function("document.querySelector('#veredicto').classList.contains('mal')")
    assert "anima" in pagina.get_attribute("#veredicto", "class")
    assert not errores, errores


def test_carga_al_continuar_proyecto(navegador, url):
    pagina, errores = abrir(navegador, url, anim="activadas")
    entrar_ejemplo(pagina)
    pagina.wait_for_timeout(500)  # guardado diferido
    pagina.click("#btn-inicio")
    pagina.click(".reciente")
    pagina.wait_for_selector("#cargando:not([hidden])")
    assert "ABRIENDO" in pagina.text_content("#cg-tit").upper()
    pagina.wait_for_function("parseInt(document.querySelector('#cg-pct').textContent) >= 40")
    pagina.wait_for_selector("#cargando", state="hidden", timeout=5000)
    assert pagina.text_content("#cg-pct").strip() == "100 %"
    assert "anima" in pagina.get_attribute("#veredicto", "class")
    assert not errores, errores


def test_pie_creditos_y_sin_validacion(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    assert pagina.locator("#validacion").count() == 0
    pie = pagina.text_content(".pie")
    assert "© 2026 Sebastian Romario Martinez Guerrero" in pie
    assert "Gustavo Chang" not in pie and "Herramienta académica" not in pie
    enlace = pagina.locator("a.pie-github")
    assert enlace.get_attribute("href") == "https://github.com/romisebas"
    assert enlace.get_attribute("target") == "_blank" and "noopener" in enlace.get_attribute("rel")
    pagina.evaluate("window.open = (u) => { window.__abierto = u; }")
    enlace.click()
    assert "gira" in enlace.get_attribute("class")
    pagina.wait_for_function("window.__abierto === 'https://github.com/romisebas'")
    assert not errores, errores


def test_unidades_y_coeficientes_por_sistema(navegador, url):
    pagina, errores = abrir(navegador, url)
    r = pagina.evaluate("""() => {
      const U = Unidades, T = Tipos['aislada-momento'];
      const calc = (s) => { const e = T.clone(T.EJEMPLO); e.unid = s; return T.calcular(T.preparar(e)); };
      const c = calc('curso'), si = calc('si'), en = calc('ingles');
      return {
        fcMPa: U.a(280, 'esfuerzo', 'si'), fcPsi: U.a(280, 'esfuerzo', 'ingles'), pKip: U.a(1, 'fuerza', 'ingles'),
        qKpa: U.a(12, 'presion', 'si'), lFt: U.a(2.5, 'longitud', 'ingles'),
        k: [U.coef('curso').pz1, U.coef('si').pz1, U.coef('ingles').pz3],
        pz: [c.pz.phiVc, si.pz.phiVc, en.pz.phiVc], cu: [c.cu.x.phiVc, si.cu.x.phiVc, en.cu.x.phiVc],
        ld: [c.ld.ldc, si.ld.ldc, en.ld.ldc], det: [c.chequeos[1].det, si.chequeos[1].det, en.chequeos[1].det],
      };
    }""")
    assert abs(r["fcMPa"] - 27.46) < 0.01 and abs(r["fcPsi"] - 3982.5) < 1 and abs(r["pKip"] - 2.2046) < 1e-3
    assert abs(r["qKpa"] - 117.68) < 0.01 and abs(r["lFt"] - 8.2021) < 1e-3
    assert r["k"] == [0.53, 0.17, 4]
    # Las ecuaciones en MPa y en psi dan resultados cercanos (no idénticos) a los del curso
    for lista in (r["pz"], r["cu"]):
        assert all(abs(x / lista[0] - 1) < 0.07 for x in lista), lista  # el curso usa 1.0√f'c en C.11-33
    assert r["pz"][1] != r["pz"][0]
    assert all(abs(x / r["ld"][0] - 1) < 0.1 for x in r["ld"]), r["ld"]
    assert "tonf" in r["det"][0] and "kN" in r["det"][1] and "kip" in r["det"][2]
    assert not errores, errores


def test_ejemplo_cumple_y_memoria_katex(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    assert "cumple" in pagina.text_content("#v-tit")
    assert pagina.locator(".chequeo.mal").count() == 0
    pagina.click("#tab-memoria")
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
    pagina.click("#tab-refuerzo")
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
    pagina.click("#tab-refuerzo")
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
