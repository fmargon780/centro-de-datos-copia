/* La página nueva publica de verdad (fila 59): los conjuntos que ya salían «igual que la de hoy» en el ensayo se montan ahora en la carpeta de verdad (hecho/, indice.json, _interno/hechos.json) con los mismos .gs
   y con el día de verdad (publicarPaso_, en Turno.gs). Para no montar a la vez que la aplicación de hoy, antes se toma el turno de montaje (_interno/turno-montaje.json): vale unos minutos y se renueva mientras se monta.
   Con `"soloAplicacion": true` en ese fichero (a mano) la página deja de publicar y vuelve a ensayar. Lo escribe esta página directamente, sin pasar por los .gs. */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var RUTA = '_interno/turno-montaje.json';
  var VALIDEZ = 10 * 60 * 1000, RENOVAR = 60 * 1000, ESPERA_REINTENTO = 60 * 1000, MAX_PASOS = 3000;
  var PESTANA = Math.random().toString(36).slice(2, 10);
  var QUIEN = 'centro-de-datos-pagina-quien';
  var reintento = null;

  function persona() { try { return (localStorage.getItem(QUIEN) || '').trim(); } catch (e) { return ''; } }
  async function leer() {
    try { return JSON.parse(new TextDecoder().decode(await C.leerSuelto(RUTA))) || {}; } catch (e) { return {}; }
  }
  function escribir(t) { return C.escribirSuelto(RUTA, JSON.stringify(t)); }

  /* Una cosa cada vez en este navegador y, entre pestañas, el candado del navegador si lo hay. */
  function conCandado(fn) {
    return C.enCola(function () {
      try { if (navigator.locks && navigator.locks.request) return navigator.locks.request('centro-de-datos-turno', fn); } catch (e) { /* sin candados: solo esta pestaña */ }
      return fn();
    }, true);
  }

  /* Toma el turno (o lo renueva si ya es de esta pestaña) y apunta los conjuntos que publica. Devuelve true si es suyo. */
  function tomar(publicados) {
    return conCandado(async function () {
      var t = await leer(), ahora = Date.now();
      if (t.soloAplicacion) return false;
      var mio = t.quien === 'pagina' && t.pestana === PESTANA;
      var vigente = t.quien === 'pagina' && typeof t.hasta === 'number' && t.hasta > ahora;
      if (vigente && !mio) return false;
      var lista = (t.publicados || []).slice();
      publicados.forEach(function (c) { if (lista.indexOf(c) === -1) lista.push(c); });
      await escribir({ quien: 'pagina', pestana: PESTANA, persona: persona(), desde: mio && vigente ? t.desde : ahora, hasta: ahora + VALIDEZ, publicados: lista,
        caducados: (t.caducados || 0) + (t.quien === 'pagina' && !mio && !vigente ? 1 : 0), choques: t.choques || 0 });
      return (await leer()).pestana === PESTANA;   // si otra pestaña escribió a la vez, se queda con el turno la que escribió la última
    });
  }

  /* Alarga el turno. Si ya es de otro, esta pestaña lo ha perdido: lo apunta como choque (salvo que fuera la marcha atrás) y devuelve false. */
  function renovar() {
    return conCandado(async function () {
      var t = await leer();
      if (t.soloAplicacion) return false;
      if (t.pestana !== PESTANA) {
        if (t.quien === 'pagina') { t.choques = (t.choques || 0) + 1; await escribir(t); }
        return false;
      }
      t.hasta = Date.now() + VALIDEZ;
      await escribir(t);
      return true;
    });
  }

  function volverAIntentar() {
    if (reintento) return;
    reintento = setTimeout(function () { reintento = null; if (window.EnsayoPagina) window.EnsayoPagina.cambio(); }, ESPERA_REINTENTO);
  }

  /* `ctx`: { paso(fn), ceder(), empieza(), refrescar() } de ensayo.js. */
  async function publicar(ctx) {
    if (window.SIN_PUBLICAR_PAGINA) return;
    var t = await leer();
    if (t.soloAplicacion) return;
    var ya = t.publicados || [];
    var nuevos = (await ctx.paso(function () { return ensayoPublicables_(carpetaDatos_()); })).filter(function (c) { return ya.indexOf(c) === -1; });
    var lista = ya.concat(nuevos);
    if (!lista.length) return;
    var faltan = await ctx.paso(function () { return publicarQuedan_(carpetaDatos_(), lista); });
    if (!nuevos.length && !faltan) return;
    if (!(await tomar(nuevos))) { volverAIntentar(); return; }
    ctx.empieza();
    if (nuevos.length) await ctx.paso(function () { publicarAdoptar_(carpetaDatos_(), nuevos); return null; });
    var renovado = Date.now(), antes = '', repetida = 0;
    for (var n = 0; n < MAX_PASOS; n++) {
      var r = await ctx.paso(function () { return publicarPaso_(carpetaDatos_(), lista); });
      if (r.ocupada) { volverAIntentar(); break; }
      if (!r.quedan) break;
      repetida = r.siguiente === antes ? repetida + 1 : 0; antes = r.siguiente;
      if (repetida >= 3) break;   // lo mismo una y otra vez sin avanzar: se deja para la próxima vez
      if (Date.now() - renovado > RENOVAR) { if (!(await renovar())) break; renovado = Date.now(); }
      await ctx.ceder();
    }
    await renovar();   // el turno sigue unos minutos después del último paso: Drive tarda en subir lo escrito
    ctx.refrescar();
  }

  window.PublicarPagina = { publicar: publicar, pestana: PESTANA };
})();
