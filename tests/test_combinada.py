"""Pruebas de la zapata combinada (beta 1.2): motor y mesa.

Ejecutar desde la carpeta del proyecto:
    py -3.12 -m pytest tests/test_combinada.py -q
"""
from test_app import abrir


def calc_ejemplo(pagina, cambios="", metodo="documento"):
    return pagina.evaluate(f"""() => {{ const T = Tipos['combinada'], e = T.clone(T.EJEMPLO);
      e.metodo = '{metodo}'; {cambios}; return T.calcular(T.preparar(e)); }}""")


def test_concreto_compartido(navegador, url):
    pagina, errores = abrir(navegador, url)
    r = pagina.evaluate("""() => {
      const C = Concreto, fl = C.flexion(122.42, 3.40, 0.68, 280, 4200, 0.9, 'bd');
      const min = C.flexion(79.09, 3.40, 0.68, 280, 4200, 0.9, 'bh', 0.75);
      return { As: fl.As, rho: fl.rho, Asmin: min.As, ld: C.ldTraccion(6, 280, 4200, 1, true, 'curso') };
    }""")
    assert abs(r["As"] - 48.53) < 0.3 and abs(r["rho"] - 0.0021) < 0.0001
    assert abs(r["Asmin"] - 45.90) < 0.05
    assert 900 < r["ld"] < 1200   # #6 superior, f'c 280, fy 4200 ≈ 1.0 m
    assert not errores
