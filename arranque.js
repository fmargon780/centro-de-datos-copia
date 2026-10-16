/* Arranque de la página nueva: elegir la carpeta (leer y escribir), recordarla y pintar lo mismo que la aplicación de hoy. */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var $ = function (id) { return document.getElementById(id); };

  var DESDE_DISCO = location.protocol === 'file:';
  $('versionPagina').textContent = window.VERSION_PAGINA + ' · ' + (window.COMMIT_PAGINA || 'sin-marca') + (DESDE_DISCO ? ' · copia sin internet' : '');
  $('quien').textContent = window.VERSION_PAGINA + (DESDE_DISCO ? ' · copia sin internet' : '');
  $('carpeta').textContent = 'Carpeta de los datos: todavía no has elegido ninguna.';
  window.SOPORTE_APP.pantalla = 'página nueva';
  window.SOPORTE_APP.version = window.VERSION_PAGINA;

  /* Las pestañas, como en App.html. */
  window.irAPestana = function (p) {
    document.querySelectorAll('nav button').forEach(function (x) { x.classList.toggle('activa', x.dataset.p === p); });
    document.querySelectorAll('section').forEach(function (s) { s.classList.toggle('activa', s.id === p); });
    if (p === 'pestanaAvisos') cargarAvisos();
  };
  document.querySelectorAll('nav button').forEach(function (b) { b.onclick = function () { window.irAPestana(b.dataset.p); }; });
  $('botonAcceso').hidden = false;
  prepararZona();

  /* La carpeta elegida se recuerda en el navegador (IndexedDB). Si algo de eso falla, se pide cada vez. */
  function bd() {
    return new Promise(function (ok, mal) {
      var q = indexedDB.open('centro-de-datos-pagina', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('carpeta'); };
      q.onsuccess = function () { ok(q.result); };
      q.onerror = function () { mal(q.error); };
    });
  }
  function guardada(valor) {
    return bd().then(function (db) {
      return new Promise(function (ok, mal) {
        var t = db.transaction('carpeta', valor ? 'readwrite' : 'readonly'), s = t.objectStore('carpeta');
        var q = valor ? s.put(valor, 'raiz') : s.get('raiz');
        q.onsuccess = function () { ok(q.result); };
        q.onerror = function () { mal(q.error); };
      });
    });
  }

  function pedir(texto, boton, accion) {
    var d = $('pedirCarpeta');
    d.textContent = '';
    d.hidden = false;
    d.appendChild(document.createTextNode(texto + ' '));
    var b = el('button', 'accion', boton);
    b.onclick = function () { b.disabled = true; accion().then(null, function () { b.disabled = false; }); };
    d.appendChild(b);
  }

  async function usar(handle) {
    if (!(await C.abrir(handle))) {
      pedirElegir(DESDE_DISCO ? 'En este ordenador no encuentro la carpeta CENTRO DE DATOS. Para usar la copia hace falta Google Drive para ordenador. Si ya lo tienes, elige otra carpeta.' : 'Esa carpeta no es «CENTRO DE DATOS»: no tiene el fichero indice.json. Elige otra.');
      return;
    }
    $('pedirCarpeta').hidden = true;
    try { await guardada(handle); } catch (e) { /* sin recordarla: se pedirá otra vez */ }
    var e = await cargarEstado();
    if (e && e.carpeta && e.carpeta.ok) cargarConfiguracion();
    /* Lo que quedó a medias en el diario de lo recibido se coloca ahora. */
    try {
      var n = await window.AccionesPagina.repasarDiario();
      if (n) { avisar(n === 1 ? 'He terminado de guardar un fichero que había quedado a medias.' : 'He terminado de guardar ' + n + ' ficheros que habían quedado a medias.'); cargarEstado(); }
    } catch (x) { /* se vuelve a intentar la próxima vez que se abra */ }
    /* El ensayo de la ficha del alumno (fila 46) sigue donde se quedó. */
    if (window.EnsayoPagina) window.EnsayoPagina.arrancar();
  }

  function pedirElegir(texto) {
    pedir(texto, 'Elegir la carpeta', async function () {
      var h;
      try { h = await window.showDirectoryPicker({ id: 'centro-de-datos-pagina', mode: 'readwrite' }); } catch (e) { pedirElegir('No se ha podido elegir la carpeta. Pulsa el botón y vuelve a probar.'); throw e; }
      await usar(h);
    });
  }

  async function empezar() {
    var h = null;
    try { h = await guardada(); } catch (e) { h = null; }
    if (!h) { pedirElegir('Elige la carpeta «CENTRO DE DATOS» de Drive. Chrome te pedirá permiso para leerla y para guardar en ella.'); return; }
    var permiso = 'prompt';
    try { permiso = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { permiso = 'prompt'; }
    if (permiso === 'granted') { await usar(h); return; }
    pedir('Chrome pide que vuelvas a dar permiso de leer y guardar en la carpeta.', 'Dar permiso', async function () {
      var r = 'denied';
      try { r = await h.requestPermission({ mode: 'readwrite' }); } catch (e) { r = 'denied'; }
      if (r === 'granted') await usar(h); else pedirElegir('No has dado permiso. Elige la carpeta otra vez.');
    });
  }
  empezar();
})();
