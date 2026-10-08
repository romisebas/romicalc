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


def test_combinada_diseno_documento(navegador, url):
    pagina, errores = abrir(navegador, url)
    R = calc_ejemplo(pagina)
    assert abs(R["fl"]["sup"]["As"] - 48.53) < 0.49 and abs(R["fl"]["inf"]["As"] - 41.62) < 0.42
    assert abs(R["cl"]["Vud"] - 106.46) < 0.54 and abs(R["cl"]["phiVc"] - 153.78) < 0.77
    e, i = R["tr"][0], R["tr"][1]
    assert abs(e["b"] - 1.18) < 1e-9 and abs(i["b"] - 1.86) < 1e-9
    assert abs(e["Mu"] - 39.02) < 0.2 and abs(i["Mu"] - 72.78) < 0.37
    assert abs(e["fl"]["As"] - 15.44) < 0.31 and abs(i["fl"]["As"] - 28.90) < 0.58
    assert abs(e["Vu"] - 28.57) < 0.15 and abs(e["phiVc"] - 53.37) < 0.27
    assert abs(i["Vu"] - 53.30) < 0.27 and abs(i["phiVc"] - 84.13) < 0.43
    assert R["fl"]["sup"]["sel"]["barra"] and R["entre"]["As"] > 0
    C = calc_ejemplo(pagina, metodo="corregido")
    assert abs(C["fl"]["inf"]["As"] - 45.90) < 0.05 and abs(C["cl"]["Vud"] - 96.94) < 1.0
    assert not errores


def test_combinada_chequeos_y_validacion(navegador, url):
    pagina, errores = abrir(navegador, url)
    C = calc_ejemplo(pagina, metodo="corregido")
    assert C["pz"][0]["lados"] == 3 and C["pz"][1]["lados"] == 4
    assert abs(C["pz"][0]["bo"] - 2.86) < 1e-6 and abs(C["pz"][1]["bo"] - 4.72) < 1e-6
    assert {c["id"] for c in C["chequeos"]} == {"suelo", "pz-ext", "pz-int", "cl", "ct", "fl", "ap", "ld"}
    assert C["todoOk"] and C["despiece"]["total"] > 0
    assert {m["marca"] for m in C["despiece"]["marcas"]} == {"L1", "L2", "T1", "T2", "T3", "D1", "D2"}
    res = pagina.evaluate("Tipos['combinada'].validarContraPdf().map(r => ({lbl: r.lbl, ok: r.ok}))")
    assert len(res) == 18 and all(r["ok"] for r in res), res
    assert not errores


# ---------------------------------------------------------------- mesa (interfaz)
def a_tipos(pagina, opcion="#op-nueva"):
    pagina.click("#btn-disenar")
    pagina.click(opcion)
    pagina.wait_for_selector("#bv-tipos:not([hidden])")


def abrir_ejemplo_combinada(pagina):
    a_tipos(pagina, "#op-ejemplo")
    pagina.click('.tipo-tarjeta[data-tipo="combinada"]')
    pagina.wait_for_selector("#mesa:not([hidden])")


def test_mesa_desde_tipos_y_recientes(navegador, url, tmp_path):
    pagina, errores = abrir(navegador, url)
    assert "Ejemplos" in pagina.text_content("#op-ejemplo")
    a_tipos(pagina)
    pagina.click('.tipo-tarjeta[data-tipo="combinada"]')
    pagina.wait_for_selector("#mesa:not([hidden])")
    assert pagina.is_hidden("#app")
    pagina.click("#mesa-ejemplo")
    pagina.wait_for_function("document.querySelector('#mesa-L').textContent.includes('7.00')")
    pagina.click("#mesa-inicio")
    pagina.wait_for_selector("#bv-opciones:not([hidden])")
    pagina.click("#lista-recientes .reciente")
    pagina.wait_for_selector("#mesa:not([hidden])")
    assert "7.00" in pagina.text_content("#mesa-L")
    # Ejemplos: el mismo menú de tipos; la aislada carga su ejemplo en el dashboard
    pagina.click("#mesa-inicio")
    pagina.click("#op-ejemplo")
    pagina.wait_for_selector("#bv-tipos:not([hidden])")
    assert "ejemplo" in pagina.text_content("#titulo-tipos").lower()
    pagina.click('.tipo-tarjeta[data-tipo="aislada-momento"]')
    pagina.wait_for_selector("#chequeos .chequeo")
    # Importar un .json de combinada abre la mesa
    datos = pagina.evaluate("JSON.stringify(Tipos['combinada'].EJEMPLO)")
    archivo = tmp_path / "comb.json"
    archivo.write_text(datos, encoding="utf-8")
    pagina.set_input_files("#archivo-importar", str(archivo))
    pagina.wait_for_selector("#mesa:not([hidden])")
    assert not errores, errores
