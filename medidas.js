/* Lo que la pantalla mide de sí misma (fila 65): si el botón «Soporte» carga, cómo acaba cada envío y si la tabla de «Listados» se solapa. Solo cifras.
   Lo apunta aquí, en `_interno/ensayo-pagina/`, con la `VERSION_CD` de su programa; las comprobaciones `soporte-boton-unico`, `soporte-envio` y `listados-sin-solapes` lo leen de ahí (Soporte.gs). */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var E = '_interno/ensayo-pagina/';
  var ULTIMO = {};

  function activo() { return !window.SIN_ENSAYO_PAGINA && !!C.raiz(); }
  function escribir(nombre, objeto) {
    var texto = JSON.stringify(objeto);
    if (ULTIMO[nombre] === texto) return Promise.resolve();
    ULTIMO[nombre] = texto;
    return C.escribirSuelto(E + nombre, texto).catch(function () { delete ULTIMO[nombre]; });
  }
  function leer(nombre) {
    return C.leerSuelto(E + nombre).then(function (u8) { return JSON.parse(new TextDecoder().decode(u8)); }, function () { return null; });
  }
  var entero = function (x) { return Math.max(0, Math.min(100000, Math.floor(Number(x) || 0))); };

  /* Una vez por página abierta: ¿ha cargado el botón único? */
  function soporteVisto(cargado) {
    if (!activo()) return Promise.resolve(null);
    return escribir('soporte.json', { version: VERSION_CD, cargado: cargado === true, cuando: ahoraMadrid_() });
  }

  /* Cada envío del botón: solo sí o no, contados por versión. */
  var cola = Promise.resolve();
  function soporteEnvio(bien) {
    if (!activo()) return Promise.resolve(null);
    cola = cola.then(async function () {
      var antes = await leer('soporte-envio.json');
      var v = antes && antes.version === VERSION_CD ? antes : { version: VERSION_CD, bien: 0, mal: 0 };
      if (bien === true) v.bien++; else v.mal++;
      v.ultimoBien = bien === true; v.cuando = ahoraMadrid_();
      ULTIMO['soporte-envio.json'] = '';
      await escribir('soporte-envio.json', v);
    });
    return cola.then(function () { return null; }, function () { return null; });
  }

  /* La tabla de «Listados» se mide a sí misma al cargar. */
  function listadosMedidas(m) {
    if (!activo()) return Promise.resolve(null);
    m = m || {};
    return escribir('listados-pantalla.json', { version: VERSION_CD, filas: entero(m.filas), cajitas: entero(m.cajitas), solapes: entero(m.solapes), desbordes: entero(m.desbordes), ancho: entero(m.ancho), cuando: ahoraMadrid_() });
  }

  /* La pestaña «Consultar» (fila 99) se mide a sí misma la primera vez que carga: solo si cargó, cuántas columnas y líneas y si la página se sale por la derecha. */
  function consultarMedidas(m) {
    if (!activo()) return Promise.resolve(null);
    m = m || {};
    return escribir('consultar-pantalla.json', { version: VERSION_CD, cargada: m.cargada === true, recuento: m.recuento === true, grafico: m.grafico === true, enlaces: entero(m.enlaces), columnas: entero(m.columnas), lineas: entero(m.lineas), desbordes: entero(m.desbordes), ancho: entero(m.ancho), cuando: ahoraMadrid_() });
  }

  window.MedidasPagina = { soporteVisto: soporteVisto, soporteEnvio: soporteEnvio, listadosMedidas: listadosMedidas, consultarMedidas: consultarMedidas };
})();
