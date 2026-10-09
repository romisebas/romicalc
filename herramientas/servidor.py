"""Servidor local de desarrollo para RomiCalc, sin caché del navegador.

Uso (desde la carpeta del proyecto):
    python herramientas/servidor.py [puerto]

Igual que `python -m http.server`, pero envía `Cache-Control: no-store`
para que cada recarga muestre los cambios recientes de CSS y JavaScript.
"""
import functools
import http.server
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    manejador = functools.partial(SinCache, directory=str(RAIZ))
    with http.server.ThreadingHTTPServer(("127.0.0.1", puerto), manejador) as srv:
        print(f"RomiCalc en http://localhost:{puerto}")
        srv.serve_forever()
