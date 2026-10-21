/* Lo que cambia respecto a la aplicación de hoy. Desde la fila 65 todo se hace aquí (acciones.js, servidor.js, medidas.js): solo queda la pestaña «Acceso y carpeta»,
   que en vez de una lista de personas dice que entra quien tenga la carpeta compartida, y el cuadro de buscar un código de diagnóstico, que lo ve quien tiene la carpeta. */
(function () {
  'use strict';

  /* La pestaña «Acceso y carpeta» se sustituye una vez. */
  function sustituirFijos() {
    var acceso = document.getElementById('acceso');
    acceso.textContent = '';
    var caja = el('div', 'caja');
    caja.appendChild(el('h2', '', 'Quién entra y dónde están los datos'));
    caja.appendChild(el('p', 'nota-simple', 'Entra quien tenga compartida la carpeta «CENTRO DE DATOS» de Drive. Para dar acceso a alguien, se le comparte esa carpeta.'));
    var p = el('p'); p.id = 'carpetaAcceso'; caja.appendChild(p);
    acceso.appendChild(caja);
  }

  sustituirFijos();
  prepararDiagnostico();
})();
