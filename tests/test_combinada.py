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


def test_combinada_planta(navegador, url):
    pagina, errores = abrir(navegador, url)
    R = calc_ejemplo(pagina)
    assert abs(R["cols"][0]["Ps"] - 99.07) < 0.5 and abs(R["cols"][1]["Ps"] - 183.62) < 0.9
    assert abs(R["R"] - 4.05) < 1e-9
    assert abs(R["cols"][0]["PsE"] - 103.66) < 0.05
    assert abs(R["xbar"] - 3.50) < 0.01 and abs(R["L"] - 7.00) < 1e-9 and abs(R["B"] - 3.40) < 1e-9
    assert abs(R["serv"]["A"] - 23.56) < 0.12 and R["serv"]["caso"] == "sin"
    assert R["ult"]["combo"] == "1.2D + 1.6L"
    assert abs(R["cols"][0]["Pu"] - 126.19) < 0.05 and abs(R["cols"][1]["Pu"] - 235.37) < 0.05
    vacio = pagina.evaluate("Tipos['combinada'].faltantes(Tipos['combinada'].VACIO).length")
    assert vacio > 0
    assert not errores


def test_combinada_L_fija_insuficiente(navegador, url):
    pagina, errores = abrir(navegador, url)
    R = calc_ejemplo(pagina, "e.geometria.modoL = 'fijo'; e.geometria.L = 5.4")
    assert R["serv"]["ok"] is False and any("no cubre" in a for a in R["avisos"])
    R = calc_ejemplo(pagina, "e.geometria.modoL = 'fijo'; e.geometria.L = 6.0")
    assert R["serv"]["smin"] >= 0 and abs(R["e"] + 0.5) < 0.01
    assert not errores


def test_combinada_longitudinal_documento(navegador, url):
    pagina, errores = abrir(navegador, url)
    R = calc_ejemplo(pagina); p = R["lon"]["puntos"]
    assert abs(R["q"]["q1"] - 15.20) < 0.08 and R["q"]["uniforme"]
    assert abs(p["ext"]["Vizq"] - 12.91) < 0.07 and abs(p["ext"]["Vder"] + 113.27) < 0.57
    assert abs(p["int"]["Vizq"] - 144.97) < 0.73 and abs(p["int"]["Vder"] + 90.39) < 0.46
    assert abs(p["V0"] - R["cols"][0]["x"] - 2.19) < 0.01
    assert abs(R["lon"]["Mneg"]["M"] + 122.42) < 0.62
    assert abs(p["int"]["M"] - 81.26) < 0.82 and abs(p["ext"]["M"] - 1.61) < 0.02
    assert len(p["PI"]) == 2 and p["PI"][0] < p["V0"] < p["PI"][1]
    assert not errores


def test_combinada_equilibrio_corregido(navegador, url):
    pagina, errores = abrir(navegador, url)
    R = calc_ejemplo(pagina, metodo="corregido"); V, M = R["lon"]["V"], R["lon"]["M"]
    assert abs(V[-1]) < 1e-6 and abs(M[-1]) < 1e-6 and not R["q"]["uniforme"]
    assert len(R["lon"]["xs"]) >= 400 and R["lon"]["xs"] == sorted(R["lon"]["xs"])
    assert not errores


def test_combinada_sin_carga(navegador, url):
    pagina, errores = abrir(navegador, url)
    f = pagina.evaluate("""() => { const T = Tipos['combinada'], e = T.clone(T.EJEMPLO);
      e.columnas[1].D = 0; e.columnas[1].L = 0; return T.faltantes(e); }""")
    assert "columnas.1.D" in f
    assert not errores
