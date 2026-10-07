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


CONTEXTOS = []


@pytest.fixture(autouse=True)
def cerrar_contextos():
    """Cierra las páginas de cada prueba: si quedan abiertas, sus escenas 3D siguen consumiendo CPU."""
    yield
    while CONTEXTOS:
        CONTEXTOS.pop().close()


def abrir(navegador, url, ancho=1440, alto=900, tema="light", intro=False, anim="desactivadas"):
    ctx = navegador.new_context(viewport={"width": ancho, "height": alto}, color_scheme=tema)
    CONTEXTOS.append(ctx)
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


def siguiente(pagina):
    """Avanza el asistente y espera a que cambie el paso (evita clics perdidos por cambios de altura)."""
    antes = pagina.text_content("#wz-contador")
    pagina.click("#wz-siguiente")
    pagina.wait_for_function("t => document.querySelector('#wz-contador').textContent !== t", arg=antes)


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
    assert "Cortante en dos direcciones" in pagina.text_content("#ficha")
    pagina.click("#ficha .ficha-memoria")
    assert pagina.is_visible("#panel-memoria")
    # Al dejar de cumplir: veredicto en rojo con su propia animación
    pagina.click("#tab-planos")
    pagina.fill('.dims [data-k="zapata.Lx"]', "1.5")
    pagina.click("#tab-veredicto")
    pagina.wait_for_function("document.querySelector('#veredicto').classList.contains('mal')")
    assert "Esfuerzos sobre el suelo" in pagina.text_content("#v-fallas")
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


def test_ajuste_de_unidades(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    def elegir(sistema):
        pagina.click("#barra-sup [data-abrir-ajustes]")
        pagina.wait_for_selector("#dlg-ajustes[open]")
        pagina.check(f'input[name="aj-unid"][value="{sistema}"]')
        pagina.click("#dlg-ajustes .btn-acento")
        pagina.wait_for_selector("#dlg-ajustes", state="hidden")
    elegir("si")
    assert pagina.locator("#cifras > div").count() == 3
    assert "kPa" in pagina.text_content(".detalle")
    pagina.click('#chequeos [data-paso="pz"]')
    assert "kN" in pagina.text_content("#ficha")
    assert abs(float(pagina.input_value('#asistente [data-k="materiales.fc"]')) - 27.4586) < 1e-3
    elegir("ingles")
    assert abs(float(pagina.input_value('.dims [data-k="zapata.Lx"]')) - 8.2021) < 1e-3
    pagina.click('#chequeos [data-paso="pz"]')
    assert "kip" in pagina.text_content("#ficha")
    # Editar en pies guarda en metros
    pagina.click("#tab-planos")
    pagina.fill('.dims [data-k="zapata.Lx"]', "9")
    assert abs(pagina.evaluate("JSON.parse(localStorage.getItem('dz-ajustes')).unid === 'ingles' ? 1 : 0") - 1) < 1e-9
    elegir("curso")
    assert pagina.input_value('.dims [data-k="zapata.Lx"]') == "2.7432"
    assert pagina.input_value('#asistente [data-k="materiales.fc"]') == "280"
    assert not errores, errores


def test_diapositivas_rapidas_no_se_solapan(navegador, url):
    pagina, errores = abrir(navegador, url, anim="activadas")
    entrar_ejemplo(pagina)
    pagina.click("#tab-memoria")
    for _ in range(10):
        pagina.click("#diapo-sig", delay=0)
        assert pagina.locator("#memoria .diapo").count() <= 2
    pagina.wait_for_timeout(700)
    assert pagina.locator("#memoria .diapo").count() == 1
    assert pagina.text_content("#diapo-contador").startswith("11 de")
    assert not errores, errores


def test_riel_de_datos(navegador, url):
    pagina, errores = abrir(navegador, url, anim="activadas")
    entrar_ejemplo(pagina)
    riel = pagina.locator("#categorias")
    assert riel.locator(".cat svg").count() == 7
    angosto = riel.bounding_box()["width"]
    assert angosto < 70 and riel.bounding_box()["x"] < 20
    pagina.hover('#categorias [data-cat="cargas"]')
    pagina.wait_for_timeout(450)
    assert riel.bounding_box()["width"] > 180
    assert pagina.locator('#categorias [data-cat="cargas"] .cat-nom').evaluate("e => getComputedStyle(e).opacity") == "1"
    pagina.click('#categorias [data-cat="cargas"]')
    assert "pulsado" in pagina.get_attribute('#categorias [data-cat="cargas"]', "class")
    pagina.wait_for_selector("#asistente[open]")
    assert "Cargas" in pagina.text_content("#wz-titulo")
    assert not errores, errores


def test_refuerzo_elegido_3d_y_dibujo(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    pagina.click("#tab-refuerzo")
    assert pagina.locator("#elegido-3d canvas").count() == 1
    sep = pagina.evaluate("document.querySelector('.elegido').getBoundingClientRect().top - document.querySelector('#tipo-refuerzo').getBoundingClientRect().bottom")
    assert sep >= 24, sep
    assert "#4" in pagina.text_content("#elegido-tit")
    assert "Barra corrugada #4" in pagina.text_content("#elegido-2d")
    pagina.check('#acero-x input[value="6"]')
    pagina.wait_for_function("document.querySelector('#elegido-tit').textContent.includes('#6')")
    pagina.click('#elegido-dir [data-dir="Y"]')
    assert "#4" in pagina.text_content("#elegido-tit") and "Y" in pagina.text_content("#elegido-tit")
    pagina.click('#tipo-refuerzo [data-ref="malla"]')
    assert "Malla" in pagina.text_content("#elegido-tit")
    assert pagina.locator("#elegido-2d .soldadura").count() == 12
    assert pagina.is_hidden("#elegido-dir")
    assert not errores, errores


def test_animaciones_de_logos_y_cierre_de_pestana(navegador, url):
    pagina, errores = abrir(navegador, url, anim="activadas")
    entrar_ejemplo(pagina)
    anim = lambda sel: pagina.eval_on_selector(sel, "e => getComputedStyle(e).animationName")
    pagina.hover("#btn-inicio")
    assert anim("#marca-logo path") == "varillaDobla"
    pagina.hover("#barra-sup .btn-icono[data-abrir-ajustes]")
    assert anim("#barra-sup .btn-icono[data-abrir-ajustes] circle") == "ajusteDesliza"
    pagina.hover("#btn-tema")
    assert anim("#btn-tema svg") == "temaGira"
    pagina.hover(".pie-github")
    assert anim(".pie-github .gh-icono") == "ghSaluda"
    pagina.hover("#pie-logo")
    assert anim("#pie-logo path") == "varillaDobla"
    # Al cambiar de pestaña, la anterior se cierra con su propia animación antes de mostrar la nueva
    # Se comprueba en el mismo instante del clic (un clic lento podría llegar después de los 200 ms)
    estado = pagina.evaluate("""() => { document.querySelector('#tab-planos').click();
      const v = document.querySelector('#panel-veredicto');
      return [!v.hidden, document.querySelector('#panel-planos').hidden, v.getAnimations().length]; }""")
    assert estado[0] and estado[1] and estado[2] > 0, estado
    pagina.wait_for_selector("#panel-planos", state="visible", timeout=1500)
    assert pagina.is_hidden("#panel-veredicto")
    assert not errores, errores


def test_pantalla_de_opciones(navegador, url):
    pagina, errores = abrir(navegador, url, anim="activadas")
    pagina.click("#btn-disenar")
    assert "Paso 1 de 2" in pagina.text_content("#bv-opciones .bv-eti")
    assert pagina.locator("#bv-opciones .bv-sub").count() == 1
    assert pagina.locator(".opcion .op-ico").count() == 3 and pagina.locator(".opcion .op-tit").count() == 3
    pagina.click("#op-nueva")
    assert "elige-nueva" in pagina.get_attribute("#op-nueva", "class")
    pagina.wait_for_selector("#bv-tipos:not([hidden])", timeout=3000)
    assert pagina.locator("#tipos .tt-ico").count() == 6
    assert "Paso 2 de 2" in pagina.text_content("#bv-tipos .bv-eti")
    pagina.click('#bv-tipos [data-ir="opciones"]')
    pagina.click("#op-ejemplo")
    assert "elige-ejemplo" in pagina.get_attribute("#op-ejemplo", "class")
    pagina.wait_for_selector("#chequeos .chequeo", timeout=4000)
    pagina.wait_for_timeout(500)
    pagina.click("#btn-inicio")
    pagina.wait_for_selector("#recientes:not([hidden]) .rc-mini .rc-col")
    pagina.evaluate("document.getElementById('archivo-importar').click = () => { window.__importar = true; }")
    pagina.click("#op-importar")
    assert "elige-importar" in pagina.get_attribute("#op-importar", "class")
    pagina.wait_for_function("window.__importar === true", timeout=3000)
    assert not errores, errores


def test_subindices_en_textos_y_dibujos(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    plano = """(sel) => { const out = []; const w = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const t = w.currentNode; if (!t.parentElement.closest('.katex') && /σmax|φVc|\bVu\b|\bldc\b|\bMux\b|\bAs\b/.test(t.nodeValue)) out.push(t.nodeValue); } return out; }"""
    assert pagina.evaluate(plano, ".detalle") == []
    pagina.click('#chequeos [data-paso="serv"]')
    assert pagina.locator(".detalle sub").count() >= 2
    pagina.click("#tab-planos")
    assert pagina.locator("#planta svg tspan.subi").count() >= 4
    pagina.click("#tab-refuerzo")
    assert pagina.locator("#acero-x sub").count() >= 1
    pagina.click("#tab-memoria")
    assert pagina.evaluate(plano, "#memoria") == []
    assert not errores, errores


def test_detalle_con_anillos(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    assert pagina.locator("#v-contexto li").count() == 3
    assert "Gobierna 1.2D + 1.6L" in pagina.text_content("#v-contexto")
    assert pagina.locator("#chequeos .anillo svg").count() == 6
    # Por defecto, la ficha del chequeo más exigido (flexión, 97 %)
    assert "Flexión y refuerzo" in pagina.text_content("#ficha .ficha-tit")
    assert pagina.get_attribute('#chequeos [data-paso="fl"]', "aria-selected") == "true"
    pagina.click('#chequeos [data-paso="ap"]')
    assert "Aplastamiento" in pagina.text_content("#ficha .ficha-tit")
    assert "309.40" in pagina.text_content("#ficha")
    assert not errores, errores


def test_opciones_permite_scroll(navegador, url):
    for ancho, alto in ((1440, 700), (390, 844)):
        pagina, errores = abrir(navegador, url, ancho, alto)
        entrar_ejemplo(pagina)
        pagina.wait_for_timeout(500)  # guardado diferido: aparece en recientes
        pagina.click("#btn-inicio")
        pagina.wait_for_selector("#recientes:not([hidden]) .reciente")
        assert pagina.evaluate("document.documentElement.scrollHeight") > alto
        pagina.mouse.wheel(0, 3000)
        pagina.wait_for_function("window.scrollY > 0")
        assert pagina.is_visible(".reciente") and pagina.locator(".reciente").bounding_box()["y"] < alto
        assert not errores, errores


def test_three_moderno_y_escena_compartida(navegador, url):
    pagina, errores = abrir(navegador, url)
    r = pagina.evaluate("""() => {
      const c = document.createElement('div'); c.style.cssText = 'width:200px;height:150px'; document.body.appendChild(c);
      const e = Escena3D.crear(c);
      const out = [Number(THREE.REVISION), e.renderer.outputColorSpace, e.renderer.toneMapping === THREE.ACESFilmicToneMapping, !!e.scene.environment, typeof THREE.OrbitControls];
      e.renderer.dispose(); c.remove(); return out; }""")
    assert r[0] >= 170 and r[1] == "srgb" and r[2] and r[3] and r[4] == "function", r
    assert not errores, errores


def test_intro_de_la_tierra_al_logo(navegador, url):
    pagina, errores = abrir(navegador, url, intro=True, anim="activadas")
    pagina.wait_for_selector("#intro:not([hidden]) canvas")
    pagina.evaluate("""() => { window.__fases = []; new MutationObserver(() => { const f = document.querySelector('#intro').dataset.fase;
      if (f && window.__fases[window.__fases.length - 1] !== f) window.__fases.push(f); }).observe(document.querySelector('#intro'), { attributes: true, attributeFilter: ['data-fase'] }); }""")
    t0 = pagina.evaluate("performance.now()")
    pagina.wait_for_selector("#bv-portada:not([hidden])", timeout=90000)  # el WebGL por software de las pruebas es lento
    fases = pagina.evaluate("window.__fases")
    for f in ["excavacion", "parrilla", "columna", "vaciado", "carga", "logo", "fin"]:
        assert f in fases, fases
    assert pagina.locator("#intro canvas").count() == 0
    assert not errores, errores


def test_portada_editorial(navegador, url):
    pagina, errores = abrir(navegador, url, anim="activadas")
    assert pagina.locator("#titulo-app .letra").count() == 8
    assert "NSR-10" in pagina.text_content(".bv-version")
    assert pagina.locator(".bv-cinta .bv-cinta-item").count() >= 14  # la cinta se repite para girar sin cortes
    assert pagina.locator("#btn-disenar svg").count() == 1
    pagina.click("#btn-disenar")
    assert pagina.locator(".bv-expande").count() == 1
    pagina.wait_for_selector("#bv-opciones:not([hidden])", timeout=3000)
    pagina.wait_for_selector(".bv-expande", state="detached", timeout=3000)
    assert not errores, errores
    movil, errores2 = abrir(navegador, url, 390, 844)
    assert movil.evaluate("document.documentElement.scrollWidth") <= 390
    assert movil.is_visible("#btn-disenar")
    assert not errores2, errores2


def test_planta_moderna_e_interactiva(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    pagina.click("#tab-planos")
    assert pagina.locator("#planta .isobara").count() >= 3
    assert pagina.locator("#planta .escala-color").count() == 1
    assert pagina.locator("#planta .cota .punta").count() >= 4
    assert pagina.locator("#planta .pildora").count() == 4
    # Lectura de σ bajo el mouse, en el centro de la zapata ≈ P/A
    caja = pagina.locator("#planta svg").bounding_box()
    pagina.mouse.move(caja["x"] + caja["width"] / 2 + 3, caja["y"] + caja["height"] / 2 + 3)
    pagina.wait_for_selector(".tip-planta:not([hidden])")
    valor = float(pagina.text_content(".tip-planta").split("=")[1].split()[0])
    assert abs(valor - 10.56) < 0.15, valor
    # Acercar con la rueda y volver al encuadre
    vb0 = pagina.get_attribute("#planta svg", "viewBox")
    pagina.mouse.wheel(0, -400)
    pagina.wait_for_function("vb => document.querySelector('#planta svg').getAttribute('viewBox') !== vb", arg=vb0)
    pagina.click("#planta-encuadre")
    assert pagina.get_attribute("#planta svg", "viewBox") == vb0
    # Al cambiar de capa se conserva el acercamiento
    pagina.mouse.wheel(0, -400)
    vb1 = pagina.get_attribute("#planta svg", "viewBox")
    pagina.click('#capas [data-capa="punz"]')
    assert pagina.get_attribute("#planta svg", "viewBox") == vb1
    assert not errores, errores


def test_ejemplo_cumple_y_memoria_katex(navegador, url):
    pagina, errores = abrir(navegador, url)
    entrar_ejemplo(pagina)
    assert "cumple" in pagina.text_content("#v-tit")
    assert pagina.locator(".chequeo.mal").count() == 0
    pagina.click("#tab-memoria")
    # Memoria por diapositivas: una visible, con texto, ecuaciones y figura
    assert pagina.locator("#memoria .diapo").count() == 1
    assert pagina.locator("#memoria .dp-cap").count() == 6
    total = int(pagina.text_content("#diapo-contador").split(" de ")[1])
    assert total >= 20
    vistos = 0
    for k in range(total):
        assert pagina.text_content("#diapo-contador").startswith(f"{k + 1} de")
        d = pagina.locator("#memoria .diapo:not(.saliendo)").last
        assert d.locator(".diapo-tit").count() == 1 and d.locator(".diapo-fig svg").count() == 1
        vistos += d.locator(".katex").count()
        assert pagina.locator("#memoria .katex-error").count() == 0
        if k < total - 1:
            pagina.locator("#memoria .dp-escena").focus()
            pagina.keyboard.press("ArrowRight")
    assert vistos > 60
    dup = pagina.evaluate("(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return ids.filter((x, k) => ids.indexOf(x) !== k); })()")
    assert dup == [], dup
    assert pagina.is_disabled("#diapo-sig")
    pagina.click('#memoria .dp-cap[data-cap="ap"]')
    assert "Aplastamiento" in pagina.text_content("#memoria .diapo:not(.saliendo) .diapo-cap") or "aplastamiento" in pagina.text_content("#memoria .diapo:not(.saliendo) .diapo-cap")
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
    siguiente(pagina)
    # Cargas vacías: aviso y botón para continuar de todos modos
    pagina.click("#wz-siguiente")
    assert "Faltan" in pagina.text_content("#wz-error")
    for k, v in EJEMPLO.items():
        pagina.fill(f'#asistente [data-k="{k}"]', v)
    siguiente(pagina)
    pagina.fill('#asistente [data-k="suelo.qadm"]', "12")
    pagina.fill('#asistente [data-k="suelo.Df"]', "1.5")
    siguiente(pagina)
    pagina.fill('#asistente [data-k="columna.Cx"]', "0.5")
    pagina.fill('#asistente [data-k="columna.Cy"]', "0.4")
    pagina.select_option('#asistente [data-k="columna.barra"]', "7")
    pagina.fill('#asistente [data-k="columna.nBarras"]', "8")
    pagina.select_option('#asistente [data-k="columna.alpha"]', "40")
    siguiente(pagina)
    pagina.fill('#asistente [data-k="materiales.fc"]', "280")
    pagina.fill('#asistente [data-k="materiales.fy"]', "4200")
    pagina.click("#btn-nsr")
    assert pagina.input_value('#asistente [data-k="materiales.phiV"]') == "0.75"
    siguiente(pagina)
    assert "Planta" in pagina.text_content("#wz-titulo")
    pagina.click("#btn-opt-planta")
    assert "cumplen" in pagina.text_content("#wz-planta-v")
    assert pagina.locator("#wz-planta svg").count() == 1
    siguiente(pagina)
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
    pagina.click("#tab-planos")
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
    pagina.click("#tab-planos")
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
    # Entrega profesional: contenido con páginas, pie numerado y secciones en orden
    assert pagina.locator("#informe .inf-toc li").count() == 8
    hojas = pagina.locator("#informe .hoja").count()
    assert pagina.text_content("#informe .hoja:nth-child(2) .hoja-pie").strip().endswith(f"Página 2 de {hojas}")
    assert pagina.locator("#informe .katex-error").count() == 0
    assert pagina.locator("#informe .inf-fig-cap svg").count() == 6
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
        if ancho < 900:
            pagina.click("#btn-datos")
            pagina.wait_for_timeout(400)
            pagina.screenshot(path=str(CAPTURAS / f"{nombre}-riel.png"))
        pagina.click('#categorias [data-cat="planta"]')
        pagina.wait_for_selector("#asistente[open]")
        pagina.wait_for_timeout(250)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}-asistente-planta.png"))
        assert not errores, errores
