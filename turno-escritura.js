/* El turno común para escribir en la carpeta (fila 115). El candado del navegador solo vale dentro de un navegador: dos personas, cada una en su ordenador, podían guardar el mismo fichero a la vez
   y Drive para ordenador mezclaba las dos escrituras (un JSON entero seguido de restos del otro). Ahora, antes de reescribir nada, la página toma el turno en la propia carpeta:
   _interno/turno-escritura.json = { dueno, persona, hasta }. Quien no lo tiene espera y vuelve a mirar; quien lo toma lo escribe, espera un momento a que se asiente, lo relee y solo sigue si sigue siendo suyo.
   Al terminar lo quita. Un turno que nadie renueva caduca solo (`hasta`), así que una pestaña cerrada a medias no bloquea a nadie. `io` = { leer, escribir, quitar } sobre ese fichero. */
(function (g) {
  'use strict';
  var RUTA = '_interno/turno-escritura.json';
  var VALIDEZ = 90 * 1000, ASENTAR = 1500, ESPERA_MAX = 45 * 1000, HUECO = 1200;

  function crear(io, o) {
    o = o || {};
    var ahora = o.ahora || function () { return Date.now(); };
    var dormir = o.dormir || function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
    var yo = o.dueno || Math.random().toString(36).slice(2, 10);
    var validez = o.validez || VALIDEZ, asentar = o.asentar == null ? ASENTAR : o.asentar, espera = o.espera || ESPERA_MAX, hueco = o.hueco || HUECO;
    var persona = o.persona || '';
    var aleatorio = o.aleatorio || Math.random;

    async function mirar() { try { return (await io.leer()) || {}; } catch (e) { return {}; } }   // sin fichero o a medias, nadie tiene el turno

    /* Devuelve la función que lo suelta. Si en `espera` milisegundos no se consigue, lanza el aviso de siempre. */
    async function tomar() {
      var limite = ahora() + espera;
      for (;;) {
        var t = await mirar();
        if (!(t.dueno && t.dueno !== yo && typeof t.hasta === 'number' && t.hasta > ahora())) {
          await io.escribir({ dueno: yo, persona: persona, hasta: ahora() + validez });
          await dormir(asentar);
          if ((await mirar()).dueno === yo) return soltar;
        }
        if (ahora() > limite) throw new Error('Otra persona está guardando a la vez y no he podido terminar. Vuelve a probar dentro de un momento.');
        await dormir(hueco + aleatorio() * hueco);
      }
    }
    async function soltar() {
      try { if ((await mirar()).dueno === yo) await io.quitar(); } catch (e) { /* caduca solo */ }
    }
    /* Justo antes de escribir: ¿sigue siendo mío? Si sí, se alarga. Si no (tardó tanto que caducó y entró otra persona), false. */
    async function renovar() {
      if ((await mirar()).dueno !== yo) return false;
      await io.escribir({ dueno: yo, persona: persona, hasta: ahora() + validez });
      return true;
    }
    return { tomar: tomar, soltar: soltar, renovar: renovar, dueno: yo };
  }
  g.TurnoEscritura = { crear: crear, RUTA: RUTA };
})(typeof window !== 'undefined' ? window : globalThis);
