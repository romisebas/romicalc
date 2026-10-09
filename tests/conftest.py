"""Fixtures compartidas por las pruebas de RomiCalc (servidor local, navegador y cierre de páginas)."""
import functools
import http.server
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent


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
