/* El «servidor» de esta página: contesta lo mismo que la aplicación de hoy, pero en el propio ordenador.
   Sustituye a `servidor` de JsComun.html (se carga después). Lo que lee está aquí; lo que cambia datos lo añade acciones.js (fila 45).
   Cada lectura vuelve a leer la carpeta (por si otra persona ha cambiado algo) y espera su turno detrás de un guardado en marcha. */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var ENLACE_CARPETA = 'https://drive.google.com/drive/search?q=CENTRO%20DE%20DATOS';
  var NO_AQUI = 'Eso no se puede hacer desde esta página.';
  var CLAVE_VISTA = 'centro-de-datos-clave-funciona';
  var LECTURAS = { webEstado: 1, webAvisos: 1, webAnteriores: 1, webAlumnosDe: 1, webConfiguracionLeer: 1, webContactosLeer: 1, webConsultarLeer: 1, webConsultarTodos: 1, webConsultarEnlaces: 1, webConsultarEnlacesTodas: 1 };

  function raiz() { return carpetaDatos_(); }
  function ctx() { return { correo: '', esDueno: false, lanzador: 2 }; }
  /* Aquí no hay «dueño»: quien tiene la carpeta ve también el aviso de la clave, los del diagnóstico y busca códigos. */
  function ctxCarpeta() { return { correo: '', esDueno: true, lanzador: 2 }; }

  /* «La clave funciona»: la marca `recuperada` la deja la vuelta de fondo; aquí solo se lee y se recuerda en este navegador que ya se enseñó. */
  function claveFunciona(r0) {
    var c = (leerComprob_(r0).subida || {}).clave || {};
    if (!c.recuperada) return false;
    var marca = String(c.mirada || 'sin-marca');
    try { if (localStorage.getItem(CLAVE_VISTA) === marca) return false; localStorage.setItem(CLAVE_VISTA, marca); } catch (e) { /* sin recordarlo se enseña otra vez */ }
    return true;
  }

  /* webEstado de Web.gs, sin lo que escribe o recoge: el programa lee y ya está. */
  async function estado() {
    await C.precargarBase();
    return C.conCarga(function () {
      var r0 = raiz();
      cargarAprendido_(r0);
      var r = { version: window.VERSION_PAGINA, correo: 'Lee y guarda', esDueno: false, carpeta: { ok: true, nombre: 'CENTRO DE DATOS', url: ENLACE_CARPETA } };
      try { r.hechos = resumenHechosPagina_(r0); r.avisoClave = r.hechos.claveAviso; delete r.hechos.claveAviso; if (!r.avisoClave) delete r.avisoClave; if (claveFunciona(r0)) r.claveFunciona = true; } catch (e) { if (e instanceof C.Falta) throw e; r.avisoEntrada = 'No he podido comprobar los datos ya hechos.'; }
      /* Las líneas del ensayo (filas 46 y 47): solo esta página las lleva. */
      try {
        /* Fila 58: mientras el ensayo trabaja no se compara nada: cada cajita enseña su último resultado (si lo tenía) y, si su conjunto aún se está rehaciendo, la nota «poniéndose al día…». */
        var montando = window.EnsayoPagina && window.EnsayoPagina.trabajando(), faltan = montando ? window.EnsayoPagina.pendientes() : [];
        var ensayos = [];
        ensayoActivos_(r0).forEach(function (def) {
          var v = ensayoVista_(r0, def.conjunto), poniendose = faltan.indexOf(def.conjunto) !== -1;
          if (poniendose && v.estado === 'sin-ensayo') v = { estado: 'esperando', difs: [], sobran: [], faltan: [] };
          if (v.estado !== 'sin-ensayo') ensayos.push({ conjunto: def.conjunto, cajita: def.cajita, linea: ensayoLinea_(v, poniendose && v.cifra === undefined, def.conjunto), estado: v.estado, poniendose: poniendose, avisos: v.difs.length + v.sobran.length + v.faltan.length });
        });
        if (ensayos.length) r.hechos.ensayos = ensayos;
      } catch (e) { if (e instanceof C.Falta) throw e; }
      try { r.sobrasTutorias = sobrasTutoriasPagina_(r0); } catch (e) { if (e instanceof C.Falta) throw e; r.sobrasTutorias = []; }
      r.centroNombre = '';
      try { r.centroNombre = ((leerJson_(r0, 'configuracion.json') || {}).centro || {}).nombre || ''; } catch (x) { if (x instanceof C.Falta) throw x; }
      var e = estadoListados_(r0);
      r.filas = e.filas; r.movimientos = e.movimientos; r.cursoActual = e.cursoActual; r.cursos = e.cursos; r.pendientes = e.pendientes;
      r.cursosElegibles = cursosElegibles_(r0);
      r.tipos = tiposParaPagina_(r0); r.periodos = PERIODOS_;
      return r;
    });
  }

  /* webAvisos: antes de leerlos, trae de una vez las partes que dicen tener avisos. */
  async function avisos() {
    await C.precargarBase();
    var rutas = await C.conCarga(function () {
      var i = leerIndice_(raiz()), a = leerAvance_(raiz());
      return (i.hechos || []).filter(function (h) { return sumaAvisos_((a.avisos || {})[h.ruta]) > 0; }).map(function (h) { return h.ruta; });
    });
    await C.precargar(rutas);
    return C.conCarga(function () { return webAvisos(ctxCarpeta()); });
  }

  /* Las versiones anteriores de un listado: el nombre y la fecha (el enlace de Drive no se puede saber desde el navegador: se busca por el nombre). */
  async function anteriores(clave, variante) {
    if (!/^[0-9A-Za-z-]+(\/[0-9A-Za-z-]+){0,2}$|^$/.test(String(variante || ''))) throw new Error('Ese listado no existe.');
    var nombres = await C.conCarga(function () { cargarAprendido_(raiz()); return entradaCatalogo_(clave) ? rutaDeListado_('anteriores', clave, variante) : null; });
    if (!nombres) throw new Error('Ese listado no existe.');
    var ficheros = (await C.nombresDe(nombres)) || [];
    return ficheros.map(function (n) {
      var m = /^(\d{8})-(\d{6}) (.*)$/.exec(n);
      var fecha = m ? m[1].slice(6) + '/' + m[1].slice(4, 6) + '/' + m[1].slice(0, 4) + ' ' + m[2].slice(0, 2) + ':' + m[2].slice(2, 4) : '';
      var nombre = m ? m[3] : n;
      return { orden: m ? m[1] + m[2] : '', fecha: fecha, nombre: nombre, url: 'https://drive.google.com/drive/search?q=' + encodeURIComponent(nombre) };
    }).sort(function (a, b) { return a.orden < b.orden ? 1 : -1; });
  }

  /* Buscar un código de diagnóstico (fila 65): la sal solo se lee; si falta, aún no hay diagnóstico. Trae antes las partes donde puede salir. */
  async function diagnosticoBuscar(codigo) {
    await C.precargarBase();
    var rutas = await C.conCarga(function () { return (leerIndice_(raiz()).hechos || []).map(function (h) { return h.ruta; }); });
    await C.precargar(rutas);
    return C.conCarga(function () {
      var r0 = raiz();
      return diagBuscar_(codigo, r0, function () {
        var a = leerJson_(subcarpetaPorRuta_(r0, '_interno'), 'clave-diagnostico.json');
        return a && /^[0-9a-f]{64}$/.test(String(a.sal || '')) ? a.sal : null;
      });
    });
  }

  /* Los contactos del profesorado (fila 98): trae antes la parte de los contactos y la del personal del curso de hoy, que son lo que se enseña. */
  async function contactos() {
    await C.precargarBase();
    var rutas = await C.conCarga(function () {
      return (leerIndice_(raiz()).hechos || []).filter(function (h) { return h.conjunto === 'contactos' || (h.conjunto === 'personal' && h.cursoEscolar === cursoActual_()); }).map(function (h) { return h.ruta; });
    });
    await C.precargar(rutas);
    return C.conCarga(function () { return contactosParaPagina_(raiz()); });
  }

  /* Consultar (fila 99): trae antes solo la parte que toca (la que se ha elegido, o Tutorías del curso de hoy al abrir). */
  async function consultar(id, curso, periodo) {
    await C.precargarBase();
    var rutas = await C.conCarga(function () { var e = consultaEleccion_(leerIndice_(raiz()), id, curso, periodo); return e.parte ? [e.parte.ruta] : []; });
    await C.precargar(rutas);
    return C.conCarga(function () { return consultaCarga_(raiz(), id, curso, periodo); });
  }

  /* Consultar, recuento (fila 100): todas las partes de un conjunto, para el eje del curso escolar. */
  async function consultarTodas(id) {
    await C.precargarBase();
    var rutas = await C.conCarga(function () {
      var def = consultaDefinicion_(id);
      return !def || def.modo === 'unica' ? [] : (leerIndice_(raiz()).hechos || []).filter(function (h) { return h.conjunto === def.conjunto && (def.modo === 'curso' ? h.parte === def.parte : h.parte === 'periodo'); }).map(function (h) { return h.ruta; });
    });
    await C.precargar(rutas);
    return C.conCarga(function () { return consultaCargaTodas_(raiz(), id); });
  }

  /* Consultar, cruzar conjuntos (fila 101): trae antes las partes de los otros conjuntos que enlazan con la consulta que se está viendo (`dia`: el día elegido, si lo hay). */
  async function consultarEnlaces(id, curso, periodo, dia) {
    await C.precargarBase();
    var rutas = await C.conCarga(function () { return consultaEnlacesPartes_(leerIndice_(raiz()), id, curso, periodo, dia); });
    await C.precargar(rutas);
    return C.conCarga(function () { return consultaEnlaces_(raiz(), id, curso, periodo, dia); });
  }

  /* Lo mismo para todas las partes de un conjunto (eje «Curso escolar» o «Periodo»). */
  async function consultarEnlacesTodas(id) {
    await C.precargarBase();
    var rutas = await C.conCarga(function () { return consultaEnlacesTodasPartes_(leerIndice_(raiz()), id); });
    await C.precargar(rutas);
    return C.conCarga(function () { return consultaEnlacesTodas_(raiz(), id); });
  }

  var PUERTA = window.PUERTA_PAGINA = {
    webConsultarEnlaces: function (id, curso, periodo, dia) { return consultarEnlaces(id, curso, periodo, dia); },
    webConsultarEnlacesTodas: function (id) { return consultarEnlacesTodas(id); },
    webConsultarTodos: function (id) { return consultarTodas(id); },
    webConsultarLeer: function (id, curso, periodo) { return consultar(id, curso, periodo); },
    webConsultarMedidas: function (m) { return window.MedidasPagina.consultarMedidas(m); },
    webContactosLeer: function () { return contactos(); },
    webEstado: function () { return estado(); },
    webAvisos: function () { return avisos(); },
    webAnteriores: function (c, v) { return anteriores(c, v); },
    webAlumnosDe: function (c) { return C.conCarga(function () { return webAlumnosDe(c, ctx()); }); },
    webConfiguracionLeer: function () { return C.conCarga(function () { return webConfiguracionLeer(ctx()); }); },
    webDiagnosticoBuscar: function (c) { return C.enCola(function () { return diagnosticoBuscar(c); }); },
    webNombresAlumnado: function () { return Promise.resolve([]); },
    webListadosMedidas: function (m) { return window.MedidasPagina.listadosMedidas(m); },
    webSoporteVisto: function (b) { return window.MedidasPagina.soporteVisto(b); },
    webSoporteEnvio: function (b) { return window.MedidasPagina.soporteEnvio(b); }
  };

  /* Lo mismo que JsComun.html: una promesa con el resultado, sin pasar por JSON. */
  window.servidor = function (nombre) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!PUERTA[nombre]) return Promise.reject(new Error(NO_AQUI));
    var hacer = function () { return PUERTA[nombre].apply(null, args); };
    if (LECTURAS[nombre]) { var lee = hacer; hacer = function () { return C.enCola(function () { if (C.raiz()) C.reiniciar(); return lee(); }); }; }
    return Promise.resolve().then(hacer).then(function (r) { return r === undefined ? null : JSON.parse(JSON.stringify(r)); }, function (e) { throw new Error(textoLlano(e)); });
  };
})();
