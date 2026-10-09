"""Pruebas de la zapata combinada (beta 1.2): motor y mesa.

Ejecutar desde la carpeta del proyecto:
    py -3.12 -m pytest tests/test_combinada.py -q
"""
import json
import re

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
    S = C["supMin"]
    marcas = {m["marca"] for m in C["despiece"]["marcas"]}
    assert marcas == {"L1", "L2", "T1", "T2", "T3", "T4", "D1", "D2"} | {t["marca"] for t in S["tramos"]}
    # cara superior a cuantía mínima: 0.0018·b·h, y L3/L4 empalman con L1
    assert abs(S["As"] - 0.0018 * C["B"] * C["h"] * 1e4) < 1e-6 and abs(S["trans"]["As"] - 0.0018 * C["L"] * C["h"] * 1e4) < 1e-6
    for t in S["tramos"]:
        assert (t["x1"] > S["xa"]) if t["marca"] == "L3" else (t["x0"] < S["xb"])
    res = pagina.evaluate("Tipos['combinada'].validarContraPdf().map(r => ({lbl: r.lbl, ok: r.ok}))")
    assert len(res) == 18 and all(r["ok"] for r in res), res
    assert not errores


# ---------------------------------------------------------------- tablero (interfaz)
def a_tipos(pagina, opcion="#op-nueva"):
    pagina.click("#btn-disenar")
    pagina.click('#elementos [data-elemento="zapatas"]')
    pagina.click(opcion)
    pagina.wait_for_selector("#bv-tipos:not([hidden])")


def abrir_ejemplo_combinada(pagina):
    a_tipos(pagina, "#op-ejemplo")
    pagina.click('.tipo-tarjeta[data-tipo="combinada"]')
    pagina.wait_for_selector("#mesa:not([hidden]) #c-chequeos .anillo")


def siguiente_cw(pagina):
    antes = pagina.text_content("#cw-contador") + pagina.text_content("#cw-titulo")
    pagina.click("#cw-siguiente")
    pagina.wait_for_function("t => (document.querySelector('#cw-contador').textContent + document.querySelector('#cw-titulo').textContent) !== t", arg=antes)


def llenar(pagina, valores):
    for k, v in valores.items():
        sel = f'#cw-asistente [data-k="{k}"]'
        if pagina.locator(sel).evaluate("e => e.tagName") == "SELECT":
            pagina.select_option(sel, v)
        else:
            pagina.fill(sel, v)


def test_tablero_desde_tipos_recientes_e_importar(navegador, url, tmp_path):
    pagina, errores = abrir(navegador, url)
    assert "Ejemplos" in pagina.text_content("#op-ejemplo")
    abrir_ejemplo_combinada(pagina)
    assert pagina.is_hidden("#app")
    assert pagina.locator("#c-pestanas [role=tab]").count() == 4
    assert "El diseño cumple" in pagina.text_content("#c-v-tit")
    assert pagina.locator("#mesa-panel, #mesa-veredicto, #mesa-guia").count() == 0  # sin panel de datos ni cinta
    pagina.click("#c-inicio")
    pagina.wait_for_selector("#bv-opciones:not([hidden])")
    pagina.click("#lista-recientes .reciente")
    pagina.wait_for_selector("#mesa:not([hidden]) #c-chequeos .anillo")
    pagina.click("#c-inicio")
    pagina.click('#elementos [data-elemento="zapatas"]')
    pagina.click("#op-ejemplo")
    pagina.wait_for_selector("#bv-tipos:not([hidden])")
    assert "ejemplo" in pagina.text_content("#titulo-tipos").lower()
    pagina.click('.tipo-tarjeta[data-tipo="aislada-momento"]')
    pagina.wait_for_selector("#chequeos .chequeo")
    datos = pagina.evaluate("JSON.stringify(Tipos['combinada'].EJEMPLO)")
    archivo = tmp_path / "comb.json"
    archivo.write_text(datos, encoding="utf-8")
    pagina.set_input_files("#archivo-importar", str(archivo))
    pagina.wait_for_selector("#mesa:not([hidden]) #c-chequeos .anillo")
    assert not errores, errores


def test_asistente_de_8_pasos(navegador, url):
    pagina, errores = abrir(navegador, url)
    a_tipos(pagina)
    pagina.click('.tipo-tarjeta[data-tipo="combinada"]')
    pagina.wait_for_selector("#cw-asistente[open]")
    assert pagina.text_content("#cw-contador") == "Paso 1 de 8"
    llenar(pagina, {"proyecto.nombre": "Edificio A", "proyecto.elemento": "Nudos 186 y 187"})
    siguiente_cw(pagina)
    pagina.click("#cw-siguiente")  # columnas vacías: no avanza
    pagina.wait_for_selector("#cw-error:not([hidden])")
    assert "Faltan" in pagina.text_content("#cw-error-txt")
    llenar(pagina, {"columnas.0.c1": "0.5", "columnas.0.c2": "0.5", "columnas.0.barra": "6", "columnas.0.nBarras": "8",
                    "columnas.1.c1": "0.5", "columnas.1.c2": "0.5", "columnas.1.barra": "6", "columnas.1.nBarras": "8"})
    siguiente_cw(pagina)
    llenar(pagina, {"columnas.0.D": "80.806", "columnas.0.L": "18.264", "columnas.0.E": "70.607",
                    "columnas.1.D": "146.067", "columnas.1.L": "37.556", "columnas.1.E": "8.82"})
    siguiente_cw(pagina)
    pagina.click("#cw-asistente [data-nsr]")
    llenar(pagina, {"sismo.R0": "5"})
    assert "4.05" in pagina.text_content('#cw-asistente [data-vivo="R"]')
    siguiente_cw(pagina)
    pagina.click("#cw-asistente [data-nsr]")
    llenar(pagina, {"suelo.qadm": "12"})
    siguiente_cw(pagina)
    pagina.click("#cw-asistente [data-nsr]")
    llenar(pagina, {"materiales.fc": "280", "materiales.fy": "4200"})
    pagina.click("#cw-asistente .que-cambia summary")
    assert "0.0018·b·h" in pagina.text_content("#cw-asistente .que-cambia")
    siguiente_cw(pagina)
    assert pagina.locator("#cw-asistente .mesa-svg").count() == 1
    llenar(pagina, {"geometria.s": "5"})
    pagina.wait_for_selector('#cw-asistente [data-vivo="planta"].ok')
    siguiente_cw(pagina)
    llenar(pagina, {"zapata.r": "0.07", "zapata.d": "0.68"})
    assert pagina.text_content("#cw-siguiente") == "Ver resultados"
    pagina.click("#cw-siguiente")
    pagina.wait_for_selector("#cw-asistente", state="hidden")
    pagina.wait_for_function("document.querySelector('#c-v-tit').textContent.includes('cumple')")
    assert "El diseño cumple" in pagina.text_content("#c-v-tit")
    assert abs(pagina.evaluate("Mesa.resultado().L") - 7.0) < 1e-9
    assert not errores, errores


def test_riel_reabre_los_pasos(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    assert pagina.locator("#c-categorias .cat").count() == 8
    assert pagina.locator("#c-categorias .cat-punto.falta").count() == 0
    pagina.click('#c-categorias [data-cat="altura"]')
    pagina.wait_for_selector("#cw-asistente[open]")
    assert pagina.text_content("#cw-contador") == "Editar datos"
    llenar(pagina, {"zapata.d": "0.30"})
    pagina.click("#cw-siguiente")
    if pagina.is_visible("#cw-error"):
        pagina.click("#cw-continuar")
    pagina.wait_for_selector("#cw-asistente", state="hidden")
    pagina.wait_for_function("document.querySelector('#c-v-tit').textContent.includes('no cumple')")
    assert pagina.locator("#c-chequeos .anillo.mal").count() >= 1
    assert not errores, errores


def test_veredicto_con_anillos_y_ficha(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    assert pagina.locator("#c-chequeos .anillo").count() == 8
    assert all("%" in t for t in pagina.locator("#c-chequeos .an-pct").all_text_contents())
    pagina.click('#c-chequeos .anillo[data-paso="cl"]')
    assert "Cortante longitudinal" in pagina.text_content("#c-ficha .ficha-tit")
    pagina.click("#c-ficha .ficha-memoria")
    pagina.wait_for_selector('#mesa-memoria .dp-cap[data-cap="cl"][aria-current="true"]')
    assert not errores, errores


def px_por_metro(pagina):
    return pagina.evaluate("""() => { const s = document.querySelector('#c-alzado .mesa-svg');
      return s.getBoundingClientRect().width / s.viewBox.baseVal.width * Number(s.dataset.k); }""")


def arrastrar_columna(pagina, i, dx_m):
    caja = pagina.locator(f'#c-alzado .mesa-col[data-i="{i}"]').bounding_box()
    x, y = caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2
    pagina.mouse.move(x, y)
    pagina.mouse.down()
    pagina.mouse.move(x + dx_m * px_por_metro(pagina), y, steps=6)
    pagina.mouse.up()


def test_planos_separados(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    pagina.click("#c-tab-planos")
    pagina.wait_for_selector("#c-panel-planos:not([hidden]) #c-alzado .mesa-svg")
    assert pagina.locator("#c-vistas [data-vista]").count() == 5
    L0 = pagina.evaluate("Mesa.resultado().L")
    arrastrar_columna(pagina, 1, 1.0)
    assert pagina.evaluate("Mesa.resultado().L") > L0
    assert abs(pagina.evaluate("Mesa.estado().geometria.s") - 6.0) < 0.051
    pagina.focus('#c-alzado .mesa-col[data-i="1"]')
    pagina.keyboard.press("ArrowLeft")
    arrastrar_columna(pagina, 1, -20)
    assert abs(pagina.evaluate("Mesa.estado().geometria.s") - 0.55) < 1e-6
    pagina.evaluate("Mesa.ajustar('geometria.s', 5)")
    caja = pagina.locator("#c-alzado .diag-V").bounding_box()
    pagina.mouse.move(caja["x"] + caja["width"] * 0.4, caja["y"] + caja["height"] / 2)
    assert "V =" in pagina.text_content("#c-alzado .mesa-lectura")
    pagina.click('#c-vistas [data-vista="planta"]')
    pagina.wait_for_selector("#c-planta svg.dibujo")
    assert pagina.locator("#c-planta svg .franja").count() == 2
    caja = pagina.locator("#c-planta svg.dibujo").bounding_box()
    pagina.mouse.move(caja["x"] + caja["width"] * 0.5, caja["y"] + caja["height"] * 0.5)
    assert "σ =" in pagina.text_content("#c-panel-planos .tip-planta:not([hidden])")
    pagina.click('#c-vistas [data-vista="corte-l"]')
    pagina.wait_for_selector("#c-corte-l .acero-sup")
    pagina.click('#c-vistas [data-vista="cortes-t"]')
    assert pagina.locator("#c-corte-0 svg, #c-corte-1 svg").count() == 2
    pagina.click('#c-vistas [data-vista="3d"]')
    pagina.wait_for_selector("#c-3d canvas")
    assert not errores, errores


def test_refuerzo_por_vinetas(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    pagina.click("#c-tab-refuerzo")
    pagina.wait_for_selector("#c-grupos [data-grupo]")
    assert pagina.locator("#c-grupos [data-grupo]").count() == 7
    pagina.check('#c-grupo input[name="c-barra"][value="7"]')
    pagina.wait_for_function("Mesa.estado().acero.barSup === 7")
    assert "#7" in pagina.text_content("#c-elegido-tit")
    pagina.click('#c-grupos [data-grupo="dovelas"]')
    assert pagina.locator("#c-grupo .acero-dir").count() == 2
    pagina.click('#c-grupos [data-grupo="despiece"]')
    marcas = [m.strip() for m in pagina.locator("#mesa-despiece tbody tr td:first-child").all_text_contents()]
    assert marcas == ["L1", "L4", "L2", "T1", "T2", "T3", "T4", "D1", "D2"]  # L4 y T4: cara superior a cuantía mínima
    assert pagina.is_hidden("#c-elegido")
    assert not errores, errores


def test_memoria_y_pdf(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    pagina.click("#c-tab-memoria")
    pagina.wait_for_selector("#mesa-memoria .dp-cap")
    assert pagina.locator("#mesa-memoria .dp-cap").count() >= 10 and pagina.locator("#mesa-memoria .katex").count() > 0
    pagina.click('#mesa-memoria .dp-cap[data-cap="planta"]')
    pagina.hover('#mesa-memoria .ec[data-liga="xbar"]')
    assert pagina.locator("#mesa-memoria .diapo-fig .fig-xbar.resaltado").count() == 1
    pagina.evaluate("window.print = () => {}")
    pagina.evaluate("window.dispatchEvent(new Event('beforeprint'))")  # Ctrl+P en la combinada
    assert "Zapata combinada" in pagina.text_content("#informe")
    pagina.evaluate("window.dispatchEvent(new Event('afterprint'))")
    pagina.click("#c-imprimir")
    pagina.wait_for_selector("#dlg-informe[open]")
    pagina.fill("#inf-titulo", "Memoria C-2")
    pagina.click("#inf-imprimir")
    pagina.wait_for_function("document.body.classList.contains('con-informe')")
    assert pagina.locator("#informe .hoja").count() >= 6
    pagina.evaluate("window.dispatchEvent(new Event('afterprint'))")
    pagina.wait_for_selector("#doc-listo[open]")
    pagina.click("#dl-reimprimir")
    pagina.wait_for_selector("#dlg-informe[open]")
    assert pagina.input_value("#inf-titulo") == "Memoria C-2"
    assert not errores, errores


def test_revision_casos_limite_en_el_tablero(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    # Flexión sin solución: sin Infinity ni NaN, y se guarda
    pagina.click("#c-tab-planos")
    pagina.click('#c-vistas [data-vista="cortes-t"]')
    pagina.evaluate("Mesa.ajustar('zapata.d', 0.1)")
    pagina.wait_for_timeout(600)
    html = pagina.inner_html("#mesa")
    assert "Infinity" not in html and "NaN" not in html
    assert pagina.evaluate("Proyectos.listar()[0].datos.zapata.d") == 0.1
    # Separación mínima al crecer la columna
    pagina.evaluate("Mesa.ajustar('zapata.d', 0.68); Mesa.ajustar('geometria.s', 0.55)")
    pagina.click('#c-categorias [data-cat="columnas"]')
    pagina.fill('#cw-asistente [data-k="columnas.0.c1"]', "1.2")
    assert pagina.evaluate("Mesa.estado().geometria.s") >= 0.9 - 1e-9
    pagina.keyboard.press("Escape")
    # L que no cubre la columna interior: estado de revisión, sin diseño
    pagina.evaluate("() => { const e = Tipos.combinada.clone(Tipos.combinada.EJEMPLO); e.geometria.modoL = 'fijo'; e.geometria.L = 4.0; Mesa.abrir(e); }")
    assert "no cubre" in pagina.text_content("#c-vacio")
    # Nombre con comillas: no inyecta HTML en el asistente
    nombre = 'x" autofocus onfocus="window.__xss=1'
    pagina.evaluate("n => { const e = Tipos.combinada.clone(Tipos.combinada.EJEMPLO); e.proyecto.nombre = n; Mesa.abrir(e); }", nombre)
    pagina.click('#c-categorias [data-cat="proyecto"]')
    assert pagina.input_value('#cw-asistente [data-k="proyecto.nombre"]') == nombre
    assert pagina.evaluate("window.__xss") is None
    pagina.keyboard.press("Escape")
    # Exportar
    with pagina.expect_download() as d:
        pagina.click("#c-exportar")
    datos = json.loads(open(d.value.path(), encoding="utf-8").read())
    assert datos["tipo"] == "combinada"
    # Unidades: la memoria se rehace en el nuevo sistema
    pagina.click("#c-tab-memoria")
    pagina.wait_for_selector("#mesa-memoria .dp-cap")
    pagina.click("#mesa [data-abrir-ajustes]")
    pagina.check('input[name="aj-unid"][value="si"]')
    pagina.click("#dlg-ajustes .btn-acento")
    pagina.wait_for_selector("#dlg-ajustes", state="hidden")
    assert pagina.evaluate("Mesa.resultado().inp.unid") == "si"
    assert "tonf" not in pagina.text_content("#mesa-memoria")
    assert not errores, errores

def test_revision_franjas_traslapadas_y_excentricidad(navegador, url):
    pagina, errores = abrir(navegador, url)
    R = calc_ejemplo(pagina, "e.geometria.s = 1.0", metodo="corregido")
    union = max(R["tr"][1]["x1"], R["tr"][0]["x1"]) - R["tr"][0]["x0"] if R["tr"][1]["x0"] < R["tr"][0]["x1"] else R["tr"][0]["b"] + R["tr"][1]["b"]
    assert abs(R["entre"]["b"] - (R["L"] - union)) < 1e-9 and R["entre"]["b"] >= 0
    R = calc_ejemplo(pagina, "e.columnas[0].E = -700", metodo="corregido")
    assert any("tercio central" in a for a in R["avisos"])
    assert not errores, errores


def test_vista_3d_con_capas_y_separar(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    pagina.click("#c-tab-planos")
    pagina.click('#c-vistas [data-vista="3d"]')
    pagina.wait_for_selector("#c-3d canvas")
    assert pagina.locator("#c-3d-barra [data-capa3d]").count() == 8
    assert set(pagina.evaluate("Vista3DCombinada.grupos()")) >= {"concreto", "sup", "min", "inf", "trans", "dovelas", "presion", "diagramas"}
    # el 3D lleva las mismas marcas que el despiece, y las barras con ganchos tienen el doblez
    etq = pagina.evaluate("Vista3DCombinada.etiquetas()")
    assert all(any(e.startswith(m + " ") for e in etq) for m in ["L1", "L2", "T1", "T2", "T4", "D1", "D2"]), etq
    forma = pagina.evaluate("Armado.redondear(Armado.recta(2, 0.016, true, true, 1), 0.056)")
    assert len(forma) == 4 + 2 * 7 - 2 and forma[0][1] > 0.2  # 2 esquinas en arco; gancho de 15.5 db hacia arriba
    pagina.click('#c-3d-barra [data-capa3d="concreto"]')
    assert pagina.get_attribute('#c-3d-barra [data-capa3d="concreto"]', "aria-pressed") == "false"
    pagina.click("#c-3d-barra [data-separar]")
    assert pagina.get_attribute("#c-3d-barra [data-separar]", "aria-pressed") == "true"
    # La cámara no se reencuadra con un cambio pequeño
    pagina.evaluate("Vista3DCombinada.fijarCamara([1, 2, 3])")
    pagina.evaluate("Mesa.ajustar('zapata.d', 0.70)")
    assert pagina.evaluate("Vista3DCombinada.camara()") == [1, 2, 3]
    assert not errores, errores


# ---------------------------------------------------------------- revisión del tablero
def test_revision_importar_aislada_desde_la_combinada(navegador, url, tmp_path):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    datos = pagina.evaluate("JSON.stringify(Tipos['aislada-momento'].EJEMPLO)")
    archivo = tmp_path / "ais.json"
    archivo.write_text(datos, encoding="utf-8")
    pagina.set_input_files("#archivo-importar", str(archivo))
    pagina.wait_for_selector("#chequeos .chequeo")
    assert pagina.is_hidden("#mesa") and not pagina.evaluate("Mesa.visible()")
    assert not errores, errores


def test_revision_3d_se_rehace_con_las_barras(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    pagina.click("#c-tab-planos")
    pagina.click('#c-vistas [data-vista="3d"]')
    pagina.wait_for_selector("#c-3d canvas")
    pagina.evaluate("Mesa.ajustar('acero.barTrans', 7)")
    assert any("T1" in e and "#7" in e for e in pagina.evaluate("Vista3DCombinada.etiquetas()"))
    # Un resaltado de un grupo que desaparece no rompe el mouse
    pagina.evaluate("Vista3DCombinada.resaltar('sup')")
    pagina.evaluate("Mesa.ajustar('zapata.d', 0.1)")
    caja = pagina.locator("#c-3d canvas").bounding_box()
    for k in range(5):
        pagina.mouse.move(caja["x"] + caja["width"] * (0.3 + 0.1 * k), caja["y"] + caja["height"] * 0.5)
        pagina.wait_for_timeout(60)
    assert not errores, errores


def test_revision_asistente_reabre_y_enteros(navegador, url):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    pagina.evaluate("(() => { const a = Mesa.asistente(); a.abrir(a.indice('columnas'), 'editar'); a.cerrar(); a.abrir(a.indice('columnas'), 'editar'); })()")
    pagina.wait_for_timeout(400)
    assert pagina.evaluate("!!document.querySelector('#cw-asistente[open]')")
    pagina.fill('#cw-asistente [data-k="columnas.0.nBarras"]', "8.6")
    assert pagina.evaluate("Mesa.estado().columnas[0].nBarras") == 9
    assert not errores, errores


# ---------------------------------------------------------------- auditoría 1, 2 y 10: archivos importados con datos raros
def a_texto(o):
    """Convierte cada número del proyecto en texto, como lo dejaría una hoja de cálculo."""
    if isinstance(o, dict):
        return {k: a_texto(v) for k, v in o.items()}
    if isinstance(o, list):
        return [a_texto(v) for v in o]
    return str(o) if isinstance(o, (int, float)) and not isinstance(o, bool) else o


def importar(pagina, tmp_path, datos, nombre):
    archivo = tmp_path / nombre
    archivo.write_text(json.dumps(datos), encoding="utf-8")
    pagina.set_input_files("#archivo-importar", str(archivo))


def test_importar_numeros_como_texto_y_barra_desconocida(navegador, url, tmp_path):
    pagina, errores = abrir(navegador, url)
    abrir_ejemplo_combinada(pagina)
    comb = json.loads(pagina.evaluate("JSON.stringify(Tipos['combinada'].EJEMPLO)"))
    ais = json.loads(pagina.evaluate("JSON.stringify(Tipos['aislada-momento'].EJEMPLO)"))
    # Combinada con números como texto: se calcula igual que el ejemplo
    importar(pagina, tmp_path, a_texto(comb), "comb-texto.json")
    pagina.wait_for_selector("#mesa:not([hidden]) #c-chequeos .anillo")
    assert pagina.evaluate("typeof Mesa.estado().columnas[0].D") == "number"
    # Combinada con una barra que no existe: queda como dato faltante, sin romper la página
    comb["columnas"][0]["barra"] = 11
    importar(pagina, tmp_path, comb, "comb-barra.json")
    pagina.wait_for_function("Mesa.visible() && Mesa.estado().columnas[0].barra === 11")
    assert "columnas.0.barra" in pagina.evaluate("Tipos['combinada'].faltantes(Mesa.estado())")
    # Aislada con números como texto y barra desconocida
    ais = a_texto(ais)
    ais["columna"]["barra"] = "11"
    importar(pagina, tmp_path, ais, "ais.json")
    pagina.wait_for_function("!Mesa.visible()")
    pagina.wait_for_selector('#categorias .cat[data-cat="columna"] .cat-punto.falta', state="attached")
    assert not errores, errores
