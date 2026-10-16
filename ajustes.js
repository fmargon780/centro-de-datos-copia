/* Lo que cambia respecto a la aplicación de hoy. Desde la fila 45 se sueltan ficheros, se completa «Sin clasificar» y se cambia la ficha de un listado aquí
   (acciones.js). Lo que sigue sin hacerse aquí («Ya lo he visto», configuración, acceso, clave de GitHub, diagnóstico) sale como un botón que abre la
   aplicación de hoy. El resto (tablas, cajitas, avisos, colores y textos) sale del mismo código que la de hoy. */
(function () {
  'use strict';
  /* La dirección publicada de la aplicación de hoy (docs/CONTEXTO-CORTO.md, apartado 1). */
  var APLICACION_HOY = 'https://script.google.com/a/macros/g.educaand.es/s/AKfycbyqBvRep4Jvs82LlSWcJQiOYqd-fxWv1rr4mjMwWNKlCjQNd7CnxTP1RYGl8rsTorom/exec';
  var TEXTO_BOTON = 'Hacer esto en la aplicación de hoy';

  function botonHoy(clase) {
    var b = el('button', clase, TEXTO_BOTON);
    b.type = 'button'; b.dataset.hoy = '1';
    b.onclick = function (e) { e.stopPropagation(); window.open(APLICACION_HOY, '_blank', 'noopener'); };
    return b;
  }

  /* La pestaña «Acceso y carpeta» se sustituye una vez. */
  function sustituirFijos() {
    var acceso = document.getElementById('acceso');
    acceso.textContent = '';
    var caja = el('div', 'caja');
    caja.appendChild(el('h2', '', 'Quién entra y dónde están los datos'));
    caja.appendChild(el('p', 'nota-simple', 'Aquí ve los datos quien tenga la carpeta compartida.'));
    var p = el('p'); p.id = 'carpetaAcceso'; caja.appendChild(p);
    caja.appendChild(botonHoy('accion'));
    acceso.appendChild(caja);
  }

  /* Se repite cada vez que la página pinta algo nuevo (es idempotente). */
  function ajustar() {
    Array.prototype.forEach.call(document.querySelectorAll('.aviso-linea button.accion:not([data-hoy])'), function (b) { b.parentNode.replaceChild(botonHoy('accion'), b); });
    Array.prototype.forEach.call(document.querySelectorAll('#configuracion input, #configuracion textarea'), function (x) { x.readOnly = true; });
  }

  var pendiente = false;
  new MutationObserver(function () {
    if (pendiente) return;
    pendiente = true;
    queueMicrotask(function () { pendiente = false; ajustar(); });
  }).observe(document.body, { childList: true, subtree: true });

  sustituirFijos();
  window.APLICACION_HOY = APLICACION_HOY;
  window.botonHoy = botonHoy;
})();
