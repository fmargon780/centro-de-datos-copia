/* Lo que cambia datos en la página nueva (fila 45): soltar ficheros, completar «Sin clasificar», quitar y «Cambiar». Cada cosa corre los .gs de hoy
   dentro de una transacción de escritura.js, así que las reglas son las mismas que en la aplicación de hoy.
   Antes de colocar un fichero soltado se guarda tal cual en _interno/recibidos/ con un nombre que no puede repetirse (cuándo, quién, curso, huella,
   nombre): es el diario. Si algo se corta a medias, el fichero sigue ahí y se coloca al abrir la página (si lleva más de cinco minutos). */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var QUIEN = 'centro-de-datos-pagina-quien';
  var RECIBIDOS = '_interno/recibidos';
  var ESPERA_MS = 5 * 60 * 1000;
  var TOPE_BYTES = 50 * 1024 * 1024;
  var TROZO_PERDIDO = 'Se ha perdido un trozo por el camino. Vuelve a soltar el fichero.';
  var SIN_CARPETA = 'Primero elige la carpeta de los datos.';
  var enMemoria = '', esperando = null;

  function quienGuardado() {
    try { return (localStorage.getItem(QUIEN) || '').trim() || enMemoria; } catch (e) { return enMemoria; }
  }

  /* La página no sabe quién la usa: la primera vez lo pregunta en una línea y lo recuerda en este navegador. */
  function quienEres() {
    var q = quienGuardado();
    if (q) return Promise.resolve(q);
    if (esperando) return esperando;
    esperando = new Promise(function (ok) {
      var d = el('div', 'aviso-ambar');
      d.id = 'quienEres';
      d.appendChild(document.createTextNode('¿Quién eres? Se apunta como quien ha soltado el fichero. '));
      var i = el('input'); i.type = 'text'; i.id = 'quienEresNombre'; i.maxLength = 40; i.placeholder = 'Tu nombre';
      var b = el('button', 'accion', 'Seguir');
      var seguir = function () {
        var v = i.value.trim();
        if (!v) return;
        enMemoria = v;
        try { localStorage.setItem(QUIEN, v); } catch (e) { /* sin recordarlo: lo preguntará la próxima vez */ }
        d.parentNode.removeChild(d); esperando = null; ok(v);
      };
      b.onclick = seguir;
      i.onkeydown = function (ev) { if (ev.key === 'Enter') seguir(); };
      d.appendChild(i); d.appendChild(b);
      var z = document.getElementById('zona');
      z.parentNode.insertBefore(d, z);
      i.focus();
    });
    return esperando;
  }

  var ctxDe = function (quien) { return { correo: quien, esDueno: false, lanzador: 2 }; };
  function conCarpeta(fn) {
    if (!C.raiz()) return Promise.reject(new Error(SIN_CARPETA));
    return fn();
  }

  /* Cada cosa de esta lista se hace con una transacción; lo que cambia los datos ya hechos deja el testigo para la vuelta de los 10 minutos. */
  function hacer(quien, fn, testigo) {
    return C.transaccion(function () {
      var r = fn(ctxDe(quien));
      if (testigo && r && (r.estado === 'guardado' || r.estado === 'ok' || r.estado === 'sin-clasificar')) ajustarTestigo_(carpetaDatos_(), true);
      return r;
    });
  }

  function colocar(nombre, u8, quien, curso) {
    var bytes = C.aFirmados(u8);
    return C.transaccion(function () {
      var raiz = carpetaDatos_();
      if (estaRecolocando_(raiz)) return { estado: 'error', mensaje: MENSAJE_RECOLOCANDO_, ocupado: true };
      var r = procesarFichero_(nombre, bytes, quien, 'pagina-nueva', { cursoElegido: curso });
      if (r.estado === 'guardado' || r.estado === 'sin-clasificar') ajustarTestigo_(raiz, true);
      return r;
    });
  }

  function nombreDelDiario(quien, curso, huella, nombre) {
    return prefijoFecha_(ahoraMadrid_()) + '~' + encodeURIComponent(quien).slice(0, 80) + '~' + curso + '~' + huella.slice(0, 16) + '~' + nombreLimpio_(nombre);
  }

  async function guardarFichero(nombre, u8, curso) {
    var quien = await quienEres();
    var diario = RECIBIDOS + '/' + nombreDelDiario(quien, curso, huella_(u8), nombre);
    await C.escribirSuelto(diario, u8);
    var r = await colocar(nombre, u8, quien, curso);
    await C.borrarSuelto(diario);   // si algo se corta antes de llegar aquí, el diario sigue y se coloca al abrir
    if (r.ocupado) mostrarBotonHoy();
    return r;
  }

  function mostrarBotonHoy() {
    var z = document.getElementById('zona');
    if (!z.querySelector('[data-hoy]') && window.botonHoy) z.appendChild(window.botonHoy('accion'));
  }

  /* Lo mismo que Subida.gs: los trozos que manda JsSubir.html se juntan aquí y, con el último, se guarda. */
  var TROZOS = {};
  function subirTrozo(id, nombre, indice, total, base64, curso, tamano) {
    return conCarpeta(async function () {
      var t = TROZOS[id] || (TROZOS[id] = []);
      t[indice] = Uint8Array.from(atob(String(base64)), function (c) { return c.charCodeAt(0); });
      if (indice < total - 1) return { estado: 'trozo' };
      delete TROZOS[id];
      var n = 0, i;
      for (i = 0; i < total; i++) { if (!t[i]) return { estado: 'error', mensaje: TROZO_PERDIDO }; n += t[i].length; }
      if (n > TOPE_BYTES) return { estado: 'error', mensaje: 'Este fichero es demasiado grande para soltarlo aquí.' };
      if (tamano !== undefined && tamano !== null && Number(tamano) !== n) return { estado: 'error', mensaje: TROZO_PERDIDO };
      var todo = new Uint8Array(n), pos = 0;
      for (i = 0; i < total; i++) { todo.set(t[i], pos); pos += t[i].length; }
      if (curso && !cursoValido_(curso)) throw new Error('El curso no es válido.');
      return guardarFichero(nombre, todo, String(curso || ''));
    });
  }

  function completar(id, datos) {
    return conCarpeta(function () { return quienEres().then(function (q) { return hacer(q, function (ctx) { return webCompletarFicha(id, datos, ctx); }, true); }); });
  }
  function quitarPendiente(id) {
    return conCarpeta(function () { return quienEres().then(function (q) { return hacer(q, function (ctx) { return webQuitarPendiente(id, ctx); }, false); }); });
  }
  function cambiar(clave, variante) {
    return conCarpeta(function () { return quienEres().then(function (q) { return hacer(q, function (ctx) { return webCambiarFicha(clave, variante, ctx); }, true); }); });
  }

  /* Al abrir: lo que quedó a medias en el diario (más de cinco minutos) se coloca ahora. Devuelve cuántos ficheros colocó. */
  async function repasarDiario() {
    var nombres = (await C.nombresDe(RECIBIDOS)) || [], hechos = 0;
    for (var k = 0; k < nombres.length; k++) {
      var p = nombres[k].split('~');
      var m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/.exec(p[0]);
      if (p.length < 5 || !m) continue;
      var desde = new Date(isoDePrefijo_(m)).getTime();
      if (!(new Date().getTime() - desde > ESPERA_MS)) continue;
      try {
        var u8 = await C.leerSuelto(RECIBIDOS + '/' + nombres[k]);
        var quien = decodeURIComponent(p[1]), curso = p[2], nombre = p.slice(4).join('~');
        await colocar(nombre, u8, quien, curso);
        await C.borrarSuelto(RECIBIDOS + '/' + nombres[k]);
        hechos++;
      } catch (e) { /* se queda en el diario: se vuelve a intentar al abrir */ }
    }
    return hechos;
  }

  Object.assign(window.PUERTA_PAGINA, { webSubirTrozo: subirTrozo, webCompletarFicha: completar, webQuitarPendiente: quitarPendiente, webCambiarFicha: cambiar });
  window.AccionesPagina = { repasarDiario: repasarDiario, quienEres: quienEres };
})();
