/* Escribir en la carpeta «CENTRO DE DATOS» desde el navegador (fila 45), con los mismos .gs de hoy.
   Los .gs son síncronos y el navegador no: cada guardado es una TRANSACCIÓN. El .gs corre sobre la carpeta en la memoria, apuntando lo que
   crea, cambia, mueve o borra; si le falta algo por leer se deshace y se repite (como en la lectura). Cuando termina, lo apuntado se pasa a la
   carpeta de verdad EN EL MISMO ORDEN en que el .gs lo hizo (primero el fichero nuevo, el índice el último). Antes de escribir se comprueba que
   ningún fichero de los que se van a reescribir (índice, pendientes…) ha cambiado desde que se leyó; después de escribir se vuelve a leer. Si otra
   persona guardó a la vez, se repite todo desde cero con lo que ella dejó. */
(function () {
  'use strict';
  var C = window.CarpetaLectura, Fichero = C.clases.Fichero, Carpeta = C.clases.Carpeta;
  var NO_ESCRIBE = 'Esta página solo escribe al guardar un fichero.';
  var VUELTAS = 6;
  var tx = null;

  function aBytes(x) {
    if (typeof x === 'string') return new TextEncoder().encode(x);
    if (x instanceof Uint8Array) return x;
    var u = new Uint8Array(x.length);
    for (var i = 0; i < x.length; i++) u[i] = x[i];
    return u;
  }
  function aFirmados(u) { var r = new Array(u.length); for (var i = 0; i < u.length; i++) r[i] = u[i] > 127 ? u[i] - 256 : u[i]; return r; }

  /* Lo de Google que piden los .gs al guardar: blobs, la huella y base64. */
  function newBlob(datos, mime, nombre) {
    var u = aBytes(datos);
    return {
      bytes: u, getName: function () { return nombre; }, getBytes: function () { return aFirmados(u); },
      getDataAsString: function (cod) { return new TextDecoder(cod === 'ISO-8859-1' ? 'iso-8859-1' : 'utf-8').decode(u); }
    };
  }
  C.utilidades = {
    newBlob: newBlob,
    base64Decode: function (t) { return aFirmados(Uint8Array.from(atob(String(t)), function (c) { return c.charCodeAt(0); })); },
    DigestAlgorithm: { SHA_256: 'sha256' },
    computeDigest: function (alg, bytes) { return aFirmados(window.sha256(aBytes(bytes))); }
  };

  function quita(lista, x) { var i = lista.indexOf(x); if (i !== -1) lista.splice(i, 1); }
  function anota(op, deshacer) {
    if (!tx) throw new Error(NO_ESCRIBE);
    tx.ops.push(op); tx.deshacer.push(deshacer);
  }

  /* ---- Lo que los .gs hacen en la memoria ---- */
  Fichero.prototype.setContent = function (texto) {
    var f = this, antes = f.bytes;
    f.bytes = aBytes(String(texto));
    anota({ t: 'contenido', f: f }, function () { f.bytes = antes; });
    return f;
  };
  Fichero.prototype.setName = function (nombre) {
    var f = this, antes = f.nombre;
    f.nombre = nombre;
    anota({ t: 'colocar', f: f, c: f.padre, n: nombre }, function () { f.nombre = antes; });
    return f;
  };
  Fichero.prototype.moveTo = function (destino) {
    var f = this, de = f.padre;
    destino.mirar();
    quita(de.ficheros, f); destino.ficheros.push(f); f.padre = destino;
    anota({ t: 'colocar', f: f, c: destino, n: f.nombre }, function () { quita(destino.ficheros, f); de.ficheros.push(f); f.padre = de; });
    return f;
  };
  Fichero.prototype.setTrashed = function (si) {
    var f = this, de = f.padre;
    if (!si) return f;
    quita(de.ficheros, f);
    anota({ t: 'borrar', f: f }, function () { de.ficheros.push(f); });
    return f;
  };
  /* createFile(nombre, texto, mime) o createFile(blob) */
  Carpeta.prototype.createFile = function (a, texto) {
    var c = this;
    c.mirar();
    var nombre = typeof a === 'string' ? a : a.getName();
    var f = new Fichero(nombre, null, c);
    f.bytes = typeof a === 'string' ? aBytes(String(texto)) : aBytes(a.bytes || a.getBytes());
    f.disco = null;
    c.ficheros.push(f);
    anota({ t: 'crear', f: f, c: c, n: nombre }, function () { quita(c.ficheros, f); });
    return f;
  };
  var crearEnMemoria = Carpeta.prototype.createFolder;
  Carpeta.prototype.createFolder = function (nombre) {
    var c = this;
    if (!tx) return crearEnMemoria.call(c, nombre);   // fuera de un guardado, una carpeta que falta solo existe en la memoria
    c.mirar();
    var h = new Carpeta(nombre, null, c);
    c.carpetas.push(h);
    anota({ t: 'carpeta', c: h }, function () { quita(c.carpetas, h); });
    return h;
  };
  Carpeta.prototype.setTrashed = function (si) {
    var c = this, de = c.padre;
    if (!si || !de) return c;
    quita(de.carpetas, c);
    anota({ t: 'borrarCarpeta', c: c }, function () { de.carpetas.push(c); });
    return c;
  };

  /* ---- Lo que se pasa a la carpeta de verdad ---- */
  async function dirHandle(c) {
    if (c.handle) return c.handle;
    var p = await dirHandle(c.padre);
    c.handle = await p.getDirectoryHandle(c.nombre, { create: true });
    return c.handle;
  }
  async function escribirFichero(c, nombre, bytes) {
    var h = await (await dirHandle(c)).getFileHandle(nombre, { create: true });
    var w = await h.createWritable();
    await w.write(bytes);
    await w.close();
    return h;
  }
  async function quitar(c, nombre) {
    try { await (await dirHandle(c)).removeEntry(nombre); } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; }
  }
  async function bytesDe(handle) { return new Uint8Array(await (await handle.getFile()).arrayBuffer()); }
  function iguales(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* Un solo «colocar» y un solo «contenido» por fichero, en el sitio del último. */
  function compactar(ops) {
    var ultimo = new Map();
    ops.forEach(function (op, i) { if (op.t === 'colocar' || op.t === 'contenido') ultimo.set(op.t + ':' + (op.f.uid || (op.f.uid = ++compactar.n)), i); });
    return ops.filter(function (op, i) { return !(op.t === 'colocar' || op.t === 'contenido') || ultimo.get(op.t + ':' + op.f.uid) === i; });
  }
  compactar.n = 0;

  /* ¿Ha cambiado alguno de los ficheros que se van a reescribir desde que se leyó? */
  async function huboCambios(ops, propios) {
    var libera = {};   // los sitios que el propio guardado deja libres (un fichero que se mueve o se borra): crear otro con ese nombre es lo normal
    ops.forEach(function (op) { if ((op.t === 'colocar' || op.t === 'borrar') && op.f.disco) libera[op.f.disco.c.ruta + '\u0000' + op.f.disco.n] = true; });
    for (var i = 0; i < ops.length; i++) {
      var f = ops[i].f;
      if (ops[i].t === 'crear' && ops[i].c.handle && !libera[ops[i].c.ruta + '\u0000' + ops[i].n] && !propios[ops[i].c.ruta + '\u0000' + ops[i].n]) {   // un fichero que se crea y ya está en el disco, y no lo escribió una vuelta anterior de este mismo guardado: otra persona lo creó a la vez (fila 102)
        try { await ops[i].c.handle.getFileHandle(ops[i].n); return true; } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; }
      }
      if (ops[i].t !== 'contenido' || !f.leido || !f.handle) continue;
      var ahora;
      try { ahora = await bytesDe(f.handle); } catch (e) { return true; }
      if (!iguales(ahora, f.leido)) return true;
    }
    return false;
  }

  async function reproducir(ops, propios) {
    var escritos = {}, clave = function (c, n) { return c.ruta + '\u0000' + n; };
    for (var j = 0; j < ops.length; j++) if (ops[j].t === 'colocar' && !ops[j].f.bytes) await ops[j].f.cargar();   // el contenido, antes de que nada lo pise
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i], f = op.f;
      if (op.t === 'carpeta') await dirHandle(op.c);
      else if (op.t === 'crear') {
        f.handle = await escribirFichero(op.c, op.n, f.bytes);
        f.disco = { c: op.c, n: op.n };
        escritos[clave(op.c, op.n)] = f; propios[clave(op.c, op.n)] = true;
      } else if (op.t === 'contenido') {
        var w = await f.handle.createWritable();
        await w.write(f.bytes);
        await w.close();
      } else if (op.t === 'colocar') {
        var viejo = f.disco;
        if (viejo && viejo.c === op.c && viejo.n === op.n) continue;
        f.handle = await escribirFichero(op.c, op.n, f.bytes);
        f.disco = { c: op.c, n: op.n };
        if (viejo) {
          var ocupa = escritos[clave(viejo.c, viejo.n)];
          if (!ocupa || ocupa === f) await quitar(viejo.c, viejo.n);   // si otro fichero nuevo ya está ahí, ese es el que se queda
        }
        escritos[clave(op.c, op.n)] = f; propios[clave(op.c, op.n)] = true;
      } else if (op.t === 'borrar') {
        var d = f.disco, o = d && escritos[clave(d.c, d.n)];
        if (d && (!o || o === f)) await quitar(d.c, d.n);
      } else if (op.t === 'borrarCarpeta') {
        try { await (await dirHandle(op.c.padre)).removeEntry(op.c.nombre, { recursive: true }); } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; }
      }
    }
  }

  /* Lo reescrito se vuelve a leer: si no es lo que se escribió, otra persona escribió a la vez. */
  async function sigueIgual(ops) {
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].t !== 'contenido') continue;
      var ahora;
      try { ahora = await bytesDe(ops[i].f.handle); } catch (e) { return false; }
      if (!iguales(ahora, ops[i].f.bytes)) return false;
    }
    return true;
  }

  function deshacer() { var d = tx.deshacer; tx = null; for (var i = d.length - 1; i >= 0; i--) d[i](); }

  /* Corre `fn` (síncrona, con los .gs) cuantas veces haga falta, cargando entre una y otra lo que le faltaba. Devuelve su resultado y lo apuntado. */
  async function probar(fn) {
    for (var i = 0; i < 5000; i++) {
      tx = { ops: [], deshacer: [] };
      window.NOMBRES_ALUMNADO_ = null;   // lo que el .gs guarda «para esta ejecución» no debe sobrevivir a una vuelta que se deshace
      C.rastrear(true);
      var resultado, fallo = null;
      window.escribirJson_ = C.escribirJsonReal;
      try { resultado = fn(); } catch (e) { fallo = e || new Error('Error'); } finally { window.escribirJson_ = function () {}; }
      var faltas = C.tomarFaltas();
      C.rastrear(false);
      if (faltas.length) { deshacer(); await Promise.all(faltas.map(function (x) { return x.cargar(); })); continue; }
      if (fallo) { deshacer(); throw fallo; }
      var t = tx; tx = null;
      return { resultado: resultado, ops: t.ops };
    }
    throw new Error('La carpeta tiene demasiados ficheros por abrir.');
  }

  /* El turno común entre personas (turno-escritura.js): su fichero se lee y escribe directo, sin pasar por los .gs. */
  var elTurno = null;
  function turno() {
    if (!elTurno) {
      elTurno = window.TurnoEscritura.crear({
        leer: async function () { try { return JSON.parse(new TextDecoder().decode(await leerSuelto(window.TurnoEscritura.RUTA))); } catch (e) { return {}; } },
        escribir: function (t) { return escribirSuelto(window.TurnoEscritura.RUTA, JSON.stringify(t)); },
        quitar: function () { return borrarSuelto(window.TurnoEscritura.RUTA); },
        persona: (function () { try { return (localStorage.getItem('centro-de-datos-pagina-quien') || '').trim(); } catch (e) { return ''; } })()
      });
    }
    return elTurno;
  }

  /* ¿Toca algo compartido? Lo que el ensayo guarda en su propia carpeta no hace falta que espere a nadie. */
  function fueraDelEnsayo(op) {
    var c = op.t === 'contenido' || op.t === 'borrar' ? op.f.padre : op.c, r = (c && c.ruta) || '';
    return !/^_interno\/ensayo-pagina(\/|$)/.test(r);
  }

  /* `alterna`: una raíz distinta (el ensayo de la fila 46, pagina/ensayo.js) para que los .gs lean y escriban en ella; al terminar la carpeta de verdad vuelve a ser la de siempre. */
  async function unaVez(fn, alterna) {
    var propios = {}, suelta = null;   // lo que las vueltas de este guardado ya han escrito (una vuelta repetida no choca con lo suyo)
    try {
      for (var vuelta = 0; vuelta < VUELTAS; vuelta++) {
        if (vuelta) await new Promise(function (ok) { setTimeout(ok, 150 + Math.random() * 450); });
        C.reiniciar(alterna);
        var p = await probar(fn), ops = compactar(p.ops);
        if (!ops.length) return p.resultado;
        if (!alterna && !suelta && ops.some(fueraDelEnsayo)) suelta = await turno().tomar();   // las escrituras de verdad, de una persona cada vez (fila 115)
        if (suelta && !(await turno().renovar())) { suelta = null; continue; }   // si el turno se perdió por tardar, se vuelve a pedir
        if (await huboCambios(ops, propios)) continue;
        await reproducir(ops, propios);
        var bien = await sigueIgual(ops);
        if (bien) return p.resultado;
      }
    } finally { C.reiniciar(); if (suelta) await suelta(); }
    throw new Error('Otra persona está guardando a la vez y no he podido terminar. Vuelve a probar dentro de un momento.');
  }

  /* Una cosa cada vez en este navegador: guardados y lecturas hacen cola; entre pestañas, los candados del navegador si los hay.
     Lo de `baja` (los pasos del ensayo, fila 58) espera a que no haya nada normal en la cola: una lectura de pantalla se cuela por delante y solo espera al paso que ya está en marcha. */
  var pendientes = [], corriendo = null;
  function siguiente() {
    if (corriendo || !pendientes.length) return;
    var i = 0;
    while (i < pendientes.length && pendientes[i].baja) i++;
    var turno = pendientes.splice(i < pendientes.length ? i : 0, 1)[0];
    corriendo = turno;
    if (!turno.baja && C.alEsperar && turno.detras) C.alEsperar(Date.now() - turno.desde);
    Promise.resolve().then(turno.fn).then(turno.ok, turno.mal).then(function () { corriendo = null; siguiente(); });
  }
  function enCola(fn, baja) {
    return new Promise(function (ok, mal) {
      pendientes.push({ fn: fn, baja: !!baja, ok: ok, mal: mal, desde: Date.now(), detras: !!(corriendo && corriendo.baja) });
      siguiente();
    });
  }
  function transaccion(fn, alterna, baja) {
    return enCola(function () {
      var dentro = function () { return unaVez(fn, alterna); };
      try { if (navigator.locks && navigator.locks.request) return navigator.locks.request('centro-de-datos-escritura', dentro); } catch (e) { /* sin candados: solo esta pestaña */ }
      return dentro();
    }, baja);
  }

  /* Un fichero suelto (el diario de lo recibido), escrito sin pasar por los .gs. Devuelve su nombre. */
  async function escribirSuelto(ruta, bytes) {
    var t = ruta.split('/'), n = t.pop(), h = C.handleReal();
    for (var k = 0; k < t.length; k++) h = await h.getDirectoryHandle(t[k], { create: true });
    var f = await h.getFileHandle(n, { create: true }), w = await f.createWritable();
    await w.write(aBytes(bytes));
    await w.close();
  }
  async function leerSuelto(ruta) {
    var t = ruta.split('/'), n = t.pop(), h = C.handleReal();
    for (var k = 0; k < t.length; k++) h = await h.getDirectoryHandle(t[k]);
    return bytesDe(await h.getFileHandle(n));
  }
  async function borrarSuelto(ruta) {
    var t = ruta.split('/'), n = t.pop(), h = C.handleReal();
    try { for (var k = 0; k < t.length; k++) h = await h.getDirectoryHandle(t[k]); await h.removeEntry(n); } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; }
  }

  C.transaccion = transaccion;
  C.enCola = enCola;
  C.escribirSuelto = escribirSuelto;
  C.borrarSuelto = borrarSuelto;
  C.leerSuelto = leerSuelto;
  C.aBytes = aBytes;
  C.aFirmados = aFirmados;
})();
