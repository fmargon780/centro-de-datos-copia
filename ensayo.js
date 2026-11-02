/* El ensayo de la ficha del alumno (fila 46): la página monta el conjunto `alumnado` en el propio ordenador, con los mismos .gs de hoy (Ensayo.gs), y lo compara con lo que monta la aplicación de hoy.
   Todo lo que escribe va a _interno/ensayo-pagina/: los .gs ven una raíz «de ensayo» que lee la carpeta de verdad (listados, alumnos, lo aprendido…) pero escribe solo ahí:
   hecho/ y leido/ son del ensayo, hechos.json es su avance e indice.json lleva sus partes (en el resto, el índice de verdad). Lo demás es de solo lectura: si un .gs intenta escribir fuera, falla.
   El montaje va paso a paso (una lectura o una parte cada vez) y entre paso y paso deja respirar a la pantalla. Si se cierra la página a medias, el avance está en el ensayo y sigue en la próxima apertura. */
(function () {
  'use strict';
  var C = window.CarpetaLectura;
  var E = ['_interno', 'ensayo-pagina'];
  var FUERA = 'El ensayo solo escribe dentro de _interno/ensayo-pagina.';
  var MAX_PASOS = 3000;

  function noEsta() { var e = new Error('no está'); e.name = 'NotFoundError'; return e; }
  function prohibido() { return Promise.reject(new Error(FUERA)); }

  /* ---- Lo de verdad, solo para leer ---- */
  function ficheroSoloLee(f) { return { kind: 'file', name: f.name, getFile: function () { return f.getFile(); }, createWritable: prohibido }; }
  function soloLee(h) {
    return {
      kind: 'directory', name: h.name,
      entries: async function* () { for await (var par of h.entries()) yield [par[0], par[1].kind === 'directory' ? soloLee(par[1]) : ficheroSoloLee(par[1])]; },
      getFileHandle: async function (n, o) { if (o && o.create) throw new Error(FUERA); return ficheroSoloLee(await h.getFileHandle(n)); },
      getDirectoryHandle: async function (n, o) { if (o && o.create) throw new Error(FUERA); return soloLee(await h.getDirectoryHandle(n)); },
      removeEntry: prohibido
    };
  }

  /* ---- Una carpeta de dentro del ensayo: existe de verdad solo cuando se escribe en ella ---- */
  function lazyDir(real, partes) {
    async function resolver(crear) {
      var h = real;
      for (var i = 0; i < partes.length; i++) {
        try { h = await h.getDirectoryHandle(partes[i], crear ? { create: true } : undefined); } catch (e) { if (e && e.name === 'NotFoundError') return null; throw e; }
      }
      return h;
    }
    return {
      kind: 'directory', name: partes[partes.length - 1],
      entries: async function* () {
        var h = await resolver(false);
        if (!h) return;
        for await (var par of h.entries()) yield [par[0], par[1].kind === 'directory' ? lazyDir(real, partes.concat(par[0])) : par[1]];
      },
      getFileHandle: async function (n, o) { var h = await resolver(!!(o && o.create)); if (!h) throw noEsta(); return h.getFileHandle(n, o); },
      getDirectoryHandle: async function (n, o) {
        var h = await resolver(!!(o && o.create));
        if (!h) throw noEsta();
        await h.getDirectoryHandle(n, o);
        return lazyDir(real, partes.concat(n));
      },
      removeEntry: async function (n, o) { var h = await resolver(false); if (!h) throw noEsta(); return h.removeEntry(n, o); }
    };
  }

  /* ---- indice.json: el de verdad, pero con las partes (`hechos`) del ensayo ---- */
  function digest(u8) { var h = 2166136261; for (var i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 16777619); } return u8.length + ':' + (h >>> 0).toString(36); }
  async function bytesDe(h) { return new Uint8Array(await (await h.getFile()).arrayBuffer()); }
  async function leerOpcional(dir, nombre) { try { return await bytesDe(await dir.getFileHandle(nombre)); } catch (e) { if (e && e.name === 'NotFoundError') return null; throw e; } }

  function ficheroIndice(real, dE) {
    async function compuesto() {
      var delReal = await bytesDe(await real.getFileHandle('indice.json'));
      var texto = await leerOpcional(dE, 'indice.json'), base = await leerOpcional(dE, 'indice-base.json');
      var marca = null;
      try { marca = base && JSON.parse(new TextDecoder().decode(base)).digest; } catch (e) { marca = null; }
      if (texto && marca === digest(delReal)) return texto;
      var ind = JSON.parse(new TextDecoder().decode(delReal)), suyo = null;
      try { suyo = texto && JSON.parse(new TextDecoder().decode(texto)); } catch (e) { suyo = null; }
      ind.hechos = (suyo && suyo.hechos) || [];
      return new TextEncoder().encode(JSON.stringify(ind));
    }
    return {
      kind: 'file', name: 'indice.json',
      getFile: async function () { var b = await compuesto(); return { size: b.length, lastModified: 0, arrayBuffer: async function () { return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } }; },
      createWritable: async function () {
        var trozos = [];
        return {
          write: async function (d) { trozos.push(d instanceof Uint8Array ? d : new Uint8Array(d)); },
          close: async function () {
            var n = trozos.reduce(function (s, t) { return s + t.length; }, 0), todo = new Uint8Array(n), p = 0;
            trozos.forEach(function (t) { todo.set(t, p); p += t.length; });
            var base = digest(await bytesDe(await real.getFileHandle('indice.json')));
            for (var k = 0; k < 2; k++) {
              var f = await (await dE.getFileHandle(k ? 'indice-base.json' : 'indice.json', { create: true })).createWritable();
              await f.write(k ? new TextEncoder().encode(JSON.stringify({ digest: base })) : todo);
              await f.close();
            }
          }
        };
      }
    };
  }

  /* ---- La raíz de ensayo ---- */
  function raizDeEnsayo(real) {
    var dE = lazyDir(real, E), lectura = soloLee(real), indice = ficheroIndice(real, dE);
    var SUYAS = { hecho: 1 }, SUYAS_INTERNO = { leido: 1, 'hechos.json': 1, 'ensayo-pagina': 1 };
    async function interno() { try { return soloLee(await real.getDirectoryHandle('_interno')); } catch (e) { if (e && e.name === 'NotFoundError') return null; throw e; } }
    var vInterno = {
      kind: 'directory', name: '_interno',
      entries: async function* () {
        var r = await interno();
        if (r) for await (var par of r.entries()) if (!SUYAS_INTERNO[par[0]]) yield par;
        for await (var suyo of dE.entries()) if (suyo[0] === 'leido' || suyo[0] === 'hechos.json') yield suyo;
      },
      getFileHandle: async function (n, o) {
        if (n === 'hechos.json') return dE.getFileHandle(n, o);
        if (SUYAS_INTERNO[n]) throw noEsta();
        var r = await interno(); if (!r) throw noEsta();
        return r.getFileHandle(n, o);
      },
      getDirectoryHandle: async function (n, o) {
        if (n === 'leido') { await dE.getDirectoryHandle(n, o); return lazyDir(real, E.concat(n)); }
        if (SUYAS_INTERNO[n]) throw noEsta();
        var r = await interno(); if (!r) throw noEsta();
        return r.getDirectoryHandle(n, o);
      },
      removeEntry: async function (n, o) { if (n === 'leido' || n === 'hechos.json') return dE.removeEntry(n, o); throw new Error(FUERA); }
    };
    return {
      kind: 'directory', name: real.name,
      entries: async function* () {
        for await (var par of lectura.entries()) if (par[0] !== 'indice.json' && par[0] !== '_interno' && !SUYAS[par[0]]) yield par;
        yield ['indice.json', indice];
        yield ['_interno', vInterno];
        for await (var suyo of dE.entries()) if (SUYAS[suyo[0]]) yield suyo;
      },
      getFileHandle: async function (n, o) { if (n === 'indice.json') return indice; return lectura.getFileHandle(n, o); },
      getDirectoryHandle: async function (n, o) {
        if (n === '_interno') return vInterno;
        if (SUYAS[n]) { await dE.getDirectoryHandle(n, o); return lazyDir(real, E.concat(n)); }
        return lectura.getDirectoryHandle(n, o);
      },
      removeEntry: prohibido
    };
  }

  /* ---- El montaje ---- */
  var promesa = null, otraVez = false, trabajando = false, fallo = '', poniendo = '', pendientes = [];
  /* Fila 126: tras guardar un fichero se prepara al momento lo que sale de él. `preparando` = el aviso amarillo está puesto; `plan` = qué conjuntos y en qué orden; `urgente` = falta montarlo seguido, antes que el ensayo. */
  var urgente = false, preparando = false, plan = [], hecho = {};
  window.PREPARANDO = {}; window.LISTO_HOY = {};
  var $ = function (id) { return document.getElementById(id); };
  var nombreDe = function (conjunto) { return ensayoDe_(conjunto).poniendo; };
  var ceder = function () { return new Promise(function (ok) { setTimeout(ok, 0); }); };

  /* Del fallo, solo lo que ayuda a arreglarlo y nunca un dato: el tipo, el mensaje (salvo en un JSON ilegible, que cita el texto) y los nombres de las dos primeras funciones. */
  function detalle(e) {
    var msg = e && e.name !== 'SyntaxError' ? String(e.message || '').slice(0, 260) : '';
    var pila = ((e && e.stack) || '').split('\n').map(function (l) { var m = /at (?:async )?([\w$.]+)/.exec(l); return m ? m[1] : ''; }).filter(Boolean).slice(0, 2).join(' < ');
    return [e && e.name, msg, e && e.fichero ? 'fichero «' + e.fichero + '»' : '', pila].filter(Boolean).join(' · ');
  }

  /* La línea pequeña de «Poniendo al día…», justo debajo de «Datos ya hechos». */
  function pintar() {
    var l = $('ensayoProgreso');
    if (!l) {
      var h = $('hechos');
      if (!h) return;
      l = el('p', 'nota-simple'); l.id = 'ensayoProgreso'; l.hidden = true;
      h.parentNode.insertBefore(l, h.nextSibling);
    }
    l.hidden = !(trabajando || fallo);
    l.textContent = fallo || (trabajando ? 'Poniendo al día ' + (poniendo || 'el ensayo') + '…' : '');
    pintarAviso();
  }

  /* Fila 126: el aviso amarillo («no cierres la página») y, con él, las cajitas de lo que se prepara. Solo sale en la página de quien ha guardado el fichero. */
  var tituloDe = function (conjunto) { var c = CONJUNTOS_.filter(function (x) { return x.conjunto === conjunto; })[0]; return c ? c.titulo : conjunto; };
  function pintarAviso() {
    var a = $('preparando');
    if (!a) {
      var h = $('hechos');
      if (!h) return;
      a = el('div', 'aviso-preparando'); a.id = 'preparando'; a.hidden = true; a.setAttribute('role', 'status');
      a.appendChild(el('b', '', 'Preparando los datos para las demás aplicaciones. No cierres la página hasta que termine.'));
      a.appendChild(el('span', 'paso')); a.lastChild.id = 'preparandoPaso';
      h.parentNode.insertBefore(a, h);
    }
    a.hidden = !preparando;
    var falta = plan.filter(function (c) { return !hecho[c]; });
    $('preparandoPaso').textContent = falta.length ? 'Ahora: ' + tituloDe(falta[0]) + (falta.length > 1 ? ' · después: ' + falta.slice(1).map(tituloDe).join(', ') : '') : '';
    window.PREPARANDO = {};
    if (preparando) falta.forEach(function (c, i) { window.PREPARANDO[c] = i === 0 ? 'ahora' : 'espera'; });
    if (typeof window.dibujarHechos === 'function' && window.ULTIMOS_HECHOS) window.dibujarHechos(window.ULTIMOS_HECHOS);
  }
  function ponerPlan(lista) { plan = plan.concat(lista.filter(function (c) { return plan.indexOf(c) === -1; })); lista.forEach(function (c) { delete hecho[c]; }); pintarAviso(); }
  /* `restan`: los conjuntos que aún tienen algo por montar. El primero del plan que aún tiene algo es el que se prepara ahora; los de delante ya están, los de detrás esperan. */
  function avanzar(restan) {
    var primero = plan.findIndex(function (c) { return restan.indexOf(c) !== -1; }), nuevos = false, d = new Date();
    plan.forEach(function (c, i) {
      if (hecho[c] || !(primero === -1 || i < primero)) return;
      hecho[c] = true; nuevos = true;
      window.LISTO_HOY[c] = 'hoy, ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    });
    pintarAviso();
    if (nuevos) refrescar();
  }


  /* Un fichero vacío en el ensayo es uno que se creó justo cuando se cerró la página: se quita y se rehace. */
  async function sanear(dir) {
    for await (var par of dir.entries()) {
      if (par[1].kind === 'directory') await sanear(par[1]);
      else if ((await par[1].getFile()).size === 0) { try { await dir.removeEntry(par[0]); } catch (e) { /* ya no estaba */ } }
    }
  }

  /* Fila 58: cuánto tarda en responder la página mientras el ensayo trabaja. `bloqueo` = lo más que se quedó sin atender nada (un reloj que se retrasa) y `espera` = lo más que
     una lectura de pantalla esperó por culpa de un paso del ensayo. Se guarda en medida.json para que la aplicación de hoy lo suba como la comprobación `pagina-responde`. */
  var medida = null;
  function medir() {
    var m = { bloqueo: 0, espera: 0, paso: 0, pasos: 0, ultimo: performance.now() }, PERIODO = 25;
    m.reloj = setInterval(function () {
      var ahora = performance.now();
      if (!document.hidden && !m.oculta) m.bloqueo = Math.max(m.bloqueo, Math.round(ahora - m.ultimo - PERIODO));
      m.ultimo = ahora; m.oculta = false;
    }, PERIODO);
    m.visible = function () { m.oculta = true; };
    document.addEventListener('visibilitychange', m.visible);
    C.alEsperar = function (ms) { if (!document.hidden) m.espera = Math.max(m.espera, Math.round(ms)); };
    medida = m;
  }
  async function guardarMedida() {
    var m = medida;
    if (!m) return;
    medida = null;
    clearInterval(m.reloj); document.removeEventListener('visibilitychange', m.visible); C.alEsperar = null;
    if (!m.pasos) return;
    var ms = Math.max(m.bloqueo, m.espera);
    try { await C.escribirSuelto(E.join('/') + '/medida.json', JSON.stringify({ ms: ms, bloqueoMs: m.bloqueo, esperaMs: m.espera, pasoMs: m.paso, pasos: m.pasos, version: window.VERSION_PAGINA })); } catch (e) { /* sin medida: no pasa nada */ }
  }

  /* Un paso del ensayo, con la prioridad más baja de la cola: lo que pida la pantalla pasa por delante. */
  async function paso(fn, raiz) {
    var t = performance.now(), r = await C.transaccion(fn, raiz, true);
    if (medida) { medida.paso = Math.max(medida.paso, Math.round(performance.now() - t)); medida.pasos++; }
    return r;
  }

  function refrescar() {
    if (typeof window.cargarEstado === 'function') window.cargarEstado();
    var a = $('pestanaAvisos');
    if (a && a.classList.contains('activa') && typeof window.cargarAvisos === 'function') window.cargarAvisos();
  }

  /* Cuando un conjunto termina, su comparación se guarda y la pantalla se pone al día sola (sin esperar a que acabe todo). */
  async function terminado(conjunto) {
    await paso(function () { ensayoGuardarVista_(carpetaDatos_(), conjunto); return null; });
    pendientes = pendientes.filter(function (c) { return c !== conjunto; });
    if (preparando) { hecho[conjunto] = true; pintarAviso(); }
    refrescar();
  }

  async function montar() {
    var real = C.handleReal();
    if (!real) return;
    /* Fila 126: lo recién guardado se prepara antes que nada, seguido y en cadena (los contactos tras el personal). Después sigue el ensayo de siempre. */
    if (urgente) {
      urgente = false;
      try { await publicarLo(true); } finally { ensayoSinCalcular_(false); await guardarMedida(); }
      if (plan.length && plan.every(function (c) { return hecho[c]; })) { preparando = false; plan = []; hecho = {}; pintarAviso(); }   // ya está todo lo que se iba a preparar: el aviso se quita sin esperar al ensayo que sigue
    }
    await sanear(lazyDir(real, E));
    var raiz = raizDeEnsayo(real);
    try {
      /* El día de cada parte de hoy que guarda `hoy`, para montar el ensayo con el mismo (fila 57). Una vez por montaje, leyendo la carpeta de verdad. */
      var dias = await paso(function () { return ensayoDiasPrestados_(carpetaDatos_()); });
      pendientes = await paso(function () { return ensayoPendientes_(carpetaDatos_(), dias); }, raiz);
      if (pendientes.length && preparando) ponerPlan(pendientes);
      if (pendientes.length) { trabajando = true; poniendo = nombreDe(pendientes[0]); medir(); ensayoSinCalcular_(true); pintar(); refrescar(); }
      for (var pasos = 0; pendientes.length && pasos < MAX_PASOS; pasos++) {
        var r = await paso(function () { return ensayoPaso_(carpetaDatos_(), dias); }, raiz);
        var acabados = pendientes.filter(function (c) { return r.restan.indexOf(c) === -1; });
        for (var k = 0; k < acabados.length; k++) { await terminado(acabados[k]); await ceder(); }
        pendientes = r.restan.slice();
        if (!r.quedan) break;
        if (r.conjunto) { poniendo = nombreDe(r.conjunto); pintar(); }
        await ceder();
      }
      /* Lo que no tenía nada que montar pero cambió su comparación (la aplicación de hoy rehízo algo), de uno en uno. */
      for (var i = 0; i < ENSAYO_CONJUNTOS_.length; i++) { await paso(function () { ensayoGuardarVista_(carpetaDatos_(), ENSAYO_CONJUNTOS_[i].conjunto); return null; }); await ceder(); }
      /* Fila 59: lo que ya salía igual se publica de verdad (pagina/publicar.js). */
      await publicarLo(false);
    } finally { ensayoSinCalcular_(false); await guardarMedida(); }
  }

  async function publicarLo(alMomento) {
    if (!window.PublicarPagina) return;
    var ctx = { paso: paso, ceder: ceder, refrescar: refrescar,
      empieza: function () { trabajando = true; poniendo = 'los datos que publica esta página'; if (!medida) medir(); ensayoSinCalcular_(true); pintar(); } };
    if (alMomento || preparando) { ctx.plan = ponerPlan; ctx.avanza = avanzar; }   // con el aviso puesto, también la publicación que sigue al ensayo dice qué prepara
    await window.PublicarPagina.publicar(ctx);
  }

  /* Monta lo que falte; si mientras tanto se pide otra vez, repite al terminar. Devuelve una promesa que no falla nunca. */
  function lanzar() {
    if (window.SIN_ENSAYO_PAGINA) return Promise.resolve();   // solo lo pone una prueba que mira otra cosa
    if (promesa) { otraVez = true; return promesa; }
    fallo = '';
    promesa = (async function () {
      try {
        do { otraVez = false; await montar(); } while (otraVez);
      } catch (e) {
        fallo = 'No he podido poner al día ' + (poniendo || 'el ensayo') + ' en esta página (' + detalle(e) + '). Se volverá a intentar al abrirla.';
      } finally { trabajando = false; promesa = null; preparando = false; plan = []; hecho = {}; pintar(); refrescar(); }
    })();
    return promesa;
  }

  /* Fila 126: se acaba de guardar un fichero. Pone el aviso y prepara al momento lo que sale de él (si se guarda otro mientras tanto, se suma al mismo aviso). */
  function alGuardar() {
    if (window.SIN_ENSAYO_PAGINA || window.SIN_PUBLICAR_PAGINA) return lanzar();
    urgente = true; preparando = true; pintarAviso();
    return lanzar();
  }

  window.EnsayoPagina = {
    arrancar: lanzar,
    cambio: lanzar,
    alGuardar: alGuardar,
    preparando: function () { return preparando; },
    trabajando: function () { return trabajando; },
    pendientes: function () { return pendientes.slice(); },
    raizDeEnsayo: raizDeEnsayo
  };
})();
