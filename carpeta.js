/* La carpeta «CENTRO DE DATOS» elegida en el navegador, vista como si fuera el Drive de Apps Script (que es síncrono), para que
   los .gs de hoy funcionen tal cual. Aquí solo se lee; escribir (fila 45) lo añade escritura.js, en transacciones.
   Los nombres de cada carpeta y los bytes de cada fichero se piden al navegador la primera vez que hacen falta: si algo falta,
   el .gs lanza `Falta`, `conCarga` lo carga y repite. Toda `Falta` se apunta en FALTAS: una transacción mira ahí aunque el .gs se la haya tragado. */
(function () {
  'use strict';
  var SOLO_LEE = 'Esta página solo lee la carpeta. Eso se hace en la aplicación de hoy.';
  var C;

  var FALTAS = [], RASTREAR = false;
  function Falta(cargar) { this.cargar = cargar; if (RASTREAR) FALTAS.push(this); }

  function lista(l) { var i = 0; return { hasNext: function () { return i < l.length; }, next: function () { return l[i++]; } }; }

  /* `disco` = dónde está de verdad (carpeta y nombre): lo mueve escritura.js al guardar; `leido` = los bytes tal como se leyeron. */
  function Fichero(nombre, handle, padre) { this.nombre = nombre; this.handle = handle; this.padre = padre; this.bytes = null; this.leido = null; this.disco = { c: padre, n: nombre }; }
  Fichero.prototype.getName = function () { return this.nombre; };
  /* Desde el navegador no se puede saber el id de Drive: el índice lo lleva vacío y la aplicación de hoy lo rellena (fila 44). */
  Fichero.prototype.getId = function () { return ''; };
  Fichero.prototype.isTrashed = function () { return false; };
  Fichero.prototype.setContent = function () { throw new Error(SOLO_LEE); };
  Fichero.prototype.setTrashed = Fichero.prototype.setName = Fichero.prototype.moveTo = Fichero.prototype.setContent;
  Fichero.prototype.cargar = function () {
    var f = this;
    if (f.bytes) return Promise.resolve();
    return f.handle.getFile().then(function (x) { return x.arrayBuffer(); }).then(function (b) { f.bytes = new Uint8Array(b); f.leido = f.bytes; });
  };
  Fichero.prototype.getBlob = function () {
    var f = this;
    if (!f.bytes) throw new Falta(function () { return f.cargar(); });
    return {
      getName: function () { return f.nombre; },
      getBytes: function () { return Array.prototype.map.call(f.bytes, function (b) { return b > 127 ? b - 256 : b; }); },
      getDataAsString: function (cod) { return new TextDecoder(cod === 'ISO-8859-1' ? 'iso-8859-1' : 'utf-8').decode(f.bytes); }
    };
  };

  function Carpeta(nombre, handle, padre) {
    this.nombre = nombre; this.handle = handle; this.padre = padre; this.ruta = padre ? padre.ruta + nombre + '/' : '';
    this.carpetas = []; this.ficheros = []; this.vista = !handle;
  }
  Carpeta.prototype.getName = function () { return this.nombre; };
  Carpeta.prototype.getId = function () { return 'ruta:' + this.ruta; };
  Carpeta.prototype.isTrashed = function () { return false; };
  Carpeta.prototype.mirar = function () {
    var c = this;
    if (c.vista) return;
    throw new Falta(function () { return c.leerNombres(); });
  };
  Carpeta.prototype.leerNombres = function () {
    var c = this;
    if (c.vista) return Promise.resolve();
    var carpetas = [], ficheros = [];
    return (async function () {
      for await (var par of c.handle.entries()) {
        if (par[1].kind === 'directory') carpetas.push(new Carpeta(par[0], par[1], c));
        else ficheros.push(new Fichero(par[0], par[1], c));
      }
      c.carpetas = carpetas; c.ficheros = ficheros; c.vista = true;
    })();
  };
  Carpeta.prototype.getFoldersByName = function (n) { this.mirar(); return lista(this.carpetas.filter(function (x) { return x.nombre === n; })); };
  Carpeta.prototype.getFilesByName = function (n) { this.mirar(); return lista(this.ficheros.filter(function (x) { return x.nombre === n; })); };
  Carpeta.prototype.getFiles = function () { this.mirar(); return lista(this.ficheros.slice()); };
  Carpeta.prototype.getFolders = function () { this.mirar(); return lista(this.carpetas.slice()); };
  /* Una carpeta que no existe se «crea» solo en la memoria (el .gs de hoy lo hace al ir a una ruta); nunca en el disco. */
  Carpeta.prototype.createFolder = function (n) { var c = new Carpeta(n, null, this); this.carpetas.push(c); return c; };
  Carpeta.prototype.createFile = function () { throw new Error(SOLO_LEE); };
  Carpeta.prototype.setTrashed = Carpeta.prototype.createFile;

  var RAIZ = null, REAL = null;

  /* La carpeta se vuelve a leer de cero (nombres y bytes), para ver lo que otra persona haya cambiado. Con `alterna` (fila 46, el ensayo) los .gs ven esa raíz en vez de la de verdad. */
  function reiniciar(alterna) {
    var r = new Carpeta('', alterna || REAL, null);
    r.nombre = 'CENTRO DE DATOS';
    RAIZ = r;
  }
  function tomarFaltas() { var f = FALTAS; FALTAS = []; return f; }
  function rastrear(si) { RASTREAR = si; FALTAS = []; }

  /* Corre `fn` (síncrona, usa los .gs) cuantas veces haga falta, cargando lo que le falte entre una y otra. */
  async function conCarga(fn) {
    for (var i = 0; i < 5000; i++) {
      try { return fn(); } catch (e) { if (!(e instanceof Falta)) throw e; await e.cargar(); }
    }
    throw new Error('La carpeta tiene demasiados ficheros por abrir.');
  }

  /* Carga de una vez los ficheros de una lista de rutas («hecho/estado.json»), en paralelo. Las que no existen se saltan. */
  async function precargar(rutas) {
    await Promise.all(rutas.map(async function (ruta) {
      try {
        var t = ruta.split('/'), n = t.pop(), c = RAIZ;
        for (var k = 0; k < t.length; k++) {
          await c.leerNombres();
          c = c.carpetas.filter(function (x) { return x.nombre === t[k]; })[0];
          if (!c) return;
        }
        await c.leerNombres();
        var f = c.ficheros.filter(function (x) { return x.nombre === n; })[0];
        if (f) await f.cargar();
      } catch (e) { /* si no se puede, ya lo pedirá el .gs y fallará con su mensaje */ }
    }));
  }

  /* Lo pequeño que casi toda pantalla mira (los .json sueltos de la raíz y de _interno, y hecho/estado.json): de una vez, para no ir pidiéndolo uno a uno. */
  async function precargarBase() {
    var rutas = ['hecho/estado.json'];
    for (var d of ['', '_interno']) {
      (await nombresDe(d) || []).forEach(function (n) { if (/\.json$/.test(n)) rutas.push(d ? d + '/' + n : n); });
    }
    await precargar(rutas);
  }

  /* Los nombres de los ficheros de una carpeta por su ruta, o null si no existe. Sin abrir ningún fichero. */
  async function nombresDe(ruta) {
    var c = RAIZ;
    var t = ruta.split('/').filter(Boolean);
    for (var k = 0; k < t.length; k++) {
      await c.leerNombres();
      c = c.carpetas.filter(function (x) { return x.nombre === t[k]; })[0];
      if (!c) return null;
    }
    await c.leerNombres();
    return c.ficheros.map(function (f) { return f.nombre; });
  }

  var MAD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  /* Solo el patrón que usa Tiempo.gs: yyyy-MM-dd'T'HH:mm:ssXXX */
  function formatDate(d) {
    var p = {};
    MAD.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    var comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    var min = Math.round((comoUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
    return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute + ':' + p.second + (min < 0 ? '-' : '+') + String(Math.floor(Math.abs(min) / 60)).padStart(2, '0') + ':' + String(Math.abs(min) % 60).padStart(2, '0');
  }

  /* Lo poco de Google que los .gs de lectura miran. */
  function instalarGoogle() {
    window.DriveApp = {
      getFolderById: function () { return RAIZ; },
      getFileById: function () { throw new Error(SOLO_LEE); }
    };
    window.PropertiesService = { getScriptProperties: function () { return { getProperty: function (k) { return k === 'CARPETA_ID' ? 'raiz' : null; }, setProperty: function () {}, deleteProperty: function () {} }; } };
    window.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
    window.ScriptApp = { getService: function () { return { getUrl: function () { return ''; } }; }, getProjectTriggers: function () { return []; } };
    window.Session = { getActiveUser: function () { return { getEmail: function () { return ''; } }; }, getEffectiveUser: function () { return { getEmail: function () { return ''; } }; } };
    window.Utilities = Object.assign({ formatDate: formatDate }, C.utilidades || {});
    /* Fuera de una transacción esta página no escribe: lo que un .gs de lectura intente guardar (marcas sueltas de «ya visto») se queda sin guardar. */
    window.escribirJson_ = function () {};
  }

  /* Abre la carpeta elegida. Devuelve true si es «CENTRO DE DATOS» (tiene indice.json). */
  async function abrir(handle) {
    try { await handle.getFileHandle('indice.json'); } catch (e) { return false; }
    REAL = handle;
    RAIZ = new Carpeta('', handle, null);
    RAIZ.nombre = 'CENTRO DE DATOS';
    instalarGoogle();
    return true;
  }

  C = window.CarpetaLectura = { abrir: abrir, conCarga: conCarga, precargar: precargar, precargarBase: precargarBase, nombresDe: nombresDe, Falta: Falta, SOLO_LEE: SOLO_LEE,
    clases: { Fichero: Fichero, Carpeta: Carpeta }, raiz: function () { return RAIZ; }, handleReal: function () { return REAL; }, reiniciar: reiniciar, tomarFaltas: tomarFaltas, rastrear: rastrear, escribirJsonReal: window.escribirJson_ };
})();
