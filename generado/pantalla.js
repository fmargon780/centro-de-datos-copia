/* Generado por pagina/construir.mjs a partir de la aplicación de hoy. No se edita a mano. */
/* ==== JsComun.html ==== */

/* Llama a una función del servidor por la puerta. Devuelve una promesa con el resultado ya leído. */
function servidor(nombre) {
  var argumentos = Array.prototype.slice.call(arguments, 1);
  return new Promise(function (resolver, rechazar) {
    google.script.run
      .withSuccessHandler(function (r) { resolver(r === null || r === undefined ? null : JSON.parse(r)); })
      .withFailureHandler(function (e) { rechazar(new Error(textoLlano(e))); })
      .puerta(nombre, JSON.stringify(argumentos));
  });
}

/* Los errores de Google llevan «Error: » delante y a veces jerga: aquí se dicen en llano. */
var TEXTO_PERMISO = 'Falta un permiso de Google para escribir en Drive.';
function textoLlano(e) {
  var t = String((e && e.message) || e || '').replace(/^(Uncaught )?Error:\s*/, '');
  if (/permission to call|Required permissions|permiso para llamar|Permisos necesarios|Authorization is required|ScriptError/i.test(t)) return TEXTO_PERMISO;
  return t || 'Ha pasado algo inesperado.';
}

/* Los errores se apilan (cada texto una sola vez, con su ×). Un aviso «ok» sustituye al «ok» anterior. avisar('') limpia todo. */
function avisar(texto, esError) {
  var d = document.getElementById('avisos');
  if (!texto) { d.innerHTML = ''; return; }
  var previos = d.children;
  for (var i = previos.length - 1; i >= 0; i--) {
    if (previos[i].dataset.texto === texto && previos[i].dataset.error === String(!!esError)) return;
    if (!esError && previos[i].dataset.error === 'false') d.removeChild(previos[i]);
  }
  if (esError && typeof registrarError === 'function') registrarError(texto);
  var p = document.createElement('div');
  p.className = esError ? 'error' : 'ok';
  p.dataset.texto = texto; p.dataset.error = String(!!esError);
  p.appendChild(document.createTextNode(texto));
  if (esError) {
    var x = document.createElement('button');
    x.className = 'cerrar'; x.textContent = '×'; x.title = 'Cerrar';
    x.onclick = function () { d.removeChild(p); };
    p.appendChild(x);
  }
  d.appendChild(p);
}

/* Un aviso fijo con pasos (ámbar): el permiso que falta o el lanzador viejo. */
function pintarPasos(titulo, pasos) {
  var d = document.getElementById('avisoPasos');
  d.textContent = '';
  if (!titulo) { d.hidden = true; return; }
  d.hidden = false;
  var t = document.createElement('div'); t.textContent = titulo; d.appendChild(t);
  if (pasos && pasos.length) {
    var ol = document.createElement('ol');
    pasos.forEach(function (p) { var li = document.createElement('li'); li.textContent = p; ol.appendChild(li); });
    d.appendChild(ol);
  }
}


/* Crea un elemento con clase y texto (el texto va siempre como texto, nunca como HTML). */
function el(etiqueta, clase, texto) {
  var e = document.createElement(etiqueta);
  if (clase) e.className = clase;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

/* ==== JsListados.html ==== */

/* La pestaña «Listados»: la carpeta, la tabla, los últimos movimientos. */
function pintarCarpeta(e) {
  var d = document.getElementById('carpeta');
  d.textContent = '';
  var c = e.carpeta;
  if (c.ok) {
    d.appendChild(document.createTextNode('Carpeta de los datos: '));
    var a = el('a', '', c.nombre);
    a.href = c.url; a.target = '_blank';
    d.appendChild(a);
    return;
  }
  d.appendChild(document.createTextNode(c.mensaje + ' '));
  pintarPasos(c.permiso ? c.mensaje : '', c.pasos);
  if (c.detalle) d.appendChild(el('div', 'detalle', 'Lo que dice Google: ' + c.detalle));
  if (c.perdida && e.esDueno) {
    var b = el('button', 'accion', 'Crear una carpeta nueva');
    b.onclick = function () {
      b.disabled = true;
      servidor('webCrearCarpetaNueva').then(function (r) { pintarEstado(r); }, function (x) { b.disabled = false; avisar(x.message, true); });
    };
    d.appendChild(b);
  }
}

var ESTADO = null;
var CURSO_TABLA = '';

/* Los cursos de la tabla: los que hay en el índice más el actual. Cambiarlo no llama al servidor. */
function pintarCursoTabla() {
  var s = document.getElementById('cursoTabla');
  if (ESTADO.cursos.indexOf(CURSO_TABLA) === -1) CURSO_TABLA = ESTADO.cursoActual;
  s.textContent = '';
  ESTADO.cursos.forEach(function (c) { s.appendChild(new Option(c + (c === ESTADO.cursoActual ? ' (actual)' : ''), c)); });
  s.value = CURSO_TABLA;
  s.onchange = function () { CURSO_TABLA = s.value; pintarTabla(); };
}

function frasePlural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

function esHistorico(f) { return f.estado !== 'gris' && f.cursoEscolar && f.cursoEscolar !== ESTADO.cursoActual; }

/* Una fila por tipo de listado: resume sus listados y se despliega para verlos uno a uno. */
function pintarTabla() {
  var cuerpo = document.getElementById('filasListados');
  cuerpo.textContent = '';
  var filas = ESTADO.filas.filter(function (f) { return !f.cursoEscolar || f.cursoEscolar === CURSO_TABLA; });
  var reales = 0, viejos = 0, expedientes = 0, grupos = [], porClave = {};
  filas.forEach(function (f) {
    if (f.alumnos) expedientes += f.alumnos;
    else if (f.estado !== 'gris') reales++;
    if (f.estado === 'ambar' && !esHistorico(f)) viejos++;
    if (!porClave[f.clave]) { porClave[f.clave] = []; grupos.push(porClave[f.clave]); }
    porClave[f.clave].push(f);
  });
  grupos.forEach(function (g) { cuerpo.appendChild(filaDeGrupo(g)); });
  var partes = [frasePlural(reales, 'listado', 'listados') + ' en ' + CURSO_TABLA,
    viejos ? frasePlural(viejos, 'se ha quedado viejo', 'se han quedado viejos') : 'ninguno se ha quedado viejo'];
  if (expedientes) partes.push(frasePlural(expedientes, 'expediente', 'expedientes'));
  if (ESTADO.pendientes.length) partes.push(ESTADO.pendientes.length + ' sin clasificar');
  document.getElementById('resumen').textContent = partes.join(' · ');
}

function etiquetaDe(f) { return esHistorico(f) ? 'Histórico' : f.etiqueta; }

function filaDeGrupo(g) {
  var f = g[0], n = g.length;
  var ambar = g.some(function (x) { return x.estado === 'ambar' && !esHistorico(x); });
  var reales = g.filter(function (x) { return x.estado !== 'gris'; });
  var clase = esHistorico(f) && !ambar ? 'fila-historico' : 'fila-' + (ambar ? 'ambar' : (reales.length ? 'verde' : 'gris'));
  var tr = el('tr', clase);
  var td = el('td');
  td.textContent = f.nombre + (n > 1 ? ' · ' + n + ' listados' : (f.ambito || f.periodo ? ' · ' + [f.ambito, f.periodo].filter(Boolean).join(' · ') : ''));
  var etiqueta = ambar ? 'Se ha quedado viejo' : (reales.length ? etiquetaDe(reales[0]) : f.etiqueta);
  if (etiqueta) td.appendChild(el('span', 'etiqueta', etiqueta));
  var trae = n > 1 ? frasePlural(n, 'listado', 'listados') + ': ' + g.map(function (x) { return [x.ambito, x.periodo].filter(Boolean).join(' · '); }).filter(Boolean).join(', ') : f.trae;
  tr.appendChild(td);
  tr.appendChild(el('td', '', f.deCuando));
  tr.appendChild(el('td', '', trae));
  tr.appendChild(el('td', '', f.usan));
  Array.prototype.forEach.call(tr.children, function (c) { c.title = c.textContent; });
  if (f.alumnos) { tr.className += ' fila-alumnos'; tr.onclick = function () { alternarAlumnos(tr, f); }; }
  else if (reales.length) { tr.className += ' fila-grupo'; tr.onclick = function () { alternarGrupo(tr, reales); }; }
  return tr;
}

function alternarGrupo(tr, lista) {
  var siguiente = tr.nextSibling;
  if (siguiente && siguiente.className === 'sub') { siguiente.parentNode.removeChild(siguiente); return; }
  var fila = el('tr', 'sub'), td = el('td');
  td.colSpan = 4;
  lista.forEach(function (f) { td.appendChild(lineaDeListado(f)); });
  fila.appendChild(td);
  fila.onclick = function (e) { e.stopPropagation(); };
  tr.parentNode.insertBefore(fila, tr.nextSibling);
}

function lineaDeListado(f) {
  var l = el('div', 'sublinea');
  var nom = el('span', 'nom');
  var a = el('a', '', [f.ambito, f.periodo].filter(Boolean).join(' · ') || f.nombre); a.href = f.url; a.target = '_blank';
  nom.appendChild(a);
  var etiqueta = etiquetaDe(f);
  if (etiqueta) nom.appendChild(el('span', 'etiqueta', etiqueta));
  l.appendChild(nom);
  l.appendChild(el('span', '', f.deCuando));
  l.appendChild(el('span', '', f.trae));
  if (f.subidoPor) l.appendChild(el('span', '', 'Lo subió ' + f.subidoPor));
  if (f.anteriores) {
    var b = el('button', 'enlace', frasePlural(f.anteriores, 'anterior', 'anteriores'));
    b.onclick = function () { alternarAnteriores(l, f); };
    l.appendChild(b);
  }
  if (f.clave !== 'alumnado') {
    var c = el('button', 'enlace cambiar', 'Cambiar');
    c.onclick = function () {
      c.disabled = true;
      servidor('webCambiarFicha', f.clave, f.variante).then(function (r) {
        cargarEstado().then(function () { mostrarPendiente(r.id); });
      }, function (x) { c.disabled = false; avisar(x.message, true); });
    };
    l.appendChild(c);
  }
  return l;
}

function alternarAnteriores(linea, f) {
  var siguiente = linea.nextSibling;
  if (siguiente && siguiente.className === 'ant') { siguiente.parentNode.removeChild(siguiente); return; }
  servidor('webAnteriores', f.clave, f.variante).then(function (lista) {
    var d = el('div', 'ant');
    lista.forEach(function (v) {
      var p = el('div');
      var a = el('a', '', v.nombre); a.href = v.url; a.target = '_blank';
      p.appendChild(document.createTextNode(v.fecha + ' · ')); p.appendChild(a);
      d.appendChild(p);
    });
    linea.parentNode.insertBefore(d, linea.nextSibling);
  }, function (x) { avisar(x.message, true); });
}

function pintarMovimientos(lista) {
  var ul = document.getElementById('movimientos');
  ul.textContent = '';
  if (!lista.length) ul.appendChild(el('li', '', 'Todavía no ha pasado nada.'));
  lista.forEach(function (m) {
    var li = el('li', m.estado);
    li.appendChild(el('span', 'cuando', m.cuando));
    li.appendChild(document.createTextNode(m.texto));
    ul.appendChild(li);
  });
}

/* «Últimos movimientos» no está en la pantalla hasta pulsar el botón. */
function prepararMovimientos() {
  var panel = document.getElementById('panelMovimientos');
  document.getElementById('verMovimientos').onclick = function () { panel.hidden = !panel.hidden; };
  document.getElementById('cerrarMovimientos').onclick = function () { panel.hidden = true; };
}

var ES_DUENO = false;

var TEXTO_LANZADOR_VIEJO = 'Hay que pegar el lanzador nuevo.';
var PASOS_LANZADOR_VIEJO = [
  'Abre el enlace del lanzador (https://github.com/fmargon780/centro-de-datos-ies/blob/main/Lanzador.gs) y cópialo.',
  'En script.google.com, proyecto «Centro de datos», borra lo que hay, pega y guarda.',
  'Implementar → Gestionar implementaciones → el lápiz → Versión: Nueva versión → Implementar.',
  'Si pide «Autorizar acceso», acéptalo.',
  'Recarga esta página.'
];

function pintarEstado(e) {
  ES_DUENO = !!e.esDueno;
  document.getElementById('quien').textContent = e.correo + (e.esDueno ? ' (dueño)' : '') + ' · ' + e.version;
  if (e.lanzadorViejo) {
    document.getElementById('carpeta').textContent = '';
    document.getElementById('rejilla').style.display = 'none';
    document.getElementById('zona').style.display = 'none';
    if (e.esDueno) pintarPasos(TEXTO_LANZADOR_VIEJO, PASOS_LANZADOR_VIEJO);
    else pintarPasos('El Centro de datos se está actualizando. Avisa a quien lo lleva.', []);
    return;
  }
  pintarNombreCentro(e.centroNombre || '');
  soporteDatos(e.correo, e.version);
  if (e.carpeta) pintarCarpetaAcceso(e.carpeta);
  pintarCarpeta(e);
  var hay = !!e.filas;
  document.getElementById('rejilla').style.display = hay ? '' : 'none';
  document.getElementById('zona').style.display = hay ? '' : 'none';
  if (!hay) return;
  ESTADO = e;
  pintarCursoZona(e);
  pintarCursoTabla();
  pintarTabla();
  pintarSinClasificar(e.pendientes);
  pintarMovimientos(e.movimientos);
  prepararMovimientos();
  pintarRecolocando(e.recolocando, e.sigue);
  if (e.avisoEntrada) avisar(e.avisoEntrada, true);
  pintarHechos(e.hechos);
  pintarAvisoClave(e.avisoClave);
  pintarClaveFunciona(e.claveFunciona);
  pintarSobrasTutorias(e.sobrasTutorias);
  if (e.hechosQuedan) seguirHechos();
  medirListados();
}

var TEMPORIZADOR_RECOLOCAR = null;

/* Mientras el servidor recoloca lo que ya había: franja con la cuenta, zona apagada, y a preguntar cada 5 segundos hasta que acabe. */
function pintarRecolocando(r, sigue) {
  var franja = document.getElementById('recolocando'), zona = document.getElementById('zona');
  clearTimeout(TEMPORIZADOR_RECOLOCAR);
  franja.hidden = !r;
  zona.classList.toggle('apagada', !!r);
  document.getElementById('elegir').disabled = !!r;
  if (!r) { if (sigue) TEMPORIZADOR_RECOLOCAR = setTimeout(cargarEstado, 5000); return; }
  franja.textContent = 'Estoy recolocando lo que ya había guardado: ' + r.hechos + ' de ' + r.total + '. Tarda un par de minutos.';
  TEMPORIZADOR_RECOLOCAR = setTimeout(cargarEstado, 5000);
}

/* Una sola vez por página abierta: la tabla se mide a sí misma y cuenta, solo con cifras, qué ha visto (Soporte-estilo, `listados-sin-solapes`). */
var MEDIDO = false;
function medirListados() {
  if (MEDIDO) return;
  MEDIDO = true;
  setTimeout(function () {
    try {
      var visibles = Array.prototype.slice.call(document.querySelectorAll('#listados .cajita, #listados th, #filasListados tr:first-child td, #zona, .cabeza-tabla > *, #carpeta, #resultados'))
        .map(function (x) { return { x: x, r: x.getBoundingClientRect() }; }).filter(function (o) { return o.r.width > 0 && o.r.height > 0; });
      var solapes = 0, desbordes = 0, ancho = window.innerWidth;
      visibles.forEach(function (a, i) {
        if (a.r.right > ancho + 1) desbordes++;
        for (var k = i + 1; k < visibles.length; k++) {
          var b = visibles[k];
          if (a.x.contains(b.x) || b.x.contains(a.x)) continue;
          if (Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) > 1 && Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > 1) solapes++;
        }
      });
      if (document.documentElement.scrollWidth > ancho + 1) desbordes++;
      servidor('webListadosMedidas', { filas: document.querySelectorAll('#filasListados tr').length, cajitas: document.querySelectorAll('#hechos .cajita').length, solapes: solapes, desbordes: desbordes, ancho: ancho })
        .then(null, function () { /* se calla */ });
    } catch (e) { /* medir nunca rompe la página */ }
  }, 3000);
}

function cargarEstado() {
  return servidor('webEstado').then(function (e) { pintarEstado(e); return e; }, function (x) {
    document.getElementById('carpeta').textContent = 'No he podido comprobar la carpeta de los datos.';
    avisar(x.message, true);
    return null;
  });
}

/* ==== JsHechos.html ==== */

/* «Datos ya hechos», debajo de la carpeta: una cajita por conjunto, con lo que sabe el servidor (cifras, fechas y sí o no). */
function numeroConPuntos(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function textoDeUnConjunto(c) {
  if (c.atascado) return c.etiqueta + ': lleva un rato sin avanzar. Avisa a soporte.';
  if (c.trabajando) {
    var leidos = c.totalFicheros - c.porLeer;
    return c.etiqueta + ': poniéndose al día' + (c.porLeer ? ' (leído ' + leidos + ' de ' + c.totalFicheros + (c.totalFicheros === 1 ? ' fichero)' : ' ficheros)') : '');
  }
  if (c.consejo) return textoDelConsejo(c);
  if (c.libros !== undefined && c.conjunto === 'libros') return textoDeLibros(c);
  if (c.entero) return textoDelEntero(c);
  if (c.contactos) return textoDeContactos(c);
  var t = c.actuales.map(function (a, i) {
    return (i === 0 ? c.etiqueta + ' del curso ' : 'del curso ') + a.cursoEscolar + ': ' + numeroConPuntos(a.registros) + ' ' + c.cuenta;
  });
  if (c.antiguos !== null) t.push((t.length ? '' : c.etiqueta + ': ') + 'antiguos: ' + numeroConPuntos(c.antiguos));
  if (c.fecha) t.push('del ' + c.fecha);
  if (c.masCursos) t.splice(t.length - (c.fecha ? 1 : 0), 0, 'y ' + c.masCursos + (c.masCursos === 1 ? ' curso más' : ' cursos más'));
  t.push(c.alDia ? 'al día' : 'poniéndose al día');
  if (c.entrega) t.push(c.entrega.nombre + ' entregó lo suyo el ' + c.entrega.fecha);
  if (c.avisos && c.sufijoAvisos) t.push(c.avisos + (c.avisos === 1 ? ' aviso ' : ' avisos ') + c.sufijoAvisos);
  else if (c.avisos) t.push(c.avisos + (c.avisos === 1 ? ' aviso del cruce (se revisa en BD Alumnado)' : ' avisos del cruce (se revisan en BD Alumnado)'));
  return t.join(' · ');
}

/* Los libros de texto: cuántos libros en cuántos niveles, del curso de hoy (o el más reciente). */
function textoDeLibros(c) {
  var k = c.libros;
  if (!k) return c.etiqueta + ': poniéndose al día';
  var t = [c.etiqueta + ' ' + k.cursoEscolar + ': ' + numeroConPuntos(k.libros) + (k.libros === 1 ? ' libro' : ' libros') + ' en ' + numeroConPuntos(k.niveles) + (k.niveles === 1 ? ' nivel' : ' niveles')];
  if (k.masCursos) t.push('y ' + k.masCursos + (k.masCursos === 1 ? ' curso más' : ' cursos más'));
  t.push(c.alDia ? 'al día' : 'poniéndose al día');
  if (c.avisos) t.push(c.avisos + (c.avisos === 1 ? ' aviso ' : ' avisos ') + c.sufijoAvisos);
  return t.join(' · ');
}

/* El Consejo Escolar no va por cursos: periodos, nombramientos y miembros de hoy. */
function textoDelConsejo(c) {
  var k = c.consejo, t = [];
  if (!k.periodos) return c.etiqueta + ': los listados guardados no dicen de qué periodo son.';
  t.push(c.etiqueta + ': ' + numeroConPuntos(k.periodos) + (k.periodos === 1 ? ' periodo' : ' periodos'));
  if (k.nombramientos !== undefined) {
    t.push(numeroConPuntos(k.nombramientos) + (k.nombramientos === 1 ? ' nombramiento' : ' nombramientos'));
    t.push(numeroConPuntos(k.miembrosHoy) + (k.miembrosHoy === 1 ? ' miembro hoy' : ' miembros hoy'));
    if (k.ultimoPeriodo) t.push('último periodo ' + k.ultimoPeriodo);
  }
  if (c.fecha) t.push('del ' + c.fecha);
  t.push(c.alDia ? 'al día' : 'poniéndose al día');
  if (c.avisos) t.push(c.avisos + (c.avisos === 1 ? ' aviso ' : ' avisos ') + c.sufijoAvisos);
  return t.join(' · ');
}

/* Los contactos del profesorado: cuántos y cuántos están escritos a mano (lo demás sale de Séneca). */
function textoDeContactos(c) {
  var k = c.contactos, t = [c.etiqueta + ': ' + numeroConPuntos(k.registros) + (k.registros === 1 ? ' persona' : ' personas')];
  t.push(numeroConPuntos(k.aMano) + ' con algo escrito a mano');
  t.push(c.alDia ? 'al día' : 'poniéndose al día');
  if (c.avisos) t.push(c.avisos + (c.avisos === 1 ? ' aviso ' : ' avisos ') + c.sufijoAvisos);
  return t.join(' · ');
}

/* Un conjunto que entrega entero otra aplicación: cuántos hay, quién los entregó y cuándo. */
function textoDelEntero(c) {
  var k = c.entero, t = [];
  if (k.registros === null) return c.etiqueta + ': poniéndose al día';
  var cuenta = c.etiqueta + ': ' + numeroConPuntos(k.registros);
  if (k.desglose && k.registros) {
    var trozos = k.desglose.map(function (z) { return numeroConPuntos(z.n) + ' ' + (z.n === 1 ? z.uno : z.varios); });
    cuenta += ' (' + (trozos.length > 1 ? trozos.slice(0, -1).join(', ') + ' y ' + trozos[trozos.length - 1] : trozos.join('')) + ')';
  }
  t.push(cuenta);
  t.push(k.entregadas + ' por ' + k.quien + (k.fecha ? ' el ' + k.fecha : ''));
  t.push(c.alDia ? 'al día' : 'poniéndose al día');
  if (c.avisos) t.push(c.avisos + (c.avisos === 1 ? ' aviso ' : ' avisos ') + c.sufijoAvisos);
  return t.join(' · ');
}

/* Una cajita por conjunto: nombre, estado (verde al día, ámbar poniéndose al día, rojo sin avanzar) y cuántos avisos; el detalle se lee entero al pulsarla. */
function cajitaDeHechos(nombre, clase, estado, avisos, detalle, conjunto, nota) {
  var c = el('div', 'cajita ' + clase);
  var lleva = !!(avisos && conjunto);
  if (avisos) c.appendChild(el('span', 'nota', frasePlural(avisos, 'aviso', 'avisos')));
  c.appendChild(el('b', '', nombre));
  c.appendChild(el('span', 'estado', estado));
  if (nota) c.appendChild(el('span', 'estado', '· ' + nota));
  c.appendChild(el('span', 'detalle', detalle));
  c.title = detalle;
  if (lleva) { c.classList.add('con-avisos'); DETALLES_CONJUNTO[conjunto] = detalle; }
  c.onclick = function () { if (lleva) abrirAvisos(conjunto); else c.classList.toggle('abierta'); };
  return c;
}

var DETALLES_CONJUNTO = {};
var ULTIMOS_HECHOS = null;
/* Mientras la pestaña «Avisos» ha contado por su cuenta, las cajitas dicen lo que ella sabe: { conjunto: pendientes }. Un dato nuevo del servidor lo deja sin efecto. */
var AVISOS_PENDIENTES = null;

function pintarHechos(h) {
  ULTIMOS_HECHOS = h; AVISOS_PENDIENTES = null;
  dibujarHechos(h);
}

function dibujarHechos(h) {
  var p = document.getElementById('hechos');
  if (!h) { p.hidden = true; return; }
  var con = (h.conjuntos || []).filter(function (c) { return c.actuales.length || c.antiguos !== null || c.hayFuentes; });
  var total = 0;
  p.textContent = '';
  if (!con.length) p.appendChild(cajitaDeHechos('Datos ya hechos', 'ambar', 'todavía ninguno', 0, 'Datos ya hechos: todavía ninguno. Suelta el listado de alumnado.'));
  con.forEach(function (c) {
    var clase = c.atascado ? 'rojo' : (c.trabajando || !c.alDia ? 'ambar' : 'verde');
    var estado = c.atascado ? 'sin avanzar' : (c.trabajando || !c.alDia ? 'poniéndose al día' : 'al día');
    if (AVISOS_PENDIENTES) c = Object.assign({}, c, { avisos: AVISOS_PENDIENTES[c.conjunto] || 0 });
    total += c.avisos || 0;
    p.appendChild(cajitaDeHechos(c.etiqueta, clase, estado, c.avisos || 0, textoDeUnConjunto(c), c.conjunto, c.monta === 'pagina' ? 'lo monta la página nueva' : (c.monta ? 'lo monta la aplicación' : '')));
  });
  (h.ensayos || []).forEach(function (en) {
    var claseE = en.estado === 'distinta' ? 'rojo' : (en.estado === 'igual' ? 'verde' : 'ambar');
    var estadoE = en.estado === 'distinta' ? 'distinta de la de hoy' : (en.estado === 'igual' ? 'igual que la de hoy' : 'poniéndose al día');
    total += en.avisos || 0;
    p.appendChild(cajitaDeHechos(en.cajita, claseE, estadoE, en.avisos || 0, en.linea, 'ensayo', en.poniendose && (en.estado === 'igual' || en.estado === 'distinta') ? 'poniéndose al día…' : ''));
  });
  document.getElementById('botonAvisos').textContent = total ? 'Avisos (' + total + ')' : 'Avisos';
  if (con.length && h.comprobado) {
    var m = h.comprobado.malos;
    p.appendChild(cajitaDeHechos('Comprobación', m ? 'rojo' : 'verde', m ? 'algo no cuadra' : 'todo bien', 0, 'comprobado: ' + (m ? m + (m === 1 ? ' cosa no cuadra' : ' cosas no cuadran') : 'todo bien')));
  }
  p.hidden = false;
}

/* Los textos de un listado de tutorías que no se han sabido colocar, tal cual: solo se ven aquí. Sin nada que sobre, el bloque no sale. */
function pintarSobrasTutorias(lineas) {
  var d = document.getElementById('sobrasTutorias');
  d.textContent = '';
  d.hidden = !(lineas && lineas.length);
  (lineas || []).forEach(function (t) { var l = document.createElement('span'); l.style.display = 'block'; l.textContent = t; d.appendChild(l); });
}

/* Los datos ya hechos se ponen al día por tandas: la página las pide una tras otra mientras quede trabajo y repinta la línea. */
var HECHOS_EN_MARCHA = false;
function seguirHechos() {
  if (HECHOS_EN_MARCHA) return;
  HECHOS_EN_MARCHA = true;
  (function vuelta() {
    servidor('webHechosSeguir').then(function (r) {
      if (r && r.hechos) { pintarHechos(r.hechos); pintarAvisoClave(r.avisoClave); pintarSobrasTutorias(r.sobrasTutorias); }
      if (r && r.quedan) setTimeout(vuelta, r.ocupada ? 10000 : 0); else HECHOS_EN_MARCHA = false;
    }, function (x) { HECHOS_EN_MARCHA = false; avisar(x.message, true); });
  })();
}

/* ==== JsClave.html ==== */

/* La clave de GitHub (fila 33), solo para el dueño: una línea que dice qué pasa, el botón «Ver los pasos» y una ventana con los pasos del caso y del tipo de clave que tiene. */
var PASOS_GITHUB_ENTRAR = [
  'Entra en github.com con la cuenta dueña del proyecto (la que tiene el repositorio «centro-de-datos-ies»).',
  'Pulsa tu foto, arriba a la derecha, y luego «Settings».',
  'En el menú de la izquierda, abajo del todo, pulsa «Developer settings» y después «Personal access tokens».'
];
var PASOS_DE_CLAVE = {
  clasica: {
    titulo: 'Tu clave es de las clásicas («Tokens (classic)»)',
    permiso: ['Pulsa «Tokens (classic)».', 'Pulsa la clave «apps-script-centro-de-datos».', 'Marca la casilla «repo». Las de debajo se marcan solas.', 'Abajo del todo, pulsa «Update token».'],
    nueva: ['Pulsa «Tokens (classic)».', 'Pulsa la clave «apps-script-centro-de-datos» (si no está, pulsa «Generate new token (classic)» y ponle ese nombre).', 'Pulsa «Regenerate token». Si no existe, usa «Generate new token (classic)».',
      'Pon una caducidad larga («No expiration» o, si no sale, la más larga) y marca la casilla «repo».', 'Abajo, pulsa «Generate token» (o «Regenerate token») y copia la clave: empieza por «ghp_» y solo se ve ahora.']
  },
  nueva: {
    titulo: 'Tu clave es de las nuevas («Fine-grained tokens»)',
    permiso: ['Pulsa «Fine-grained tokens».', 'Pulsa la clave del Centro de datos.', 'En «Repository access», comprueba que sale el repositorio «fmargon780/centro-de-datos-ies»; si no, elige «Only select repositories» y añádelo.',
      'En «Repository permissions», busca «Contents» y ponlo en «Read and write».', 'Abajo, pulsa «Save» (o «Update»).'],
    nueva: ['Pulsa «Fine-grained tokens».', 'Pulsa la clave del Centro de datos y luego «Regenerate token» (si no está, usa «Generate new token»).', 'Pon la caducidad más larga que deje.',
      'En «Repository access», que salga «fmargon780/centro-de-datos-ies», y en «Repository permissions» pon «Contents» en «Read and write».', 'Pulsa «Generate token» (o «Regenerate token») y copia la clave: empieza por «github_pat_» y solo se ve ahora.']
  }
};
var PASOS_PEGAR_CLAVE = [
  'Entra en script.google.com con la cuenta del instituto (la que acaba en @g.educaand.es) y abre el proyecto «Centro de datos».',
  'En el menú de la izquierda, pulsa la rueda «Configuración del proyecto» («Project Settings»).',
  'Baja hasta «Propiedades de la secuencia de comandos» («Script Properties») y pulsa «Editar propiedades» («Edit script properties»).',
  'En la fila «GH_CLAVE», borra lo que hay y pega la clave nueva. No toques las demás filas.',
  'Pulsa «Guardar propiedades» («Save script properties»).'
];
var PASO_FINAL_CLAVE = 'Vuelve a abrir esta página. Si todo ha ido bien, verás «La clave funciona».';

/* Los bloques de pasos de un caso: [{ titulo, pasos }]. */
function pasosDeClave(caso, tipo) {
  var tipos = tipo === 'clasica' || tipo === 'nueva' ? [tipo] : ['clasica', 'nueva'];
  var bloques = [];
  tipos.forEach(function (t) {
    var d = PASOS_DE_CLAVE[t];
    if (caso === 'sin-escribir') {
      bloques.push({ titulo: tipos.length > 1 ? d.titulo : '', pasos: PASOS_GITHUB_ENTRAR.concat(d.permiso, [PASO_FINAL_CLAVE]) });
    } else {
      bloques.push({ titulo: tipos.length > 1 ? d.titulo : '', pasos: PASOS_GITHUB_ENTRAR.concat(d.nueva) });
    }
  });
  if (caso !== 'sin-escribir') bloques.push({ titulo: 'Después, pega la clave nueva donde la lee el Centro de datos', pasos: PASOS_PEGAR_CLAVE.concat([PASO_FINAL_CLAVE]) });
  return bloques;
}

function cerrarPasosClave() {
  var v = document.getElementById('ventanaClave');
  if (v) v.remove();
}

/* La ventana: a todo el ancho que haga falta, con su propio desplazamiento, sin cortar nada. */
function abrirPasosClave(av) {
  cerrarPasosClave();
  var fondo = el('div', 'ventana-fondo');
  fondo.id = 'ventanaClave';
  fondo.onclick = function (ev) { if (ev.target === fondo) cerrarPasosClave(); };
  var caja = el('div', 'ventana-caja');
  var cierra = el('button', 'accion cerrar-ventana', 'Cerrar');
  cierra.onclick = cerrarPasosClave;
  caja.appendChild(cierra);
  caja.appendChild(el('h3', '', 'Clave de GitHub'));
  caja.appendChild(el('p', '', av.frase || ''));
  pasosDeClave(av.caso, av.tipo).forEach(function (b) {
    if (b.titulo) caja.appendChild(el('h4', '', b.titulo));
    var ol = document.createElement('ol');
    b.pasos.forEach(function (p) { ol.appendChild(el('li', '', p)); });
    caja.appendChild(ol);
  });
  fondo.appendChild(caja);
  document.body.appendChild(fondo);
}
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrarPasosClave(); });

function pintarAvisoClave(av) {
  var d = document.getElementById('avisoClave');
  d.textContent = '';
  d.hidden = !av;
  if (!av) return;
  d.appendChild(el('span', 'clave-frase', av.frase));
  var b = el('button', 'accion', 'Ver los pasos');
  b.onclick = function () { abrirPasosClave(av); };
  d.appendChild(b);
}

/* «La clave funciona»: una línea verde breve, que se va sola. */
function pintarClaveFunciona(ver) {
  var d = document.getElementById('claveFunciona');
  d.hidden = !ver;
  if (ver) setTimeout(function () { d.hidden = true; }, 8000);
}

/* ==== JsAvisos.html ==== */

/* La pestaña «Avisos»: una línea por aviso de los datos ya hechos, agrupados por conjunto. «Ya lo he visto» lo pasa a «Revisados» para todos los que entran. */
var AVISOS = null;
var FILTRO_AVISOS = '';
var CARGANDO_AVISOS = false;

/* Desde una cajita de «Datos ya hechos»: la pestaña, filtrada por ese conjunto. */
function abrirAvisos(conjunto) {
  FILTRO_AVISOS = conjunto || '';
  irAPestana('pestanaAvisos');
  if (AVISOS) pintarAvisos();
}

function cargarAvisos() {
  if (CARGANDO_AVISOS) return;
  CARGANDO_AVISOS = true;
  servidor('webAvisos').then(function (r) {
    CARGANDO_AVISOS = false;
    AVISOS = r;
    pintarAvisos();
    ajustarCajitas();
  }, function (x) {
    CARGANDO_AVISOS = false;
    document.getElementById('listaDeAvisos').textContent = 'No he podido leer los avisos.';
    avisar(x.message, true);
  });
}

/* Las cajitas y la pestaña cuentan solo los que esperan. */
function ajustarCajitas() {
  var n = {};
  AVISOS.avisos.forEach(function (a) { if (!a.vistoPor) n[a.conjunto] = (n[a.conjunto] || 0) + 1; });
  AVISOS_PENDIENTES = n;
  if (ULTIMOS_HECHOS) dibujarHechos(ULTIMOS_HECHOS);
}

function conjuntosDeAvisos() {
  var vistos = {}, lista = [];
  AVISOS.avisos.forEach(function (a) {
    if (!vistos[a.conjunto]) { vistos[a.conjunto] = { conjunto: a.conjunto, titulo: a.donde.split(' · ')[0], pendientes: 0, revisados: 0 }; lista.push(vistos[a.conjunto]); }
    vistos[a.conjunto][a.vistoPor ? 'revisados' : 'pendientes']++;
  });
  return lista;
}

function pintarFiltroAvisos(conjuntos) {
  var s = document.getElementById('filtroAvisos');
  s.textContent = '';
  var todos = conjuntos.reduce(function (n, c) { return n + c.pendientes; }, 0);
  s.appendChild(new Option('Todos los conjuntos (' + todos + ')', ''));
  conjuntos.forEach(function (c) { s.appendChild(new Option(c.titulo + ' (' + c.pendientes + ')', c.conjunto)); });
  if (FILTRO_AVISOS && !conjuntos.some(function (c) { return c.conjunto === FILTRO_AVISOS; })) FILTRO_AVISOS = '';
  s.value = FILTRO_AVISOS;
  s.onchange = function () { FILTRO_AVISOS = s.value; pintarAvisos(); };
}

function lineaDeAviso(a, revisado) {
  var l = el('div', 'aviso-linea' + (revisado ? ' revisado' : ''));
  l.appendChild(el('span', 'quien', a.quien));
  l.appendChild(el('span', 'que', a.que));
  l.appendChild(el('span', 'donde', a.donde + (revisado && a.vistoCuando ? ' · visto el ' + a.vistoCuando.split(' ')[0] : '')));
  if (a.clave) {
    var v = el('button', 'accion', 'Ver los pasos');
    v.onclick = function () { abrirPasosClave({ caso: a.clave.caso, tipo: a.clave.tipo, frase: a.que }); };
    l.appendChild(v);
    return l;
  }
  if (a.diagnostico) return l;
  var b = el('button', 'accion', revisado ? 'Volver a pendientes' : 'Ya lo he visto');
  b.onclick = function () {
    b.disabled = true;
    servidor('webAvisoVisto', a.huella, a.conjunto, !revisado).then(function (r) {
      if (revisado) { delete a.vistoPor; delete a.vistoCuando; } else { a.vistoPor = r.quien || 'tú'; a.vistoCuando = r.cuando || ''; }
      pintarAvisos();
      ajustarCajitas();
    }, function (x) { b.disabled = false; avisar(x.message, true); });
  };
  l.appendChild(b);
  return l;
}

function pintarAvisos() {
  var lista = document.getElementById('listaDeAvisos'), rev = document.getElementById('listaRevisados');
  lista.textContent = ''; rev.textContent = '';
  var conjuntos = conjuntosDeAvisos();
  pintarFiltroAvisos(conjuntos);
  var detalle = document.getElementById('detalleAvisos');
  detalle.textContent = FILTRO_AVISOS ? (DETALLES_CONJUNTO[FILTRO_AVISOS] || '') : '';
  detalle.hidden = !detalle.textContent;
  var vistos = AVISOS.avisos.filter(function (a) { return !FILTRO_AVISOS || a.conjunto === FILTRO_AVISOS; });
  var pendientes = vistos.filter(function (a) { return !a.vistoPor; }), revisados = vistos.filter(function (a) { return a.vistoPor; });
  document.getElementById('resumenAvisos').textContent = pendientes.length ? frasePlural(pendientes.length, 'aviso pendiente', 'avisos pendientes') : 'ningún aviso pendiente';
  if (AVISOS.incompleto) lista.appendChild(el('p', 'nota-simple', 'Alguna parte de los datos no se ha podido leer: puede que falten avisos.'));
  if (!pendientes.length) lista.appendChild(el('p', 'nota-simple', 'No hay avisos pendientes.'));
  agrupar(pendientes, lista, false);
  agrupar(revisados, rev, true);
  var det = document.getElementById('revisadosAvisos');
  det.hidden = !revisados.length;
  document.getElementById('resumenRevisados').textContent = 'Revisados (' + revisados.length + ')';
}

/* Un bloque por conjunto, con su cuenta, y debajo sus avisos. */
function agrupar(avisos, destino, revisado) {
  var orden = [], porConjunto = {};
  avisos.forEach(function (a) {
    if (!porConjunto[a.conjunto]) { porConjunto[a.conjunto] = []; orden.push(a.conjunto); }
    porConjunto[a.conjunto].push(a);
  });
  orden.forEach(function (c) {
    var g = porConjunto[c];
    var caja = el('div', 'aviso-grupo');
    caja.appendChild(el('h3', '', g[0].donde.split(' · ')[0] + ' · ' + frasePlural(g.length, revisado ? 'revisado' : 'pendiente', revisado ? 'revisados' : 'pendientes')));
    g.forEach(function (a) { caja.appendChild(lineaDeAviso(a, revisado)); });
    destino.appendChild(caja);
  });
}

/* ==== JsConsultar.html ==== */

/* La pestaña «Consultar» (fila 99): la lista de un conjunto de datos ya hechos, con las columnas y los filtros que se elijan, que se imprime en una hoja preparada y se saca a Excel.
   Solo lee. Lo delicado (documentos, teléfonos, direcciones, correos propios, necesidades educativas…) se ve aquí y no sale al imprimir ni a Excel (Consultar.gs decide qué es delicado).
   Las columnas y los filtros se aplican aquí mismo (ConsultarFilas.gs); el servidor solo trae la parte elegida. */
var CONSULTA = { carga: null, idColumnas: '', visibles: [], marcadas: {}, filtros: [{ ruta: '', op: 'contiene', texto: '' }], centro: null, medido: false, abierta: false, cursoAntes: null,
  vista: 'recuento', casilla: null, cargaLista: null, conAnulados: false };   // fila 100: se abre en el recuento; la lista sale al pulsar una cifra (JsRecuento.html)

function consultaDef() { return consultaDefinicion_(CONSULTA.carga.id); }
function consultaOpcion() { return CONSULTA.carga.opciones.filter(function (o) { return o.id === CONSULTA.carga.id; })[0]; }
function consultaPosibles() { return consultaColumnas_(CONSULTA.carga.campos, consultaDef()); }
/* La carga de la lista: la del curso elegido o, si viene de una casilla con varios cursos, todas las partes (entonces no se usa la fecha). */
function cargaDeLista() { return CONSULTA.cargaLista || CONSULTA.carga; }
function consultaEstado() {
  var varias = !!cargaDeLista().cargas;
  return { columnas: CONSULTA.visibles.filter(function (r) { return CONSULTA.marcadas[r]; }), filtros: CONSULTA.filtros, dia: varias ? '' : document.getElementById('consFecha').value,
    casilla: CONSULTA.vista === 'lista' ? CONSULTA.casilla : null, conAnulados: CONSULTA.conAnulados };
}

/* Con las columnas de siempre de cada conjunto (las que ya tiene la parte). */
function consultaColumnasPorDefecto() {
  CONSULTA.idColumnas = CONSULTA.carga.id;
  CONSULTA.visibles = consultaDef().ver.slice();
  CONSULTA.marcadas = {};
  CONSULTA.visibles.forEach(function (r) { CONSULTA.marcadas[r] = true; });
  CONSULTA.filtros = [{ ruta: '', op: 'contiene', texto: '' }];
  document.getElementById('consGrupo').checked = false;
  if (window.recuentoPorDefecto) recuentoPorDefecto();
}

function consultaPedir(id, curso, periodo) {
  return servidor('webConsultarLeer', id || null, curso || '', periodo || '').then(function (c) {
    CONSULTA.carga = c; CONSULTA.casilla = null; CONSULTA.cargaLista = null; CONSULTA.conAnulados = false;
    if (CONSULTA.idColumnas !== c.id) consultaColumnasPorDefecto();
    pintarConsulta();
  }, function (x) { avisar(x.message, true); });
}

/* El curso que se pide: el que contiene la fecha si hay fecha; al quitarla, vuelve el que estaba elegido antes. */
function cursoPedidoConsulta() {
  var dia = document.getElementById('consFecha').value, caja = document.getElementById('consCurso');
  if (dia) { if (CONSULTA.cursoAntes === null) CONSULTA.cursoAntes = caja.value; return consultaCursoDeDia_(dia); }
  var c = CONSULTA.cursoAntes !== null ? CONSULTA.cursoAntes : caja.value;
  CONSULTA.cursoAntes = null;
  return c;
}

function cargarConsultar() {
  if (!CONSULTA.abierta) { CONSULTA.abierta = true; return consultaPedir(null, '', ''); }
  return cambiaConsulta();
}

/* Lo que se pide al elegir otro conjunto, curso, periodo o fecha. */
function cambiaConsulta() {
  var c = CONSULTA.carga;
  return consultaPedir(c ? document.getElementById('consDatos').value : null, cursoPedidoConsulta(), document.getElementById('consPeriodo').value);
}

function llenarSelect(sel, valores, elegido, texto) {
  sel.textContent = '';
  valores.forEach(function (v) { var o = el('option', '', texto(v)); o.value = v; sel.appendChild(o); });
  sel.value = elegido;
}

function pintarBarraConsulta() {
  var c = CONSULTA.carga, op = consultaOpcion(), dia = document.getElementById('consFecha').value;
  llenarSelect(document.getElementById('consDatos'), c.opciones.map(function (o) { return o.id; }), c.id, function (v) { return c.opciones.filter(function (o) { return o.id === v; })[0].nombre; });
  var cursos = op && op.modo === 'curso' ? op.cursos.slice() : [];
  if (c.curso && cursos.indexOf(c.curso) === -1) cursos.unshift(c.curso);
  document.getElementById('consCursoCaja').hidden = !(op && op.modo === 'curso');
  llenarSelect(document.getElementById('consCurso'), cursos, c.curso || '', function (v) { return v + (v === c.cursoHoy ? ' (hoy)' : ''); });
  var variosCursos = window.recuentoUsaCurso && recuentoUsaCurso();
  document.getElementById('consCurso').disabled = !!dia || variosCursos;
  document.getElementById('consPeriodoCaja').hidden = !(op && op.modo === 'periodo');
  llenarSelect(document.getElementById('consPeriodo'), op && op.modo === 'periodo' ? op.periodos : [''], c.periodo, function (v) { return v === '' ? 'Historial (todos)' : v; });
  var conFecha = !!op && (op.vigencia || op.modo === 'curso');
  document.getElementById('consFechaCaja').hidden = !conFecha;
  document.getElementById('consFecha').disabled = variosCursos;
  document.getElementById('consSinCurso').hidden = !variosCursos;
  if (!conFecha) document.getElementById('consFecha').value = '';
  document.getElementById('consGrupoCaja').hidden = !(op && op.grupo) || CONSULTA.vista !== 'lista';
  document.getElementById('consGrupo').disabled = !(op && op.grupo);
}

function pintarFiltrosConsulta() {
  var caja = document.getElementById('consFiltros'), posibles = consultaPosibles();
  caja.textContent = '';
  CONSULTA.filtros.forEach(function (f, i) {
    var fila = el('span', 'consulta-filtro'), col = el('select'), op = el('select'), texto = el('input'), quitar = el('button', 'accion', '×');
    col.setAttribute('aria-label', 'Filtrar por la columna'); op.setAttribute('aria-label', 'Cómo filtrar'); texto.setAttribute('aria-label', 'Texto del filtro');
    var vacia = el('option', '', 'columna…'); vacia.value = ''; col.appendChild(vacia);
    posibles.forEach(function (p) { var o = el('option', '', p.nombre); o.value = p.ruta; col.appendChild(o); });
    col.value = f.ruta;
    [['contiene', 'contiene'], ['igual', 'es igual a'], ['vacio', 'está vacío']].forEach(function (x) { var o = el('option', '', x[1]); o.value = x[0]; op.appendChild(o); });
    op.value = f.op; texto.type = 'text'; texto.value = f.texto; texto.placeholder = 'texto'; texto.hidden = f.op === 'vacio';
    quitar.type = 'button'; quitar.title = 'Quitar este filtro'; quitar.setAttribute('aria-label', 'Quitar este filtro');
    col.onchange = function () { f.ruta = col.value; repintarConsulta(); };
    op.onchange = function () { f.op = op.value; texto.hidden = f.op === 'vacio'; repintarConsulta(); };
    texto.oninput = function () { f.texto = texto.value; repintarConsulta(); };
    quitar.onclick = function () { CONSULTA.filtros.splice(i, 1); if (!CONSULTA.filtros.length) CONSULTA.filtros.push({ ruta: '', op: 'contiene', texto: '' }); pintarFiltrosConsulta(); repintarConsulta(); };
    [col, op, texto, quitar].forEach(function (x) { fila.appendChild(x); });
    caja.appendChild(fila);
  });
}

/* Marcar una columna de otra tabla cambia a esa tabla: las de la anterior se desmarcan. */
function marcarColumnaConsulta(ruta, si) {
  var col = consultaPosibles().filter(function (c) { return c.ruta === ruta; })[0];
  CONSULTA.marcadas[ruta] = si;
  if (si && col && col.tabla) {
    consultaPosibles().forEach(function (c) { if (c.tabla && c.tabla !== col.tabla) CONSULTA.marcadas[c.ruta] = false; });
  }
}

function pintarColumnasConsulta() {
  var caja = document.getElementById('consPastillas'), posibles = consultaPosibles(), porRuta = {};
  posibles.forEach(function (p) { porRuta[p.ruta] = p; });
  caja.textContent = '';
  CONSULTA.visibles.filter(function (r) { return porRuta[r]; }).forEach(function (r) {
    var p = porRuta[r], b = el('button', 'pastilla' + (CONSULTA.marcadas[r] ? ' marcada' : '') + (p.delicada ? ' ambar' : '') + (p.enlace ? ' enlazada' : ''), p.nombre + (p.delicada ? ' (solo en pantalla)' : ''));
    b.type = 'button'; b.title = p.frase; b.dataset.ruta = r; b.setAttribute('aria-pressed', CONSULTA.marcadas[r] ? 'true' : 'false');
    b.onclick = function () { marcarColumnaConsulta(r, !CONSULTA.marcadas[r]); pintarColumnasConsulta(); pintarTablaConsulta(); };
    caja.appendChild(b);
  });
  var mas = document.getElementById('consAnadir');
  mas.textContent = '';
  var primera = el('option', '', '+ añadir'); primera.value = ''; mas.appendChild(primera);
  var grupos = {};   // fila 101: las columnas de otros conjuntos, agrupadas por el conjunto de donde vienen
  posibles.filter(function (p) { return CONSULTA.visibles.indexOf(p.ruta) === -1; }).forEach(function (p) {
    var o = el('option', '', p.nombre + (p.delicada ? ' (solo en pantalla)' : '')); o.value = p.ruta; o.title = p.frase;
    if (!p.enlace) { mas.appendChild(o); return; }
    if (!grupos[p.conjunto]) { grupos[p.conjunto] = document.createElement('optgroup'); grupos[p.conjunto].label = 'De ' + p.conjunto + ' (enlazado)'; mas.appendChild(grupos[p.conjunto]); }
    grupos[p.conjunto].appendChild(o);
  });
  mas.value = '';
}

function pintarTablaConsulta() {
  var c = cargaDeLista();
  if (enlacesPendientes(c)) {
    document.getElementById('consCuenta').textContent = 'Cargando los datos de los otros conjuntos…';
    cargarEnlaces(c).then(function () { if (CONSULTA.vista === 'lista') pintarTablaConsulta(); });
    return null;
  }
  pintarAvisosEnlaces(c);
  var estado = consultaEstado(), t = consultaTabla_(c, estado), m = consultaSalida_(c, estado, document.getElementById('consGrupo').checked, c.hoy);
  var cab = document.getElementById('consCabeza'), cuerpo = document.getElementById('consCuerpo');
  cab.textContent = ''; cuerpo.textContent = '';
  var tr = el('tr');
  t.columnas.forEach(function (col) { var th = el('th', col.delicada ? 'ambar' : '', col.titulo); th.title = col.frase; tr.appendChild(th); });
  cab.appendChild(tr);
  var trozo = document.createDocumentFragment();
  t.lineas.forEach(function (l) {
    var f = el('tr');
    l.textos.forEach(function (x, i) { f.appendChild(el('td', t.columnas[i].delicada ? 'ambar' : '', x)); });
    trozo.appendChild(f);
  });
  cuerpo.appendChild(trozo);
  var avisos = document.getElementById('consAvisos');
  avisos.hidden = !c.aviso.length; avisos.textContent = c.aviso.join(' ');
  var quita = document.getElementById('consQuitar');
  quita.hidden = !m.avisoQuitadas; quita.textContent = m.avisoQuitadas;
  document.getElementById('consCuenta').textContent = c.hay ? m.cuenta : '';
  document.getElementById('consHojas').textContent = c.hay ? 'Al imprimir saldrían ' + consultaFraseHojas_(m.hojas) + '.' : '';
  document.getElementById('consSinColumnas').hidden = !c.hay || t.columnas.length > 0;
  return t;
}

/* Se vuelve a pintar lo que se está viendo (los filtros de arriba valen para el recuento y para la lista). */
function repintarConsulta() {
  if (CONSULTA.vista === 'lista') pintarTablaConsulta(); else pintarRecuento();
}

function pintarVista() {
  var lista = CONSULTA.vista === 'lista';
  document.getElementById('consLista').hidden = !lista;
  document.getElementById('consRecuento').hidden = lista;
  var op = consultaOpcion();
  document.getElementById('consGrupoCaja').hidden = !(op && op.grupo) || !lista;
  document.getElementById('recVolver').hidden = !lista;
  var cas = document.getElementById('recCasilla');
  cas.hidden = !(lista && CONSULTA.casilla);
  if (CONSULTA.casilla) cas.textContent = 'Casilla: ' + CONSULTA.casilla.texto;
  if (lista) { pintarColumnasConsulta(); pintarTablaConsulta(); } else pintarRecuento();
}

function pintarConsulta() {
  var vacio = !CONSULTA.carga.id;
  document.getElementById('consVacio').hidden = !vacio;
  document.getElementById('consContenido').hidden = vacio;
  if (vacio) return;
  pintarBarraConsulta(); pintarFiltrosConsulta();
  pintarVista();
}

/* La hoja preparada: datos del centro, título, fecha, filtros y la tabla; una hoja por grupo si se marca; al pie, lo que se ha quitado y que lleva datos personales. */
function hojaDeConsulta(m, centro, grupo, aparte) {
  var h = el('div', 'hoja');
  var linea = [centro.codigo ? 'Código ' + centro.codigo : '', centro.direccion, (centro.localidad || '') + (centro.localidad && centro.provincia ? ' (' + centro.provincia + ')' : ''), centro.telefono ? 'Tel. ' + centro.telefono : ''].filter(function (x) { return x; });
  var cabeza = el('div', 'hoja-centro'); cabeza.appendChild(el('strong', '', centro.nombre || 'Centro de datos')); cabeza.appendChild(el('span', '', linea.join(' · ')));
  h.appendChild(cabeza);
  h.appendChild(el('h2', '', m.titulo));
  h.appendChild(el('p', 'hoja-meta', 'Fecha: ' + m.hoy + (m.filtros.length ? ' · Filtros: ' + m.filtros.join('; ') : '')));
  if (aparte) h.appendChild(el('h3', '', 'Grupo: ' + (grupo || 'sin grupo')));
  var tabla = el('table'), cab = el('tr');
  m.columnas.forEach(function (c) { cab.appendChild(el('th', '', c)); });
  tabla.appendChild(el('thead')).appendChild(cab);
  var cuerpo = el('tbody');
  m.lineas.filter(function (l) { return !aparte || l.grupo === grupo; }).forEach(function (l) {
    var f = el('tr'); l.textos.forEach(function (x) { f.appendChild(el('td', '', x)); }); cuerpo.appendChild(f);
  });
  tabla.appendChild(cuerpo); h.appendChild(tabla);
  if (m.avisoQuitadas) h.appendChild(el('p', 'hoja-pie ambar', m.avisoQuitadas));
  (m.avisosEnlaces || []).forEach(function (f) { h.appendChild(el('p', 'hoja-pie ambar', f)); });
  h.appendChild(el('p', 'hoja-pie', m.avisoPersonal));
  return h;
}

function centroDeConsulta() {
  if (CONSULTA.centro) return Promise.resolve(CONSULTA.centro);
  return servidor('webConfiguracionLeer').then(function (r) { CONSULTA.centro = r.centro || {}; return CONSULTA.centro; }, function () { return {}; });
}

function imprimirConsulta() {
  if (CONSULTA.vista !== 'lista') return imprimirRecuento();
  var c = cargaDeLista();
  if (!c || !c.hay) return Promise.resolve();
  var m = consultaSalida_(c, consultaEstado(), document.getElementById('consGrupo').checked, c.hoy);
  m.avisosEnlaces = c.conEnlaces ? consultaAvisosEnlaces_(c, rutasEnUso()) : [];
  return centroDeConsulta().then(function (centro) {
    var caja = document.getElementById('hojaImpresion');
    caja.textContent = '';
    if (m.porGrupo) m.grupos.forEach(function (g) { caja.appendChild(hojaDeConsulta(m, centro, g, true)); });
    else caja.appendChild(hojaDeConsulta(m, centro, '', false));
    document.body.classList.add('imprimiendo');
    window.print();
  });
}
window.addEventListener('afterprint', function () { document.body.classList.remove('imprimiendo'); });

/* El fichero de Excel se arma aquí mismo y se descarga. */
function sacarAExcel() {
  if (CONSULTA.vista !== 'lista') return excelRecuento();
  var c = cargaDeLista();
  if (!c || !c.hay) return;
  var estado = consultaEstado(), m = consultaSalida_(c, estado, false, c.hoy);
  var blob = new Blob([consultaXlsx_(m)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = consultaNombreFichero_(c, estado.dia); a.hidden = true;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
}

document.getElementById('consDatos').onchange = function () { CONSULTA.idColumnas = ''; cambiaConsulta(); };
document.getElementById('consCurso').onchange = function () { cambiaConsulta(); };
document.getElementById('consPeriodo').onchange = function () { cambiaConsulta(); };
document.getElementById('consFecha').onchange = function () { cambiaConsulta(); };
document.getElementById('consGrupo').onchange = function () { pintarTablaConsulta(); };
document.getElementById('consFiltroMas').onclick = function () { CONSULTA.filtros.push({ ruta: '', op: 'contiene', texto: '' }); pintarFiltrosConsulta(); };
document.getElementById('consAnadir').onchange = function () {
  var r = this.value;
  if (!r) return;
  CONSULTA.visibles.push(r); marcarColumnaConsulta(r, true); pintarColumnasConsulta(); pintarTablaConsulta();
};
document.getElementById('consImprimir').onclick = function () { imprimirConsulta(); };
document.getElementById('consExcel').onclick = function () { sacarAExcel(); };

/* ==== JsConsultarGrafico.html ==== */

/* El gráfico del recuento (fila 100): barras, líneas o sectores dibujados aquí mismo en SVG (la página no descarga librerías). Los datos los prepara `consultaGrafico_` (ConsultarGrafico.gs). */
var GRAFICO_COLORES = ['#3b6ea5', '#d9822b', '#4c9a6a', '#b04a6b', '#7b5ea7', '#2e9aa6', '#a39a2a', '#8a5a44', '#5d7184', '#c2573f', '#6a9c3b', '#9b6bb3'];
var SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(nombre, atributos, texto) {
  var e = document.createElementNS(SVG_NS, nombre);
  Object.keys(atributos || {}).forEach(function (k) { e.setAttribute(k, atributos[k]); });
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function colorGrafico(g, i, nombre) { return nombre === 'otros' ? '#9aa5b1' : GRAFICO_COLORES[i % GRAFICO_COLORES.length]; }

function cortarEtiqueta(t, n) { t = String(t); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

/* Un número redondo por encima del máximo para el eje, con cuatro marcas. */
function escalaGrafico(max) {
  if (max <= 0) return { tope: 1, paso: 0.25 };
  var base = Math.pow(10, Math.floor(Math.log(max) / Math.LN10)), tope = base;
  [1, 2, 2.5, 5, 10].some(function (m) { tope = m * base; return tope >= max; });
  return { tope: tope, paso: tope / 4 };
}

function dibujarEjes(svg, g, ancho, alto, m) {
  var esc = escalaGrafico(g.max), h = alto - m.arriba - m.abajo;
  for (var i = 0; i <= 4; i++) {
    var y = alto - m.abajo - h * i / 4;
    svg.appendChild(svgEl('line', { x1: m.izq, x2: ancho - m.der, y1: y, y2: y, stroke: '#d5dbe1', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: m.izq - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#555' }, String(Math.round(esc.paso * i * 100) / 100).replace('.', ',')));
  }
  return { esc: esc, h: h };
}

function dibujarBarras(svg, g, ancho, alto) {
  var m = { izq: 44, der: 8, arriba: 10, abajo: 46 }, e = dibujarEjes(svg, g, ancho, alto, m);
  var cat = (ancho - m.izq - m.der) / g.categorias.length, ns = g.series.length, bw = Math.max(2, Math.min(40, cat * 0.8 / ns));
  g.categorias.forEach(function (c, ci) {
    var x0 = m.izq + cat * ci + (cat - bw * ns) / 2;
    g.series.forEach(function (s, si) {
      var v = s.valores[ci], hh = e.h * v / e.esc.tope;
      var r = svgEl('rect', { x: x0 + bw * si, y: alto - m.abajo - hh, width: bw, height: hh, fill: colorGrafico(g, ns > 1 ? si : ci, ns > 1 ? s.nombre : c), 'data-marca': 'barra' });
      r.appendChild(svgEl('title', {}, c + (ns > 1 ? ' · ' + s.nombre : '') + ': ' + s.textos[ci]));
      svg.appendChild(r);
    });
    var t = svgEl('text', { x: m.izq + cat * ci + cat / 2, y: alto - m.abajo + 14, 'text-anchor': 'middle', 'font-size': 11, fill: '#333' }, cortarEtiqueta(c, Math.max(4, Math.floor(cat / 6.5))));
    t.appendChild(svgEl('title', {}, c));
    svg.appendChild(t);
  });
}

function dibujarLineas(svg, g, ancho, alto) {
  var m = { izq: 44, der: 14, arriba: 10, abajo: 46 }, e = dibujarEjes(svg, g, ancho, alto, m);
  var n = g.categorias.length, paso = n > 1 ? (ancho - m.izq - m.der) / (n - 1) : 0;
  var px = function (i) { return n > 1 ? m.izq + paso * i : m.izq + (ancho - m.izq - m.der) / 2; };
  g.categorias.forEach(function (c, i) {
    var t = svgEl('text', { x: px(i), y: alto - m.abajo + 14, 'text-anchor': 'middle', 'font-size': 11, fill: '#333' }, cortarEtiqueta(c, 10));
    t.appendChild(svgEl('title', {}, c)); svg.appendChild(t);
  });
  g.series.forEach(function (s, si) {
    var color = colorGrafico(g, si, s.nombre), puntos = s.valores.map(function (v, i) { return px(i) + ',' + (alto - m.abajo - e.h * v / e.esc.tope); }).join(' ');
    svg.appendChild(svgEl('polyline', { points: puntos, fill: 'none', stroke: color, 'stroke-width': 2, 'data-marca': 'linea' }));
    s.valores.forEach(function (v, i) {
      var p = svgEl('circle', { cx: px(i), cy: alto - m.abajo - e.h * v / e.esc.tope, r: 3.5, fill: color, 'data-marca': 'punto' });
      p.appendChild(svgEl('title', {}, g.categorias[i] + (g.series.length > 1 ? ' · ' + s.nombre : '') + ': ' + s.textos[i])); svg.appendChild(p);
    });
  });
}

function dibujarSectores(svg, g, ancho, alto) {
  var s = g.series[0], total = s.valores.reduce(function (a, v) { return a + v; }, 0), cx = ancho / 2, cy = alto / 2, r = Math.min(ancho, alto) / 2 - 12, ang = -Math.PI / 2;
  if (total <= 0) return;
  s.valores.forEach(function (v, i) {
    if (v <= 0) return;
    var fin = ang + v / total * Math.PI * 2, grande = fin - ang > Math.PI ? 1 : 0;
    var d = s.valores.filter(function (x) { return x > 0; }).length === 1 ? 'M ' + (cx - r) + ' ' + cy + ' a ' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a ' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0'
      : 'M ' + cx + ' ' + cy + ' L ' + (cx + r * Math.cos(ang)) + ' ' + (cy + r * Math.sin(ang)) + ' A ' + r + ' ' + r + ' 0 ' + grande + ' 1 ' + (cx + r * Math.cos(fin)) + ' ' + (cy + r * Math.sin(fin)) + ' Z';
    var p = svgEl('path', { d: d, fill: colorGrafico(g, i, g.categorias[i]), stroke: '#fff', 'stroke-width': 1, 'data-marca': 'sector' });
    p.appendChild(svgEl('title', {}, g.categorias[i] + ': ' + s.textos[i]));
    svg.appendChild(p);
    ang = fin;
  });
}

/* Pinta el gráfico en `caja`: el SVG y, debajo, la leyenda (las series, o los sectores). */
function dibujarGrafico(caja, g) {
  caja.textContent = '';
  if (!g) return;
  var ancho = 560, alto = 280, svg = svgEl('svg', { viewBox: '0 0 ' + ancho + ' ' + alto, role: 'img', 'aria-label': 'Gráfico del recuento', 'data-tipo': g.tipo, width: '100%' });
  if (g.tipo === 'sectores') dibujarSectores(svg, g, ancho, alto);
  else if (g.tipo === 'lineas') dibujarLineas(svg, g, ancho, alto);
  else dibujarBarras(svg, g, ancho, alto);
  caja.appendChild(svg);
  var ley = el('p', 'grafico-leyenda');
  var items = g.tipo === 'sectores' ? g.categorias.map(function (c, i) { return [c, colorGrafico(g, i, c)]; }) : (g.series.length > 1 ? g.series.map(function (s, i) { return [s.nombre, colorGrafico(g, i, s.nombre)]; }) : []);
  items.forEach(function (x) {
    var c = el('span', 'grafico-clave'), cuadro = el('i'); cuadro.style.background = x[1];
    c.appendChild(cuadro); c.appendChild(document.createTextNode(' ' + x[0])); ley.appendChild(c);
  });
  if (items.length) caja.appendChild(ley);
}

/* ==== JsRecuento.html ==== */

/* El recuento de «Consultar» (fila 100): se arrastran ejes (o se pulsa la pastilla) a filas y columnas, se elige qué calcular y sale la tabla con sus totales y el gráfico. Pulsar una cifra abre la lista de la fila 99
   con esas líneas. Solo lee; los cálculos están en ConsultarRecuento.gs y ConsultarGrafico.gs y el dibujo en JsConsultarGrafico.html. */
var RECUENTO = { filas: [], cols: [], calculo: 'contar', campo: '', base: 'total', tipo: 'auto', todas: null, rec: null, menu: '', cargando: false };

function recuentoDef() { return consultaDefinicion_(CONSULTA.carga.id); }
function recuentoEjes() { return consultaEjes_(CONSULTA.carga.campos, recuentoDef()); }
function recuentoUsaCurso() { return !!CONSULTA.carga && !!CONSULTA.carga.id && recuentoDef().modo !== 'unica' && RECUENTO.filas.concat(RECUENTO.cols).some(function (e) { return e.ruta === '_curso'; }); }

/* Los ejes con los que abre cada conjunto (los de su ficha, o el primero que tenga). */
function recuentoPorDefecto() {
  var def = recuentoDef(), campos = CONSULTA.carga.campos;
  var d = campos && campos.length ? consultaEjesPorDefecto_(campos, def) : { filas: ((def.eje || {}).filas || []).map(function (r) { return { ruta: r, agrupa: 'anio' }; }), cols: ((def.eje || {}).cols || []).map(function (r) { return { ruta: r, agrupa: 'anio' }; }) };
  RECUENTO.filas = d.filas; RECUENTO.cols = d.cols; RECUENTO.calculo = 'contar'; RECUENTO.campo = ''; RECUENTO.base = 'total'; RECUENTO.menu = ''; RECUENTO.tipo = 'auto';
}

function recuentoUsado(ruta) {
  return RECUENTO.filas.filter(function (e) { return e.ruta === ruta; })[0] || RECUENTO.cols.filter(function (e) { return e.ruta === ruta; })[0] || null;
}

/* Pone un eje en «filas», en «columnas» o lo quita («ejes»), antes de otro si se dice. Solo caben ejes de una tabla del registro a la vez. */
function moverEje(ruta, destino, antesDe) {
  var eje = recuentoEjes().filter(function (e) { return e.ruta === ruta; })[0];
  if (!eje) return;
  var previo = recuentoUsado(ruta), agrupa = previo ? previo.agrupa : 'anio';
  RECUENTO.filas = RECUENTO.filas.filter(function (e) { return e.ruta !== ruta; });
  RECUENTO.cols = RECUENTO.cols.filter(function (e) { return e.ruta !== ruta; });
  if (destino === 'filas' || destino === 'cols') {
    var lista = RECUENTO[destino], pos = antesDe ? lista.map(function (e) { return e.ruta; }).indexOf(antesDe) : -1, nuevo = { ruta: ruta, agrupa: agrupa };
    if (pos === -1) lista.push(nuevo); else lista.splice(pos, 0, nuevo);
    if (eje.tabla) {
      var tablaDe = {};
      recuentoEjes().forEach(function (e) { tablaDe[e.ruta] = e.tabla; });
      RECUENTO.filas = RECUENTO.filas.filter(function (e) { return !tablaDe[e.ruta] || tablaDe[e.ruta] === eje.tabla; });
      RECUENTO.cols = RECUENTO.cols.filter(function (e) { return !tablaDe[e.ruta] || tablaDe[e.ruta] === eje.tabla; });
    }
  }
  RECUENTO.menu = '';
  cambioDeEjes();
}

function cambioDeEjes() {
  if (window.pintarBarraConsulta) pintarBarraConsulta();
  pintarRecuento();
}

function pastillaDeEje(e, usado) {
  var texto = e.nombre + (e.tipo === 'fecha' && usado ? (usado.agrupa === 'mes' ? ' (por mes)' : ' (por año)') : '');
  var b = el('button', 'pastilla marcada' + (e.delicada ? ' ambar' : '') + (e.enlace ? ' enlazada' : ''), texto);
  b.type = 'button'; b.draggable = true; b.dataset.ruta = e.ruta;
  b.title = (e.enlace ? 'Viene de ' + e.conjunto + ', enlazado ' + e.motivo.slice(e.motivo.indexOf(', ') + 2) + '. ' : '') + (e.delicada ? 'Dato delicado: las cifras salen exactas, pero la lista no lo enseña al imprimir. ' : '') + 'Arrástrala a filas o columnas, o púlsala para elegir.';
  b.ondragstart = function (ev) { ev.dataTransfer.setData('text/plain', e.ruta); ev.dataTransfer.effectAllowed = 'move'; };
  b.onclick = function () { RECUENTO.menu = RECUENTO.menu === e.ruta ? '' : e.ruta; pintarEjes(); };
  return b;
}

function menuDeEje(e, usado) {
  var m = el('span', 'rec-menu');
  var op = function (texto, hecho) { var b = el('button', 'accion', texto); b.type = 'button'; b.onclick = hecho; m.appendChild(b); };
  op('A filas', function () { moverEje(e.ruta, 'filas'); });
  op('A columnas', function () { moverEje(e.ruta, 'cols'); });
  if (usado) op('Quitar', function () { moverEje(e.ruta, 'ejes'); });
  if (e.tipo === 'fecha' && usado) {
    op('Por año', function () { fijarAgrupa(e.ruta, 'anio'); });
    op('Por mes', function () { fijarAgrupa(e.ruta, 'mes'); });
  }
  return m;
}

function fijarAgrupa(ruta, agrupa) {
  var u = recuentoUsado(ruta);
  if (u) u.agrupa = agrupa;
  RECUENTO.menu = '';
  cambioDeEjes();
}

/* Las pastillas de «Ejes» (los que no están en uso) y las de las dos cajas, con el menú abierto si toca. */
function pintarEjes() {
  var ejes = recuentoEjes(), porRuta = {};
  ejes.forEach(function (e) { porRuta[e.ruta] = e; });
  var poner = function (caja, lista) {
    caja.textContent = '';
    lista.forEach(function (x) {
      var e = x.eje, b = pastillaDeEje(e, x.usado);
      caja.appendChild(b);
      if (RECUENTO.menu === e.ruta) caja.appendChild(menuDeEje(e, x.usado));
    });
  };
  var libres = ejes.filter(function (e) { return !recuentoUsado(e.ruta); }).map(function (e) { return { eje: e, usado: null }; });
  poner(document.getElementById('recEjes'), libres.filter(function (x) { return !x.eje.enlace; }));
  poner(document.getElementById('recEjesEnl'), libres.filter(function (x) { return x.eje.enlace; }));
  document.getElementById('recEjesEnlCaja').hidden = !ejes.some(function (e) { return e.enlace; });
  var dentro = function (id, lista) { poner(document.querySelector('#' + id + ' .rec-pastillas'), lista.filter(function (u) { return porRuta[u.ruta]; }).map(function (u) { return { eje: porRuta[u.ruta], usado: u }; })); };
  dentro('recFilas', RECUENTO.filas); dentro('recCols', RECUENTO.cols);
}

function prepararSoltar(caja, destino) {
  caja.dataset.caja = destino;
  caja.ondragover = function (ev) { ev.preventDefault(); };
  caja.ondrop = function (ev) {
    ev.preventDefault();
    var ruta = ev.dataTransfer.getData('text/plain'), sobre = ev.target.closest && ev.target.closest('[data-ruta]');
    if (ruta) moverEje(ruta, destino, sobre && sobre.dataset.ruta !== ruta ? sobre.dataset.ruta : undefined);
  };
}

function estadoRecuento() {
  var varios = recuentoUsaCurso();
  return { filas: RECUENTO.filas, cols: RECUENTO.cols, calculo: RECUENTO.calculo, campo: RECUENTO.campo, base: RECUENTO.base, filtros: CONSULTA.filtros, dia: varios ? '' : document.getElementById('consFecha').value };
}

/* Qué se puede calcular según los ejes y los campos del conjunto. */
function pintarCalculo() {
  var c = CONSULTA.carga, def = recuentoDef(), numericos = consultaNumericos_(c.campos, def);
  var conTabla = recuentoEjes().some(function (e) { return e.tabla && recuentoUsado(e.ruta); });
  var sel = document.getElementById('recCalculo');
  sel.textContent = '';
  RECUENTO_CALCULOS_.filter(function (k) { return (k.id !== 'lineas' || conTabla) && ((k.id !== 'sumar' && k.id !== 'media') || numericos.length); }).forEach(function (k) {
    var o = el('option', '', k.nombre); o.value = k.id; o.title = k.frase; sel.appendChild(o);
  });
  if (!Array.prototype.some.call(sel.options, function (o) { return o.value === RECUENTO.calculo; })) RECUENTO.calculo = 'contar';
  sel.value = RECUENTO.calculo;
  var campos = document.getElementById('recCampo');
  campos.textContent = '';
  numericos.forEach(function (n) { var o = el('option', '', n.nombre); o.value = n.ruta; campos.appendChild(o); });
  if (!numericos.some(function (n) { return n.ruta === RECUENTO.campo; })) RECUENTO.campo = numericos.length ? numericos[0].ruta : '';
  campos.value = RECUENTO.campo;
  document.getElementById('recCampoCaja').hidden = !(RECUENTO.calculo === 'sumar' || RECUENTO.calculo === 'media');
  var base = document.getElementById('recBase');
  base.textContent = '';
  RECUENTO_BASES_.forEach(function (b) { var o = el('option', '', b.nombre); o.value = b.id; base.appendChild(o); });
  base.value = RECUENTO.base;
  document.getElementById('recBaseCaja').hidden = RECUENTO.calculo !== 'porcentaje';
  document.getElementById('recFrase').textContent = RECUENTO_CALCULOS_.filter(function (k) { return k.id === RECUENTO.calculo; })[0].frase;
}

function recuentoCelda(rec, i, j, texto, clase, general) {
  var td = el('td', clase || '');
  var a = el('a', 'rec-cifra', texto); a.href = '#'; a.dataset.i = i; a.dataset.j = j;
  a.title = 'Ver la lista de quiénes son';
  a.onclick = function (ev) { ev.preventDefault(); abrirLista(rec, i, j); };
  if (general) a.id = 'recTotal';
  td.appendChild(a);
  return td;
}

function pintarTablaRecuento(rec) {
  var cab = document.getElementById('recCabeza'), cuerpo = document.getElementById('recCuerpo');
  cab.textContent = ''; cuerpo.textContent = '';
  var nf = rec.ejesFilas.length, nc = rec.ejesCols.length, anchoIzq = Math.max(nf, 1);
  if (!nc) {
    var tr0 = el('tr');
    if (nf) rec.ejesFilas.forEach(function (e) { tr0.appendChild(el('th', '', e.nombre)); }); else tr0.appendChild(el('th', '', ''));
    tr0.appendChild(el('th', 'rec-num', consultaFraseCalculo_(rec)));
    cab.appendChild(tr0);
  } else {
    for (var l = 0; l < nc; l++) {
      var tr = el('tr');
      if (l === 0 && nc > 1) { var tl = el('th', '', ''); tl.colSpan = anchoIzq; tl.rowSpan = nc - 1; tr.appendChild(tl); }
      if (l === nc - 1) { if (nf) rec.ejesFilas.forEach(function (e) { tr.appendChild(el('th', '', e.nombre)); }); else tr.appendChild(el('th', '', '')); }
      var j = 0;
      while (j < rec.cols.length) {
        var g = rec.cols[j], k = j + 1;
        while (k < rec.cols.length && rec.cols[k].ordenes.slice(0, l + 1).join('\u0001') === g.ordenes.slice(0, l + 1).join('\u0001')) k++;
        var th = el('th', 'rec-num', g.etiquetas[l]); th.colSpan = k - j; th.title = rec.ejesCols[l].nombre; tr.appendChild(th);
        j = k;
      }
      if (l === 0) { var tt = el('th', 'rec-num', 'Total'); tt.rowSpan = nc; tr.appendChild(tt); }
      cab.appendChild(tr);
    }
  }
  rec.filas.forEach(function (g, i) {
    var fila = el('tr');
    if (nf) g.etiquetas.forEach(function (t, n) {
      var igual = i > 0 && rec.filas[i - 1].ordenes.slice(0, n + 1).join('\u0001') === g.ordenes.slice(0, n + 1).join('\u0001');
      fila.appendChild(el('th', 'rec-fila', igual ? '' : t));
    }); else fila.appendChild(el('th', 'rec-fila', 'Total'));
    rec.celdas[i].forEach(function (c, j) { fila.appendChild(recuentoCelda(rec, i, j, c.texto, 'rec-num', !nf && !nc)); });
    if (nc) fila.appendChild(recuentoCelda(rec, i, -1, rec.totFilas[i].texto, 'rec-num rec-total', !nf));
    cuerpo.appendChild(fila);
  });
  if (nf) {
    var ult = el('tr', 'rec-total'), t0 = el('th', 'rec-fila', 'Total'); t0.colSpan = nf; ult.appendChild(t0);
    rec.totCols.forEach(function (c, j) { ult.appendChild(recuentoCelda(rec, -1, nc ? j : -1, c.texto, 'rec-num', !nc)); });
    if (nc) ult.appendChild(recuentoCelda(rec, -1, -1, rec.total.texto, 'rec-num', true));
    cuerpo.appendChild(ult);
  }
}

/* Con pulsar la cifra de la casilla (i = fila, j = columna; -1 es el total) se abre la lista con esas líneas. */
function abrirLista(rec, i, j) {
  CONSULTA.casilla = consultaCasilla_(rec, i, j);
  CONSULTA.cargaLista = recuentoUsaCurso() ? RECUENTO.todas : null;
  CONSULTA.conAnulados = rec.conAnulados;
  CONSULTA.vista = 'lista';
  pintarVista();
}

/* La carga de todas las partes (para el eje del curso); una vez por conjunto. */
function recuentoCargarTodas() {
  var id = CONSULTA.carga.id;
  if (RECUENTO.todas && RECUENTO.todas.id === id) return Promise.resolve(RECUENTO.todas);
  RECUENTO.cargando = true;
  return servidor('webConsultarTodos', id).then(function (t) { RECUENTO.cargando = false; RECUENTO.todas = t; return t; }, function (x) { RECUENTO.cargando = false; avisar(x.message, true); throw x; });
}

function pintarRecuento() {
  var c = CONSULTA.carga;
  if (!c || !c.id) return;
  pintarEjes(); pintarCalculo();
  var varios = recuentoUsaCurso(), avisos = document.getElementById('recAvisos');
  if (varios && (!RECUENTO.todas || RECUENTO.todas.id !== c.id)) {
    document.getElementById('recCuenta').textContent = 'Cargando todos los cursos…';
    recuentoCargarTodas().then(function () { if (CONSULTA.vista === 'recuento') pintarRecuento(); }, function () { /* el aviso ya salió */ });
    return;
  }
  var base = varios ? RECUENTO.todas : c;
  if (enlacesPendientes(base)) {
    document.getElementById('recCuenta').textContent = 'Cargando los datos de los otros conjuntos…';
    cargarEnlaces(base).then(function () { if (CONSULTA.vista === 'recuento') pintarRecuento(); });
    return;
  }
  pintarAvisosEnlaces(base);
  var textoAvisos = varios ? base.aviso : c.aviso;
  avisos.hidden = !textoAvisos.length; avisos.textContent = textoAvisos.join(' ');
  var rec = null;
  if (base.hay) rec = consultaRecuento_(base, estadoRecuento());
  RECUENTO.rec = rec;
  if (!rec) {
    document.getElementById('recCabeza').textContent = ''; document.getElementById('recCuerpo').textContent = ''; document.getElementById('recSvg').textContent = '';
    document.getElementById('recCuenta').textContent = '';
    document.getElementById('recGraficoCaja').hidden = true;
    medirRecuento(0, 0, false);
    return;
  }
  pintarTablaRecuento(rec);
  var g = consultaGrafico_(rec, RECUENTO.tipo);
  var caja = document.getElementById('recGraficoCaja');
  caja.hidden = !g;
  if (g) {
    var sel = document.getElementById('recTipo');
    sel.textContent = '';
    consultaGraficoTipos_(rec).forEach(function (t) { var o = el('option', '', t.nombre); o.value = t.id; sel.appendChild(o); });
    sel.value = g.tipo;
    dibujarGrafico(document.getElementById('recSvg'), g);
  } else document.getElementById('recSvg').textContent = '';
  var u = (recuentoDef().unidad || ['registro', 'registros']);
  document.getElementById('recCuenta').textContent = rec.registros + ' ' + (rec.registros === 1 ? u[0] : u[1]) + (rec.lineas !== rec.registros ? ' · ' + rec.lineas + ' líneas' : '') + ' · ' + consultaFraseCalculo_(rec);
  medirRecuento(rec.cols.length, rec.filas.length, !!g);
}

function medirRecuento(columnas, lineas, grafico) {
  if (CONSULTA.medido) return;
  CONSULTA.medido = true;
  var ancho = window.innerWidth;
  servidor('webConsultarMedidas', { cargada: true, recuento: true, grafico: grafico, enlaces: pastillasEnlazadas(), columnas: columnas, lineas: lineas, desbordes: document.documentElement.scrollWidth > ancho ? 1 : 0, ancho: ancho }).then(null, function () { /* medir no es lo importante */ });
}

/* La lista de todas las personas que entran en el recuento (hoja «Detalle» del Excel): las columnas de la lista, sin lo delicado. */
function detalleDeRecuento(rec) {
  var base = recuentoUsaCurso() ? RECUENTO.todas : CONSULTA.carga;
  var estado = { columnas: CONSULTA.visibles.filter(function (r) { return CONSULTA.marcadas[r]; }), filtros: CONSULTA.filtros, dia: estadoRecuento().dia, conAnulados: rec.conAnulados };
  return { base: base, estado: estado, modelo: consultaSalida_(base, estado, false, base.hoy) };
}

function hojaDeRecuento(rec, centro, d) {
  var h = el('div', 'hoja'), m = d.modelo;
  var linea = [centro.codigo ? 'Código ' + centro.codigo : '', centro.direccion, (centro.localidad || '') + (centro.localidad && centro.provincia ? ' (' + centro.provincia + ')' : ''), centro.telefono ? 'Tel. ' + centro.telefono : ''].filter(function (x) { return x; });
  var cabeza = el('div', 'hoja-centro'); cabeza.appendChild(el('strong', '', centro.nombre || 'Centro de datos')); cabeza.appendChild(el('span', '', linea.join(' · ')));
  h.appendChild(cabeza);
  h.appendChild(el('h2', '', m.conjunto + ' · recuento · ' + m.cuando));
  h.appendChild(el('p', 'hoja-meta', 'Fecha: ' + m.hoy + (m.filtros.length ? ' · Filtros: ' + m.filtros.join('; ') : '')));
  h.appendChild(el('p', 'hoja-ejes', 'Filas: ' + (rec.ejesFilas.length ? consultaNombresEjes_(rec.ejesFilas).join(', ') : 'ninguno') + ' · Columnas: ' + (rec.ejesCols.length ? consultaNombresEjes_(rec.ejesCols).join(', ') : 'ninguno') + ' · ' + consultaFraseCalculo_(rec)));
  var t = consultaTablaRecuento_(rec), tabla = el('table'), cab = el('tr');
  t.cabecera.forEach(function (x) { cab.appendChild(el('th', '', x)); });
  tabla.appendChild(el('thead')).appendChild(cab);
  var cuerpo = el('tbody');
  t.lineas.forEach(function (l) { var f = el('tr'); l.forEach(function (x) { f.appendChild(el('td', '', typeof x === 'string' ? x : x.texto)); }); cuerpo.appendChild(f); });
  tabla.appendChild(cuerpo); h.appendChild(tabla);
  var svg = document.querySelector('#recSvg svg');
  if (svg && !document.getElementById('recGraficoCaja').hidden) { var gc = el('div', 'hoja-grafico'); gc.appendChild(svg.cloneNode(true)); h.appendChild(gc); }
  (d.base.conEnlaces ? consultaAvisosEnlaces_(d.base, rutasEnUso()) : []).forEach(function (f) { h.appendChild(el('p', 'hoja-pie ambar', f)); });
  h.appendChild(el('p', 'hoja-pie', m.avisoPersonal));
  return h;
}

function imprimirRecuento() {
  var rec = RECUENTO.rec;
  if (!rec) return Promise.resolve();
  var d = detalleDeRecuento(rec);
  return centroDeConsulta().then(function (centro) {
    var caja = document.getElementById('hojaImpresion');
    caja.textContent = '';
    caja.appendChild(hojaDeRecuento(rec, centro, d));
    document.body.classList.add('imprimiendo');
    window.print();
  });
}

function excelRecuento() {
  var rec = RECUENTO.rec;
  if (!rec) return;
  var d = detalleDeRecuento(rec), m = d.modelo;
  var bytes = consultaXlsxRecuento_(rec, m.conjunto + ' · recuento · ' + m.cuando, m.filtros, m.hoy, m);
  var nombre = consultaNombreFichero_(d.base, d.estado.dia), conjunto = consultaDefinicion_(d.base.id).nombre;
  var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = conjunto + ' recuento' + nombre.slice(conjunto.length); a.hidden = true;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
}

prepararSoltar(document.getElementById('recEjes'), 'ejes');
prepararSoltar(document.getElementById('recEjesEnl'), 'ejes');
prepararSoltar(document.getElementById('recFilas'), 'filas');
prepararSoltar(document.getElementById('recCols'), 'cols');
document.getElementById('recCalculo').onchange = function () { RECUENTO.calculo = this.value; pintarRecuento(); };
document.getElementById('recCampo').onchange = function () { RECUENTO.campo = this.value; pintarRecuento(); };
document.getElementById('recBase').onchange = function () { RECUENTO.base = this.value; pintarRecuento(); };
document.getElementById('recTipo').onchange = function () { RECUENTO.tipo = this.value; pintarRecuento(); };
document.getElementById('recVolver').onclick = function () { CONSULTA.vista = 'recuento'; CONSULTA.casilla = null; CONSULTA.cargaLista = null; pintarVista(); };

/* ==== JsConsultarEnlaces.html ==== */

/* Cruzar conjuntos en «Consultar» (fila 101). Los ejes y las columnas de otros datos que enlazan (ConsultarEnlaces.gs) se ofrecen siempre, pero sus datos se traen del servidor la primera vez que se usan
   (ConsultarEnlacesDatos.gs): hasta entonces la consulta es la de siempre. Aquí: cuándo hace falta traerlos, el aviso de quien sale dos veces o sin enlace y el número de pastillas enlazadas. */

/* Las columnas que se están usando en lo que se ve: los ejes del recuento o las columnas de la lista, y las de los filtros. */
function rutasEnUso() {
  var rutas = CONSULTA.filtros.map(function (f) { return f.ruta; }).filter(function (r) { return r; });
  if (CONSULTA.vista === 'lista') return rutas.concat(CONSULTA.visibles.filter(function (r) { return CONSULTA.marcadas[r]; }));
  return rutas.concat(RECUENTO.filas.concat(RECUENTO.cols).map(function (e) { return e.ruta; }));
}

function enlacesEnUso(carga) {
  var rutas = rutasEnUso();
  return consultaEnlacesDe_(carga.id).filter(function (e) { return consultaEnlaceRutas_(e).some(function (r) { return rutas.indexOf(r) !== -1; }); });
}

/* ¿Falta traer los datos enlazados de esta carga? Solo si se usan, aún no están y no ha fallado ya. */
function enlacesPendientes(carga) {
  return !!carga && !carga.conEnlaces && !carga.enlacesFallo && enlacesEnUso(carga).length > 0;
}

/* Trae las uniones de la carga (una sola vez) y las pega. */
function cargarEnlaces(carga) {
  if (carga.pidiendoEnlaces) return carga.pidiendoEnlaces;
  var dia = carga.cargas ? '' : document.getElementById('consFecha').value;
  var p = carga.cargas ? servidor('webConsultarEnlacesTodas', carga.id) : servidor('webConsultarEnlaces', carga.id, carga.curso, carga.periodo, dia);
  carga.pidiendoEnlaces = p.then(function (res) { consultaAplicarEnlaces_(carga, res); carga.pidiendoEnlaces = null; },
    function (x) { carga.enlacesFallo = true; carga.pidiendoEnlaces = null; avisar(x.message, true); });
  return carga.pidiendoEnlaces;
}

/* Las frases (ámbar) de lo que pasa con lo enlazado que se usa. Se quitan si ya no se usa nada. */
function pintarAvisosEnlaces(carga) {
  var caja = document.getElementById('consEnlaces');
  caja.textContent = '';
  var frases = carga && carga.conEnlaces ? consultaAvisosEnlaces_(carga, rutasEnUso()) : [];
  if (carga && carga.enlacesFallo && enlacesEnUso(carga).length) frases = ['No he podido traer los datos de los otros conjuntos: lo enlazado sale vacío.'];
  frases.forEach(function (f) { caja.appendChild(el('p', 'aviso-pasos', f)); });
  caja.hidden = !frases.length;
  return frases;
}

/* Cuántas pastillas de otros datos se ofrecen (la medida de la pestaña). */
function pastillasEnlazadas() {
  return CONSULTA.carga && CONSULTA.carga.id ? recuentoEjes().filter(function (e) { return e.enlace; }).length : 0;
}

/* ==== JsContactos.html ==== */

/* La pestaña «Contactos del profesorado» (fila 98): una fila por docente del curso de hoy con su correo del centro, su correo personal y su móvil. Lo de Séneca sale en gris; lo escrito, en negro. Cada casilla se guarda al salir de ella.
   Lo guardado no se ve publicado hasta que el trabajo de fondo lo recoge de entrada/: mientras tanto esta página recuerda sus cambios (en este navegador) y los enseña ya. */
var CLAVE_PENDIENTES_CONTACTOS = 'centro-de-datos-contactos-pendientes';
var DATOS_CONTACTOS = [['correoCentro', 'Correo del centro'], ['correoPersonal', 'Correo personal'], ['movil', 'Móvil']];

function pendientesDeContactos() {
  try { var l = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES_CONTACTOS) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; }
}
function recordarPendientesDeContactos(l) {
  try { localStorage.setItem(CLAVE_PENDIENTES_CONTACTOS, JSON.stringify(l)); } catch (e) { /* sin recordarlos: el fichero de entrada/ lleva los cambios igualmente */ }
}

/* ¿Lo publicado ya recoge este cambio (o uno posterior)? */
function contactoYaPublicado(fila, p) {
  var o = fila.origen[p.campo], cuando = o ? (o.de === 'a-mano' ? o.cuando : (o.borradoPor || {}).cuando) : '';
  return !!cuando && Date.parse(cuando) >= Date.parse(p.cuando);
}

/* Pone en una fila un cambio de esta página, como lo dejará la parte cuando se publique. */
function ponerCambioEnFila(fila, p) {
  if (p.valor) { fila.valores[p.campo] = p.valor; fila.origen[p.campo] = { de: 'a-mano', quien: p.quien, app: DUENO_CD_, cuando: p.cuando }; }
  else if (fila.seneca[p.campo]) { fila.valores[p.campo] = fila.seneca[p.campo]; fila.origen[p.campo] = { de: 'seneca', borradoPor: { quien: p.quien, app: DUENO_CD_, cuando: p.cuando } }; }
  else { delete fila.valores[p.campo]; delete fila.origen[p.campo]; }
}

function celdaDeContacto(fila, campo, etiqueta, celdaUltimo) {
  var td = el('td'), entrada = el('input'), aviso = el('span', 'aviso-campo');
  entrada.type = 'text'; entrada.dataset.campo = campo; entrada.setAttribute('aria-label', etiqueta + ' de ' + fila.empleado);
  function pintar() {
    var o = fila.origen[campo], valor = fila.valores[campo];
    entrada.value = valor ? textoDeContacto_(campo, valor) : '';
    entrada.classList.toggle('gris', !!valor && !(o && o.de === 'a-mano'));
    entrada.classList.remove('mal');
  }
  function guardar() {
    var v = validarContacto_(campo, entrada.value);
    if (!v.ok) { entrada.classList.add('mal'); aviso.className = 'aviso-campo mal'; aviso.textContent = v.motivo; return; }
    var aMano = !!(fila.origen[campo] && fila.origen[campo].de === 'a-mano');
    aviso.className = 'aviso-campo'; aviso.textContent = '';
    if (v.valor === (fila.valores[campo] || '') || (v.valor === '' && !aMano)) { pintar(); return; }   // el mismo dato, o vaciar lo que viene de Séneca: no hay nada que guardar
    servidor('webContactosGuardar', { id: fila.id, empleado: fila.empleado, campo: campo, valor: v.valor, pendientes: pendientesDeContactos() }).then(function (r) {
      if (r.estado !== 'ok') { entrada.classList.add('mal'); aviso.className = 'aviso-campo mal'; aviso.textContent = r.motivo; return; }
      var p = { id: fila.id, empleado: fila.empleado, campo: campo, valor: r.valor, quien: r.quien, cuando: r.cuando };
      recordarPendientesDeContactos(pendientesDeContactos().filter(function (x) { return !(x.id === p.id && x.campo === p.campo); }).concat([p]));
      ponerCambioEnFila(fila, p); pintar();
      celdaUltimo.textContent = ultimoCambioDeContacto_(fila.origen);
      aviso.className = 'aviso-campo bien'; aviso.textContent = '✔ Guardado';
      setTimeout(function () { if (aviso.textContent === '✔ Guardado') aviso.textContent = ''; }, 2500);
    }, function (x) { entrada.classList.add('mal'); aviso.className = 'aviso-campo mal'; aviso.textContent = x.message; });
  }
  entrada.addEventListener('change', guardar);
  pintar();
  td.appendChild(entrada); td.appendChild(aviso);
  return td;
}

function filaDeTablaContactos(fila) {
  var tr = el('tr'), ultimo = el('td', 'ultimo', ultimoCambioDeContacto_(fila.origen));
  tr.dataset.nombre = normalizarAlumno_(fila.empleado);
  tr.appendChild(el('td', 'nombre', fila.empleado));
  DATOS_CONTACTOS.forEach(function (d) { tr.appendChild(celdaDeContacto(fila, d[0], d[1], ultimo)); });
  tr.appendChild(ultimo);
  return tr;
}

function filtrarContactos() {
  var q = normalizarAlumno_(document.getElementById('buscarContactos').value);
  document.querySelectorAll('#filasContactos tr').forEach(function (tr) { tr.hidden = !!q && tr.dataset.nombre.indexOf(q) === -1; });
}

function pintarContactos(r) {
  document.getElementById('tituloContactos').textContent = 'Contactos del profesorado · curso ' + r.curso;
  var cuerpo = document.getElementById('filasContactos'), nota = document.getElementById('sinContactos');
  cuerpo.textContent = '';
  /* Los cambios de esta página que aún no ve publicados el Centro de datos se enseñan ya; los que ya están publicados se olvidan. */
  var pendientes = pendientesDeContactos().filter(function (p) {
    var fila = r.filas.filter(function (f) { return f.id === p.id; })[0];
    return !!fila && !contactoYaPublicado(fila, p);
  });
  recordarPendientesDeContactos(pendientes);
  pendientes.slice().sort(function (a, b) { return Date.parse(a.cuando) - Date.parse(b.cuando); }).forEach(function (p) {
    ponerCambioEnFila(r.filas.filter(function (f) { return f.id === p.id; })[0], p);
  });
  r.filas.forEach(function (f) { cuerpo.appendChild(filaDeTablaContactos(f)); });
  nota.hidden = r.filas.length > 0;
  nota.textContent = r.hay ? 'No hay ningún docente en el personal de este curso.' : 'Todavía no hay contactos: se montan en cuanto el Centro de datos tiene el personal del curso.';
  document.getElementById('resumenContactos').textContent = r.filas.length ? r.filas.length + (r.filas.length === 1 ? ' docente' : ' docentes') : '';
  filtrarContactos();
}

function cargarContactos() {
  return servidor('webContactosLeer').then(pintarContactos, function (x) { avisar(x.message, true); });
}
document.getElementById('buscarContactos').addEventListener('input', filtrarContactos);

/* ==== JsSubir.html ==== */

/* Soltar ficheros: cada uno viaja por trozos en base64, sin tocar su contenido. */
var TROZO_BYTES = 1048572;   // un trozo de algo más de 1 MB (múltiplo de 3); el servidor los guarda en Drive
var TOPE_BYTES = 50 * 1024 * 1024;
var TEXTO_GRANDE = 'Este fichero es demasiado grande para soltarlo aquí. Déjalo en la carpeta «entrada» de Drive.';

function aBase64(buffer) {
  var bytes = new Uint8Array(buffer), texto = '';
  for (var i = 0; i < bytes.length; i += 8192) texto += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return btoa(texto);
}

function idNuevo() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

/* El desplegable de la zona: todos los cursos desde el siguiente hasta 89-90, con el actual marcado. Se rellena una vez por visita. */
function pintarCursoZona(e) {
  var s = document.getElementById('cursoZona');
  if (s.options.length) return;
  (e.cursosElegibles || []).forEach(function (c) { s.appendChild(new Option(c, c)); });
  s.value = e.cursoActual;
}

function subirFichero(fichero) {
  var linea = el('div', 'res', fichero.name + ' — subiendo…');
  var caja = document.getElementById('resultados');
  caja.insertBefore(linea, caja.firstChild);
  if (fichero.size > TOPE_BYTES) { pintarLinea(linea, fichero.name, 'mal', TEXTO_GRANDE); return Promise.resolve(); }
  var id = idNuevo();
  var curso = document.getElementById('cursoZona').value;
  return fichero.arrayBuffer().then(function (buffer) {
    var total = Math.max(1, Math.ceil(buffer.byteLength / TROZO_BYTES));
    var cadena = Promise.resolve(null);
    for (var i = 0; i < total; i++) {
      (function (i) {
        cadena = cadena.then(function () {
          if (total > 1) pintarProgreso(linea, fichero.name, Math.floor(i * 100 / total));
          return servidor('webSubirTrozo', id, fichero.name, i, total, aBase64(buffer.slice(i * TROZO_BYTES, (i + 1) * TROZO_BYTES)), curso, buffer.byteLength);
        });
      })(i);
    }
    return cadena;
  }).then(function (r) {
    mostrarResultado(linea, fichero.name, r);
  }, function (x) {
    pintarLinea(linea, fichero.name, 'mal', x.message);
  });
}

/* Mientras sube un fichero de varios trozos, la línea dice cuánto lleva. */
function pintarProgreso(linea, nombre, por) {
  linea.textContent = nombre + ' — subiendo… ' + por + ' %';
}

function pintarLinea(linea, nombre, clase, texto) {
  linea.className = 'res ' + clase;
  linea.textContent = '';
  linea.appendChild(el('strong', '', nombre));
  linea.appendChild(document.createTextNode(' — ' + texto));
}

function mostrarResultado(linea, nombre, r) {
  if (r.estado === 'guardado') { pintarLinea(linea, nombre, 'bien', r.mensaje); cargarEstado(); }
  else if (r.estado === 'ya') pintarLinea(linea, nombre, 'ya', r.mensaje);
  else if (r.estado === 'sin-clasificar') {
    pintarLinea(linea, nombre, 'aviso', r.mensaje);
    cargarEstado();
  }
  else pintarLinea(linea, nombre, r.estado === 'error' ? 'mal' : 'aviso', r.mensaje);
}

function subirVarios(lista) {
  avisar('');
  var cadena = Promise.resolve();
  Array.prototype.forEach.call(lista, function (f) { cadena = cadena.then(function () { return subirFichero(f); }); });
}

function prepararZona() {
  var zona = document.getElementById('zona'), entrada = document.getElementById('elegir');
  ['dragenter', 'dragover'].forEach(function (n) { zona.addEventListener(n, function (ev) { ev.preventDefault(); zona.classList.add('encima'); }); });
  ['dragleave', 'drop'].forEach(function (n) { zona.addEventListener(n, function (ev) { ev.preventDefault(); zona.classList.remove('encima'); }); });
  zona.addEventListener('drop', function (ev) { subirVarios(ev.dataTransfer.files); });
  entrada.addEventListener('change', function () { subirVarios(entrada.files); entrada.value = ''; });
}

/* ==== JsSinClasificar.html ==== */

/* «Sin clasificar»: lo que se guardó sin saber colocarlo. Cada línea lleva sus desplegables (qué es, curso, a quién se refiere, periodo)
   ya marcados con lo que se sabe; «Guardar» manda la ficha entera y la aplicación se queda con la corrección. */
var SIN_ELEGIR = '?', OTRO_TIPO = '__nuevo', OTRO_VALOR = '__otro';

function opcion(valor, texto) { return new Option(texto, valor); }

function llenar(select, opciones, elegido) {
  select.textContent = '';
  opciones.forEach(function (o) { select.appendChild(opcion(o[0], o[1])); });
  select.value = elegido;
  if (select.value !== elegido && select.options.length) select.selectedIndex = 0;
}

function tipoPorClave(clave) {
  return (ESTADO.tipos || []).filter(function (t) { return t.clave === clave; })[0] || null;
}

/* El año en que empieza un curso («99-00» → 1999): el más reciente que no pase del siguiente al actual. */
function anioDeCurso(c) {
  var aa = +c.slice(0, 2), y = 2000 + aa, hoy = 2000 + +(ESTADO.cursoActual || '26-27').slice(0, 2);
  return y <= hoy + 1 ? y : 1900 + aa;
}

/* La lista del desplegable del curso. Si el curso que toca marcar no está, se añade en su sitio: nunca cae en la primera opción por descarte. */
function cursosParaDesplegable(marcado) {
  var lista = (ESTADO.cursosElegibles || []).slice();
  if (marcado && marcado !== SIN_ELEGIR && lista.indexOf(marcado) === -1) {
    lista.push(marcado);
    lista.sort(function (a, b) { return anioDeCurso(b) - anioDeCurso(a); });
  }
  return lista.map(function (c) { return [c, c]; }).concat([['', 'No depende del curso']]);
}

/* Qué curso sale marcado: el de la ficha; si no, el del nombre; si no, «¿De qué curso?» cuando falta o no se sabe qué es; si no, «No depende del curso». */
function cursoMarcado(p) {
  var ficha = p.ficha || {};
  if (ficha.cursoEscolar) return ficha.cursoEscolar;
  if ((p.propuesta || {}).cursoEscolar) return p.propuesta.cursoEscolar;
  if (!p.clave || (p.falta || []).indexOf('cursoEscolar') !== -1) return SIN_ELEGIR;
  return '';
}

/* Las sugerencias de la caja «Alumno/a»: los nombres del alumnado, pedidos una sola vez. */
var NOMBRES_PEDIDOS = false;
function pedirNombresAlumnado() {
  if (NOMBRES_PEDIDOS) return;
  NOMBRES_PEDIDOS = true;
  var lista = document.getElementById('nombresAlumnado');
  if (!lista) { lista = el('datalist'); lista.id = 'nombresAlumnado'; document.body.appendChild(lista); }
  servidor('webNombresAlumnado').then(function (nombres) {
    nombres.forEach(function (n) { var o = el('option'); o.value = n; lista.appendChild(o); });
  }, function () { NOMBRES_PEDIDOS = false; });
}

/* Una línea de «Sin clasificar». */
function lineaPendiente(p) {
  var fila = el('div', 'pend');
  fila.dataset.id = p.id;
  var a = el('a', '', p.fichero); a.href = p.url; a.target = '_blank';
  fila.appendChild(a);
  fila.appendChild(el('span', 'cuando', 'llegó el ' + p.llegado + ' · lo trajo ' + p.llegadoPor));
  fila.appendChild(el('span', 'motivo', p.motivo));
  var tipos = (ESTADO.tipos || []).slice().sort(function (x, y) { return x.titulo.localeCompare(y.titulo, 'es'); });
  var selTipo = el('select', 'sel-tipo'), cajaTipo = el('input', 'nuevo-tipo'), selCurso = el('select', 'sel-curso'), selAmbito = el('select', 'sel-ambito');
  var cajaAmbito = el('input', 'nuevo-ambito'), selPeriodo = el('select', 'sel-periodo'), cajaAnios = el('input', 'anios');
  var cajaAlumno = el('input', 'sel-alumno'), etiquetaUno = el('label', 'uno'), casillaUno = el('input', 'casilla-uno');
  cajaAlumno.placeholder = 'Alumno/a'; cajaAlumno.hidden = true; cajaAlumno.maxLength = 80; cajaAlumno.setAttribute('list', 'nombresAlumnado');
  cajaAlumno.value = p.alumnoNombre || '';
  casillaUno.type = 'checkbox'; etiquetaUno.appendChild(casillaUno); etiquetaUno.appendChild(document.createTextNode(' Cada fichero es de un solo alumno')); etiquetaUno.hidden = true;
  cajaTipo.placeholder = '¿Cómo se llama este tipo de fichero?'; cajaTipo.hidden = true; cajaTipo.maxLength = 60;
  cajaAmbito.placeholder = '¿A quién se refiere?'; cajaAmbito.hidden = true; cajaAmbito.maxLength = 40;
  cajaAnios.placeholder = 'AAAA-AAAA'; cajaAnios.hidden = true; cajaAnios.maxLength = 9; cajaAnios.size = 9;
  var opcionesTipo = tipos.map(function (t) { return [t.clave, t.titulo]; }).concat([[OTRO_TIPO, 'Otro tipo nuevo…']]);
  if (!p.clave || !tipoPorClave(p.clave)) opcionesTipo.unshift([SIN_ELEGIR, '¿Qué es?']);
  llenar(selTipo, opcionesTipo, p.clave && tipoPorClave(p.clave) ? p.clave : SIN_ELEGIR);
  var marcado = cursoMarcado(p), opcionesCurso = cursosParaDesplegable(marcado);
  if (marcado === SIN_ELEGIR) opcionesCurso.unshift([SIN_ELEGIR, '¿De qué curso?']);
  llenar(selCurso, opcionesCurso, marcado);
  llenar(selPeriodo, [['', '—']].concat((ESTADO.periodos || []).map(function (x) { return [x.valor, x.texto]; })), (p.ficha || {}).periodo || '');
  cajaAnios.value = (p.ficha || {}).periodo || '';

  /* Qué desplegables salen depende del tipo elegido. */
  function refrescar(conservar) {
    var nuevo = selTipo.value === OTRO_TIPO, t = tipoPorClave(selTipo.value);
    cajaTipo.hidden = !nuevo;
    etiquetaUno.hidden = !nuevo;
    var deUno = (nuevo && casillaUno.checked) || (t && t.alumno);
    cajaAlumno.hidden = !deUno;
    if (deUno) pedirNombresAlumnado();
    selCurso.hidden = deUno || !(nuevo || (t && t.curso));
    var ambito = deUno ? '' : nuevo ? 'abierta' : (t ? t.ambito : '');
    selAmbito.hidden = !ambito;
    if (ambito && !conservar) {
      var lista = (nuevo ? [] : t.ambitos).map(function (x) { return [x.valor, x.texto]; });
      var propuesta = (p.ficha || {}).ambito || (p.propuesta || {}).ambito || '';
      var sabido = lista.some(function (x) { return x[0] === propuesta; });
      if (ambito === 'abierta') lista = lista.concat([['', 'Todo el centro'], [OTRO_VALOR, 'Otro…']]);
      var pregunta = (p.falta || []).indexOf('ambito') !== -1 && !sabido && ambito === 'lista';
      if (pregunta || (ambito === 'abierta' && !sabido && propuesta)) lista.unshift([SIN_ELEGIR, '¿A quién se refiere?']);
      llenar(selAmbito, lista, pregunta ? SIN_ELEGIR : (sabido || ambito === 'abierta' ? (sabido ? propuesta : '') : lista[0][0]));
    }
    cajaAmbito.hidden = selAmbito.hidden || selAmbito.value !== OTRO_VALOR;
    var periodo = deUno ? '' : nuevo ? 'evaluaciones' : (t ? t.periodo : '');
    selPeriodo.hidden = periodo !== 'evaluaciones';
    cajaAnios.hidden = periodo !== 'anios';
  }
  selTipo.onchange = function () { refrescar(false); };
  selAmbito.onchange = function () { refrescar(true); };
  casillaUno.onchange = function () { refrescar(false); };
  [selTipo, cajaTipo, etiquetaUno, cajaAlumno, selCurso, selAmbito, cajaAmbito, selPeriodo, cajaAnios].forEach(function (x) { fila.appendChild(x); });
  refrescar(false);

  var guardar = el('button', 'accion', 'Guardar');
  guardar.onclick = function () {
    var datos = {}, nuevo = selTipo.value === OTRO_TIPO;
    if (nuevo) {
      if (!cajaTipo.value.trim()) { avisar('Escribe cómo se llama este tipo de fichero.', true); return; }
      datos.tituloNuevo = cajaTipo.value.trim();
    } else {
      if (selTipo.value === SIN_ELEGIR) { avisar('Elige qué es este fichero.', true); return; }
      datos.clave = selTipo.value;
    }
    if (nuevo && casillaUno.checked) datos.porAlumno = true;
    if (!cajaAlumno.hidden) {
      if (!cajaAlumno.value.trim()) { avisar('Escribe el nombre del alumno o de la alumna.', true); return; }
      datos.alumno = cajaAlumno.value.trim();
    }
    if (!selCurso.hidden) {
      if (selCurso.value === SIN_ELEGIR) { avisar('Elige de qué curso es.', true); return; }
      datos.cursoEscolar = selCurso.value;
    }
    if (!selAmbito.hidden) {
      if (selAmbito.value === SIN_ELEGIR) { avisar('Elige a quién se refiere.', true); return; }
      if (selAmbito.value === OTRO_VALOR) {
        if (!cajaAmbito.value.trim()) { avisar('Escribe a quién se refiere.', true); return; }
        datos.ambitoNuevo = cajaAmbito.value.trim();
      } else datos.ambito = selAmbito.value;
    }
    if (!selPeriodo.hidden) datos.periodo = selPeriodo.value;
    if (!cajaAnios.hidden) datos.periodo = cajaAnios.value.trim();
    avisar('');
    guardar.disabled = true;
    servidor('webCompletarFicha', p.id, datos).then(function (r) {
      var res = el('div', 'res');
      pintarLinea(res, p.fichero, r.estado === 'guardado' ? 'bien' : 'ya', r.mensaje);
      var caja = document.getElementById('resultados');
      caja.insertBefore(res, caja.firstChild);
      cargarEstado();
    }, function (x) { guardar.disabled = false; avisar(x.message, true); });
  };
  fila.appendChild(guardar);

  var quitar = el('button', 'enlace', 'Quitar de aquí');
  var seguro = el('span', 'seguro'), si = el('button', 'enlace', 'Sí'), no = el('button', 'enlace', 'No');
  seguro.hidden = true;
  seguro.appendChild(document.createTextNode('¿Seguro? ')); seguro.appendChild(si); seguro.appendChild(document.createTextNode(' · ')); seguro.appendChild(no);
  quitar.onclick = function () { quitar.hidden = true; seguro.hidden = false; };
  no.onclick = function () { quitar.hidden = false; seguro.hidden = true; };
  si.onclick = function () {
    servidor('webQuitarPendiente', p.id).then(function () { cargarEstado(); }, function (x) { avisar(x.message, true); });
  };
  fila.appendChild(quitar); fila.appendChild(seguro);
  return fila;
}

function pintarSinClasificar(lista) {
  var d = document.getElementById('sinClasificar');
  d.textContent = '';
  d.hidden = !lista.length;
  d.classList.toggle('larga', lista.length > 8);
  if (!lista.length) return;
  d.appendChild(el('h2', '', 'Sin clasificar (' + lista.length + ')'));
  lista.forEach(function (p) { d.appendChild(lineaPendiente(p)); });
}

/* Después de «Cambiar» en la tabla: lleva a la línea del fichero que acaba de volver aquí. */
function mostrarPendiente(id) {
  var linea = document.querySelector('#sinClasificar .pend[data-id="' + id + '"]');
  if (!linea) return;
  linea.classList.add('resaltada');
  if (linea.scrollIntoView) linea.scrollIntoView({ block: 'nearest' });
}

/* ==== JsAlumnos.html ==== */

/* Los ficheros de un solo alumno: una fila por tipo en la tabla; al pulsarla se abre el buscador por nombre. */
function sinTildes(t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function alternarAlumnos(tr, f) {
  var siguiente = tr.nextSibling;
  if (siguiente && siguiente.className === 'alum') { siguiente.parentNode.removeChild(siguiente); return; }
  servidor('webAlumnosDe', f.clave).then(function (lista) {
    var fila = el('tr', 'alum'), td = el('td');
    td.colSpan = 4;
    var caja = el('input', 'buscar-alumno');
    caja.type = 'search'; caja.placeholder = 'Buscar alumno/a';
    var cuerpo = el('div', 'alumnos' + (lista.length > 60 ? ' larga' : ''));
    function pintar() {
      var q = sinTildes(caja.value).trim();
      cuerpo.textContent = '';
      lista.filter(function (a) { return !q || sinTildes(a.nombre).indexOf(q) !== -1; }).forEach(function (a) {
        var p = el('div', 'alumno');
        var enlace = el('a', '', a.nombre); enlace.href = a.url; enlace.target = '_blank';
        p.appendChild(enlace);
        p.appendChild(el('span', 'cuando', a.fecha));
        if (a.anteriores) p.appendChild(el('span', 'cuando', frasePlural(a.anteriores, 'anterior', 'anteriores')));
        if (!a.enAlumnado) p.appendChild(el('span', 'marca', 'no está en el alumnado'));
        cuerpo.appendChild(p);
      });
    }
    caja.oninput = pintar;
    td.appendChild(caja); td.appendChild(cuerpo);
    fila.appendChild(td);
    tr.parentNode.insertBefore(fila, tr.nextSibling);
    pintar();
  }, function (x) { avisar(x.message, true); });
}

/* ==== JsConfiguracion.html ==== */

/* La pestaña «Configuración del centro»: se guarda al salir de cada campo, sin botón. */
var CAMPOS_CENTRO = [
  ['centro', 'nombre', 'Nombre'], ['centro', 'codigo', 'Código (8 cifras)'], ['centro', 'direccion', 'Dirección'],
  ['centro', 'localidad', 'Localidad'], ['centro', 'provincia', 'Provincia'], ['centro', 'telefono', 'Teléfono']
];
var CAMPOS_CORREO = [['correo', 'direccionDelCentro', 'Correo del centro'], ['correo', 'firma', 'Firma de los correos']];

function campoConfiguracion(def, valor) {
  var fila = el('div', def[1] === 'firma' ? 'campo firma' : 'campo');
  var etiqueta = el('label', '', def[2]);
  var entrada = def[1] === 'firma' ? el('textarea') : el('input');
  if (entrada.tagName === 'TEXTAREA') entrada.rows = 5; else entrada.type = 'text';
  entrada.value = valor || '';
  entrada.id = 'cfg-' + def[1];
  etiqueta.htmlFor = entrada.id;
  var aviso = el('span', 'aviso-campo');
  var ultimo = entrada.value;
  entrada.addEventListener('change', function () {
    aviso.className = 'aviso-campo'; aviso.textContent = '';
    servidor('webConfiguracionGuardar', def[0], def[1], entrada.value).then(function (r) {
      if (!r.ok) { aviso.className = 'aviso-campo mal'; aviso.textContent = r.mensaje; return; }
      ultimo = entrada.value = r[def[0]][def[1]];
      aviso.className = 'aviso-campo bien'; aviso.textContent = 'Guardado';
      pintarUltimoCambio(r);
      if (def[1] === 'nombre') pintarNombreCentro(entrada.value);
      setTimeout(function () { if (aviso.textContent === 'Guardado') aviso.textContent = ''; }, 2500);
    }, function (x) { aviso.className = 'aviso-campo mal'; aviso.textContent = x.message; });
  });
  fila.appendChild(etiqueta); fila.appendChild(entrada); fila.appendChild(aviso);
  return fila;
}

function pintarUltimoCambio(c) {
  document.getElementById('ultimoCambio').textContent = c.actualizado
    ? 'Cambiado por última vez el ' + c.actualizado + (c.actualizadoPor ? ' por ' + c.actualizadoPor : '') : 'Todavía no se ha cambiado nada.';
}

function pintarNombreCentro(nombre) {
  document.getElementById('nombreCentro').textContent = nombre ? ' · ' + nombre : '';
}

function pintarConfiguracion(c) {
  var centro = document.getElementById('cajaCentro'), correo = document.getElementById('cajaCorreo');
  centro.textContent = ''; correo.textContent = '';
  CAMPOS_CENTRO.forEach(function (d) { centro.appendChild(campoConfiguracion(d, c.centro[d[1]])); });
  CAMPOS_CORREO.forEach(function (d) { correo.appendChild(campoConfiguracion(d, c.correo[d[1]])); });
  pintarUltimoCambio(c);
}

function cargarConfiguracion() {
  return servidor('webConfiguracionLeer').then(pintarConfiguracion, function (x) { avisar(x.message, true); });
}

/* ==== JsAcceso.html ==== */

/* La pestaña «Acceso y carpeta»: solo la ve el dueño. */
function pintarAcceso(a) {
  var ul = document.getElementById('listaAcceso');
  ul.textContent = '';
  var dueno = el('li', 'persona');
  dueno.appendChild(el('span', 'nombre', 'Dueño'));
  dueno.appendChild(el('span', 'correo', a.dueno));
  ul.appendChild(dueno);
  a.personas.forEach(function (p) {
    var li = el('li', 'persona');
    li.appendChild(el('span', 'nombre', p.nombre));
    li.appendChild(el('span', 'correo', p.correo));
    var q = el('button', 'enlace', 'Quitar');
    q.onclick = function () {
      q.disabled = true;
      servidor('webAccesoQuitar', p.correo).then(function (r) { respuestaAcceso(r); }, function (x) { q.disabled = false; avisar(x.message, true); });
    };
    li.appendChild(q);
    ul.appendChild(li);
  });
}

function respuestaAcceso(r) {
  var m = document.getElementById('avisoAcceso');
  if (!r.ok) { m.className = 'aviso-campo mal'; m.textContent = r.mensaje; return; }
  m.textContent = '';
  pintarAcceso(r);
}

function anadirPersona() {
  var nombre = document.getElementById('accesoNombre'), correo = document.getElementById('accesoCorreo');
  servidor('webAccesoAnadir', nombre.value, correo.value).then(function (r) {
    respuestaAcceso(r);
    if (r.ok) { nombre.value = ''; correo.value = ''; }
  }, function (x) { avisar(x.message, true); });
}

function pintarCarpetaAcceso(c) {
  var d = document.getElementById('carpetaAcceso');
  d.textContent = '';
  d.appendChild(document.createTextNode('Carpeta: '));
  if (c.ok) { var a = el('a', '', c.nombre); a.href = c.url; a.target = '_blank'; d.appendChild(a); }
  else d.appendChild(document.createTextNode(c.mensaje));
}

function cambiarCarpeta() {
  var caja = document.getElementById('enlaceCarpeta'), m = document.getElementById('avisoCarpeta');
  m.className = 'aviso-campo'; m.textContent = 'Comprobando…';
  servidor('webCarpetaCambiar', caja.value).then(function (r) {
    m.className = 'aviso-campo ' + (r.ok ? 'bien' : 'mal');
    m.textContent = r.mensaje;
    if (r.ok) { caja.value = ''; pintarCarpetaAcceso(r.carpeta); cargarEstado(); }
  }, function (x) { m.className = 'aviso-campo mal'; m.textContent = x.message; });
}

function cargarAcceso() {
  return servidor('webAccesoLeer').then(pintarAcceso, function (x) { avisar(x.message, true); });
}

/* ==== JsDiagnostico.html ==== */

/* «Buscar un código de diagnóstico» (fila 35): solo la ve el dueño. Escribe A-… o P-… y dice quién es y dónde sale. */
function buscarCodigoDiagnostico() {
  var caja = document.getElementById('codigoDiag'), salida = document.getElementById('resultadoDiag'), boton = document.getElementById('buscarDiag');
  salida.className = 'aviso-campo';
  salida.textContent = 'Buscando…';
  boton.disabled = true;
  servidor('webDiagnosticoBuscar', caja.value).then(function (r) {
    boton.disabled = false;
    if (!r.ok) { salida.className = 'aviso-campo mal'; salida.textContent = r.mensaje; return; }
    if (!r.encontrado) { salida.textContent = r.mensaje; return; }
    salida.textContent = r.codigo + ' → ' + r.nombre + ' · sale en: ' + r.donde.join(', ');
  }, function (x) { boton.disabled = false; salida.className = 'aviso-campo mal'; salida.textContent = x.message; });
}
function prepararDiagnostico() {
  document.getElementById('cajaDiag').hidden = false;
  document.getElementById('buscarDiag').onclick = buscarCodigoDiagnostico;
  document.getElementById('codigoDiag').onkeydown = function (e) { if (e.key === 'Enter') buscarCodigoDiagnostico(); };
}

/* ==== JsSoporte.html ==== */

/* El botón «Soporte» es el único de las aplicaciones de Francisco: lo trae el buzón. Aquí solo se dice quién es esta aplicación y se carga. */
var BUZON_SOPORTE = 'https://script.google.com/macros/s/AKfycbz2LFRhlvnlUjr_QZFW5cuY3ayE-wmXCCg1TdtUCNDJ6SEosNMetkZP6muz1NVwFDMXhQ/exec';
var REPO_SOPORTE = 'fmargon780/centro-de-datos-ies';
var SOPORTE_CORREO = '';
var SEGUNDOS_AVISO_SOPORTE = 15;

function pestanaAbierta() {
  var b = document.querySelector('nav button.activa');
  return b ? b.textContent : '';
}

/* Tiene que existir antes de que cargue el botón. */
window.SOPORTE_APP = {
  repo: REPO_SOPORTE,
  version: '',
  pantalla: pestanaAbierta,
  persona: function () { return SOPORTE_CORREO ? { nombre: SOPORTE_CORREO, correo: SOPORTE_CORREO } : undefined; }
};

/* Lo llama la página al leer el estado. */
function soporteDatos(correo, version) {
  if (correo) SOPORTE_CORREO = correo;
  if (version) window.SOPORTE_APP.version = version;
}

/* Cuenta, sin guardar nada de lo escrito, si cada envío del botón al buzón sale bien o mal. */
(function () {
  var ruta = BUZON_SOPORTE.split('/macros/')[1], original = window.fetch;
  if (!ruta || typeof original !== 'function') return;
  function contar(bien) { try { servidor('webSoporteEnvio', bien).then(null, function () { /* se calla */ }); } catch (e) { /* se calla */ } }
  window.fetch = function (url, opciones) {
    var p = original.apply(this, arguments);
    if (opciones && opciones.method === 'POST' && String(url).indexOf(ruta) > -1) {
      p.then(function (r) { return r.clone().json(); }).then(function (j) { contar(!!(j && j.ok === true)); }, function () { contar(false); });
    }
    return p;
  };
})();

(function () {
  var s = document.createElement('script');
  s.async = true;
  s.src = BUZON_SOPORTE + '?boton=1&repo=' + REPO_SOPORTE;
  s.onerror = function () { /* sin botón, la página sigue igual y sin avisos */ };
  document.head.appendChild(s);
  /* Una sola vez por página abierta, le cuenta al servidor si el botón ha cargado. */
  setTimeout(function () {
    servidor('webSoporteVisto', !!window.Soporte).then(null, function () { /* se calla */ });
  }, SEGUNDOS_AVISO_SOPORTE * 1000);
})();
