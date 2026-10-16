/* El «servidor» de esta página: contesta lo mismo que la aplicación de hoy, pero en el propio ordenador y solo leyendo la carpeta.
   Sustituye a `servidor` de JsComun.html (se carga después). Lo que cambiaría datos no se hace aquí. */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var ENLACE_CARPETA = 'https://drive.google.com/drive/search?q=CENTRO%20DE%20DATOS';
  var SOLO_HOY = 'Eso solo se puede hacer en la aplicación de hoy.';

  function raiz() { return carpetaDatos_(); }
  function ctx() { return { correo: '', esDueno: false, lanzador: 2 }; }

  /* webEstado de Web.gs, sin lo que escribe o recoge: el programa lee y ya está. */
  async function estado() {
    await C.precargarBase();
    return C.conCarga(function () {
      var r0 = raiz();
      cargarAprendido_(r0);
      var r = { version: window.VERSION_PAGINA, correo: 'Solo lectura', esDueno: false, carpeta: { ok: true, nombre: 'CENTRO DE DATOS', url: ENLACE_CARPETA } };
      try { r.hechos = resumenHechosPagina_(r0); delete r.hechos.claveAviso; } catch (e) { if (e instanceof C.Falta) throw e; r.avisoEntrada = 'No he podido comprobar los datos ya hechos.'; }
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
    return C.conCarga(function () { return webAvisos(ctx()); });
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

  var PUERTA = {
    webEstado: function () { return estado(); },
    webAvisos: function () { return avisos(); },
    webAnteriores: function (c, v) { return anteriores(c, v); },
    webAlumnosDe: function (c) { return C.conCarga(function () { return webAlumnosDe(c, ctx()); }); },
    webConfiguracionLeer: function () { return C.conCarga(function () { return webConfiguracionLeer(ctx()); }); },
    webNombresAlumnado: function () { return Promise.resolve([]); },
    webListadosMedidas: function () { return Promise.resolve(null); },
    webSoporteVisto: function () { return Promise.resolve(null); },
    webSoporteEnvio: function () { return Promise.resolve(null); }
  };

  /* Lo mismo que JsComun.html: una promesa con el resultado, sin pasar por JSON. */
  window.servidor = function (nombre) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!PUERTA[nombre]) return Promise.reject(new Error(SOLO_HOY));
    return Promise.resolve().then(function () { return PUERTA[nombre].apply(null, args); }).then(function (r) { return r === undefined ? null : JSON.parse(JSON.stringify(r)); }, function (e) { throw new Error(textoLlano(e)); });
  };
})();
