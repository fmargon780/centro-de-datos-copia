/* Lo que cambia respecto a la aplicación de hoy: nada de lo que cambia datos se hace aquí. En su sitio sale un botón que abre la aplicación de hoy.
   El resto (tablas, cajitas, avisos, colores y textos) sale del mismo código que la de hoy. */
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

  /* La zona de soltar ficheros y la pestaña «Acceso y carpeta» se sustituyen una vez. */
  function sustituirFijos() {
    var zona = document.getElementById('zona');
    zona.textContent = '';
    zona.appendChild(el('span', '', 'Para soltar ficheros de Séneca, usa la aplicación de hoy'));
    zona.appendChild(botonHoy('accion'));
    /* Los códigos de la aplicación de hoy buscan estos dos por su nombre: se dejan escondidos. */
    var input = el('input'); input.type = 'file'; input.id = 'elegir'; input.hidden = true; input.disabled = true; zona.appendChild(input);
    var curso = el('select'); curso.id = 'cursoZona'; curso.hidden = true; zona.appendChild(curso);
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
    Array.prototype.forEach.call(document.querySelectorAll('#sinClasificar .pend:not([data-solo-lee])'), function (fila) {
      fila.dataset.soloLee = '1';
      Array.prototype.slice.call(fila.children).forEach(function (h) {
        if (!(h.tagName === 'A' || h.classList.contains('cuando') || h.classList.contains('motivo'))) fila.removeChild(h);
      });
      fila.appendChild(botonHoy('enlace'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('#filasListados .sublinea .cambiar'), function (b) { b.parentNode.replaceChild(botonHoy('enlace'), b); });
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
})();
