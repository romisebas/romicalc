"""Pruebas automáticas de la app con Playwright.

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


def abrir(navegador, url, ancho=1440, alto=900):
    pagina = navegador.new_page(viewport={"width": ancho, "height": alto})
    errores = []
    pagina.on("pageerror", lambda e: errores.append(str(e)))
    pagina.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pagina.goto(url)
    pagina.evaluate("localStorage.clear()")
    pagina.reload()
    pagina.wait_for_selector("#chequeos .chip")
    return pagina, errores


def test_validacion_contra_pdf(navegador, url):
    pagina, errores = abrir(navegador, url)
    res = pagina.evaluate("Zapata.validarContraPdf().map(r => ({lbl: r.lbl, ok: r.ok, err: r.err}))")
    fallas = [r for r in res if not r["ok"]]
    assert not fallas, f"Valores fuera de tolerancia: {fallas}"
    assert len(res) == 26
    assert not errores, errores


def test_ejemplo_cumple(navegador, url):
    pagina, _ = abrir(navegador, url)
    pagina.click("#btn-ejemplo")
    assert "cumple" in pagina.inner_text("#veredicto")
    assert pagina.locator(".chip.mal").count() == 0


def test_zapata_pequena_falla(navegador, url):
    pagina, _ = abrir(navegador, url)
    pagina.fill('[data-k="zapata.Lx"]', "1.5")
    assert "no cumple" in pagina.inner_text("#veredicto")
    assert pagina.locator(".chip.mal").count() >= 1


def test_capturas_y_sin_scroll_horizontal(navegador, url):
    CAPTURAS.mkdir(exist_ok=True)
    for nombre, ancho, alto in [("escritorio", 1440, 900), ("celular", 375, 812)]:
        pagina, errores = abrir(navegador, url, ancho, alto)
        pagina.wait_for_timeout(300)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}.png"), full_page=True)
        assert pagina.evaluate("document.documentElement.scrollWidth") <= ancho
        assert not errores, errores
