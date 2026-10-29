/* Generado por pagina/construir.mjs a partir de la aplicación de hoy. No se edita a mano. */
/* ==== Version.gs ==== */
const VERSION_CD = 'CD v58';
/* El lanzador más viejo con el que este programa funciona. Igual que lanzadorMinimo de manifiesto.json (lo vigila una prueba). */
const LANZADOR_MINIMO = 2;

/* ==== Tiempo.gs ==== */
/* Fechas en hora de Madrid, con su desfase. */
const MESES_CD_ = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* «2026-10-08T21:39:12+02:00» */
function ahoraMadrid_(fecha) {
  return Utilities.formatDate(fecha || new Date(), 'Europe/Madrid', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/* «8-oct-2026 21:39», a partir de lo que devuelve ahoraMadrid_ */
function fechaLegible_(iso) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(String(iso || ''));
  if (!m) return '';
  return parseInt(m[3], 10) + '-' + MESES_CD_[parseInt(m[2], 10) - 1] + '-' + m[1] + ' ' + m[4] + ':' + m[5];
}

/* «hace 3 días» */
function haceTiempo_(iso, ahora) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const min = Math.floor(((ahora || new Date()).getTime() - t) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return 'hace ' + min + (min === 1 ? ' minuto' : ' minutos');
  const h = Math.floor(min / 60);
  if (h < 24) return 'hace ' + h + (h === 1 ? ' hora' : ' horas');
  const d = Math.floor(h / 24);
  return 'hace ' + d + (d === 1 ? ' día' : ' días');
}

/* ==== PdfTexto.gs ==== */
/* Un lector de PDF de Séneca (los que genera Oracle Reports): da los textos de cada hoja con su posición, su tipo de letra y si van girados. No sabe nada de tutorías.
   Admite ASCII85 y Flate, juntos o sueltos. Lo que no conoce no se adivina: devuelve { ok: false, motivo } y ninguna hoja.
   pdfTextos_(bytes) → { ok, motivo, hojas: [ [ { t, x, y, f, neg, g } ] ] }   (t: texto; x, y: posición; f: «F0»; neg: negrita; g: girado) */

const PDF_OPERADORES_NO_ = ['TJ', "'", '"', 'T*', 'BI'];
const PDF_CP1252_ = { 128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž', 145: '‘', 146: '’',
  147: '“', 148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›', 156: 'œ', 158: 'ž', 159: 'Ÿ' };

function pdfCadena_(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    const trozo = [];
    for (let j = i; j < Math.min(bytes.length, i + 8192); j++) trozo.push(bytes[j] & 255);
    s += String.fromCharCode.apply(null, trozo);
  }
  return s;
}

/* ASCII85 sin «<~» delante y con «~>» detrás, partido en renglones. Devuelve una lista de bytes. */
function pdfAscii85_(texto) {
  const t = texto.replace(/~>[\s\S]*$/, '').replace(/^\s*<~/, '').replace(/\s+/g, '');
  const salida = [];
  let grupo = [];
  const volcar = function (g, n) {
    let v = 0;
    for (let i = 0; i < 5; i++) v = v * 85 + (i < g.length ? g[i] : 84);
    const b = [Math.floor(v / 16777216) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    for (let i = 0; i < n; i++) salida.push(b[i]);
  };
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (t[i] === 'z' && !grupo.length) { salida.push(0, 0, 0, 0); continue; }
    if (c < 33 || c > 117) throw new Error('ascii85');
    grupo.push(c - 33);
    if (grupo.length === 5) { volcar(grupo, 4); grupo = []; }
  }
  if (grupo.length === 1) throw new Error('ascii85');
  if (grupo.length) volcar(grupo, grupo.length - 1);
  return salida;
}

/* Un «inflate» pequeño (RFC 1951, con la cabecera de zlib). Lista de bytes → lista de bytes. */
const PDF_LARGOS_ = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const PDF_LARGOS_EXTRA_ = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const PDF_DIST_ = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const PDF_DIST_EXTRA_ = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const PDF_ORDEN_CODIGOS_ = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/* Una tabla de Huffman a partir de las longitudes de sus códigos: { cuenta: [n por longitud], simbolos: [ordenados] }. */
function pdfHuffman_(longitudes) {
  const cuenta = [];
  for (let i = 0; i <= 15; i++) cuenta.push(0);
  longitudes.forEach(function (l) { cuenta[l]++; });
  const desde = [0, 0];
  for (let l = 1; l < 15; l++) desde[l + 1] = desde[l] + cuenta[l];
  const simbolos = [];
  longitudes.forEach(function (l, s) { if (l) simbolos[desde[l]++] = s; });
  return { cuenta: cuenta, simbolos: simbolos };
}

function pdfInflar_(datos) {
  if (datos.length < 3 || (datos[0] & 15) !== 8) throw new Error('flate');
  let pos = 2, bits = 0, nbits = 0;
  const salida = [];
  const leer = function (n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (!nbits) { if (pos >= datos.length) throw new Error('flate'); bits = datos[pos++] & 255; nbits = 8; }
      v |= (bits & 1) << i; bits >>= 1; nbits--;
    }
    return v;
  };
  const decodificar = function (h) {
    let codigo = 0, primero = 0, indice = 0;
    for (let l = 1; l <= 15; l++) {
      codigo |= leer(1);
      const n = h.cuenta[l];
      if (codigo - n < primero) return h.simbolos[indice + (codigo - primero)];
      indice += n; primero += n; primero <<= 1; codigo <<= 1;
    }
    throw new Error('flate');
  };
  const bloque = function (lit, dist) {
    while (true) {
      let s = decodificar(lit);
      if (s < 256) { salida.push(s); continue; }
      if (s === 256) return;
      s -= 257;
      if (s >= 29) throw new Error('flate');
      const largo = PDF_LARGOS_[s] + leer(PDF_LARGOS_EXTRA_[s]);
      const d = decodificar(dist);
      if (d >= 30) throw new Error('flate');
      const atras = PDF_DIST_[d] + leer(PDF_DIST_EXTRA_[d]);
      if (atras > salida.length) throw new Error('flate');
      for (let i = 0; i < largo; i++) salida.push(salida[salida.length - atras]);
    }
  };
  let ultimo = 0;
  while (!ultimo) {
    ultimo = leer(1);
    const tipo = leer(2);
    if (tipo === 0) {
      nbits = 0;
      if (pos + 4 > datos.length) throw new Error('flate');
      const n = (datos[pos] & 255) | ((datos[pos + 1] & 255) << 8);
      pos += 4;
      if (pos + n > datos.length) throw new Error('flate');
      for (let i = 0; i < n; i++) salida.push(datos[pos++] & 255);
    } else if (tipo === 1) {
      const l = [];
      for (let i = 0; i < 288; i++) l.push(i < 144 ? 8 : (i < 256 ? 9 : (i < 280 ? 7 : 8)));
      const d = [];
      for (let i = 0; i < 30; i++) d.push(5);
      bloque(pdfHuffman_(l), pdfHuffman_(d));
    } else if (tipo === 2) {
      const nlen = leer(5) + 257, ndist = leer(5) + 1, ncod = leer(4) + 4;
      const cl = [];
      for (let i = 0; i < 19; i++) cl.push(0);
      for (let i = 0; i < ncod; i++) cl[PDF_ORDEN_CODIGOS_[i]] = leer(3);
      const hc = pdfHuffman_(cl);
      const largos = [];
      while (largos.length < nlen + ndist) {
        const s = decodificar(hc);
        if (s < 16) largos.push(s);
        else {
          let previo = 0, rep;
          if (s === 16) { if (!largos.length) throw new Error('flate'); previo = largos[largos.length - 1]; rep = 3 + leer(2); }
          else if (s === 17) rep = 3 + leer(3);
          else rep = 11 + leer(7);
          for (let i = 0; i < rep; i++) largos.push(previo);
        }
      }
      if (largos.length !== nlen + ndist) throw new Error('flate');
      bloque(pdfHuffman_(largos.slice(0, nlen)), pdfHuffman_(largos.slice(nlen)));
    } else throw new Error('flate');
  }
  return salida;
}

/* Los objetos del PDF: { numero: { dic: texto del diccionario, datos: texto del «stream» o null } }, y su orden en el fichero. */
function pdfObjetos_(t) {
  const objetos = {}, orden = [], re = /(\d+)\s+\d+\s+obj\b/g;
  let m;
  while ((m = re.exec(t))) {
    const ini = re.lastIndex;
    const fin = t.indexOf('endobj', ini);
    const st = t.indexOf('stream', ini);
    let dic, datos = null;
    if (st !== -1 && (fin === -1 || st < fin)) {
      dic = t.substring(ini, st);
      let d = st + 6;
      if (t[d] === '\r') d++;
      if (t[d] === '\n') d++;
      const f = t.indexOf('endstream', d);
      if (f === -1) throw new Error('estructura');
      datos = t.substring(d, f);
      re.lastIndex = f;
    } else {
      if (fin === -1) throw new Error('estructura');
      dic = t.substring(ini, fin);
      re.lastIndex = fin;
    }
    objetos[m[1]] = { dic: dic, datos: datos };
    orden.push(m[1]);
  }
  return { objetos: objetos, orden: orden };
}

/* Los filtros de un objeto, en el orden en que se deshacen. Lanza si hay alguno que no se conoce. */
function pdfFiltros_(dic) {
  const m = /\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(dic);
  if (/\/DecodeParms|\/DP\b/.test(dic) && /\/Predictor\s*([2-9]|1\d)/.test(dic)) throw new Error('filtro');
  if (!m) return [];
  const nombres = m[1].match(/\/\w+/g) || [];
  return nombres.map(function (n) {
    if (n === '/ASCII85Decode' || n === '/A85') return 'a85';
    if (n === '/FlateDecode' || n === '/Fl') return 'flate';
    throw new Error('filtro');
  });
}

/* El contenido de un objeto con los filtros deshechos, como cadena de un carácter por byte. */
function pdfContenido_(obj) {
  let datos = null;
  pdfFiltros_(obj.dic).forEach(function (f) {
    if (f === 'a85') datos = pdfAscii85_(datos === null ? obj.datos : pdfCadena_(datos));
    else datos = pdfInflar_(datos === null ? obj.datos.split('').map(function (c) { return c.charCodeAt(0); }) : datos);
  });
  return datos === null ? obj.datos : pdfCadena_(datos);
}

function pdfNombreDeTipoDeLetra_(codigo) {
  return codigo.replace(/#([0-9A-Fa-f]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
}

/* Las hojas en su orden: las del árbol «/Kids» (o, si no hay árbol, las que haya en el fichero). Cada una: { dic, contenidos: [números] }. */
function pdfHojas_(obj) {
  const referencias = function (texto) { const r = []; texto.replace(/(\d+)\s+\d+\s+R/g, function (_, n) { r.push(n); return ''; }); return r; };
  const esHoja = function (o) { return /\/Type\s*\/Page(?![\w])/.test(o.dic); };
  const hojas = [];
  const bajar = function (n, nivel) {
    const o = obj.objetos[n];
    if (!o || nivel > 12) throw new Error('estructura');
    if (esHoja(o)) { hojas.push(o); return; }
    const k = /\/Kids\s*\[([^\]]*)\]/.exec(o.dic);
    if (!k) throw new Error('estructura');
    referencias(k[1]).forEach(function (h) { bajar(h, nivel + 1); });
  };
  const raiz = obj.orden.filter(function (n) { return /\/Type\s*\/Pages\b/.test(obj.objetos[n].dic) && !/\/Parent/.test(obj.objetos[n].dic); })[0];
  if (raiz) bajar(raiz, 0);
  else obj.orden.forEach(function (n) { if (esHoja(obj.objetos[n])) hojas.push(obj.objetos[n]); });
  return hojas.map(function (h) {
    const c = /\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/.exec(h.dic);
    return { dic: h.dic, contenidos: c ? referencias(c[1]) : [] };
  });
}

/* Los tipos de letra de una hoja: { F0: { neg: false }, F1: { neg: true } }. */
function pdfLetras_(obj, hoja) {
  const salida = {};
  const f = /\/Font\s*<<([^>]*)>>/.exec(hoja.dic);
  if (!f) return salida;
  f[1].replace(/\/(\w+)\s+(\d+)\s+\d+\s+R/g, function (_, nombre, n) {
    const o = obj.objetos[n];
    const base = o ? /\/BaseFont\s*\/(\S+)/.exec(o.dic) : null;
    salida[nombre] = { neg: !!base && /bold/i.test(pdfNombreDeTipoDeLetra_(base[1])) };
    return '';
  });
  return salida;
}

/* La cadena entre paréntesis que empieza en `i` (el paréntesis de apertura). Devuelve { texto, fin }. */
function pdfCadenaTexto_(c, i) {
  let nivel = 0, s = '';
  for (let j = i; j < c.length; j++) {
    const ch = c[j];
    if (ch === '\\') {
      const n = c[++j];
      if (n === 'n') s += '\n'; else if (n === 'r') s += '\r'; else if (n === 't') s += '\t'; else if (n === 'b') s += '\b'; else if (n === 'f') s += '\f';
      else if (n >= '0' && n <= '7') {
        let o = n;
        while (o.length < 3 && c[j + 1] >= '0' && c[j + 1] <= '7') o += c[++j];
        s += String.fromCharCode(parseInt(o, 8) & 255);
      } else if (n === '\n') { /* línea partida */ } else if (n === '\r') { if (c[j + 1] === '\n') j++; } else s += n;
    } else if (ch === '(') { nivel++; if (nivel > 1) s += ch; }
    else if (ch === ')') { nivel--; if (!nivel) return { texto: s, fin: j + 1 }; s += ch; }
    else s += ch;
  }
  throw new Error('cadena');
}

function pdfDeCp1252_(s) {
  let r = '';
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); r += PDF_CP1252_[c] || s[i]; }
  return r;
}

/* Los textos de un contenido, con su posición. Lanza si aparece algo que no se sabe leer. */
function pdfTextosDeContenido_(c, letras) {
  const textos = [];
  let operandos = [], x = 0, y = 0, giro = false, letra = '';
  let i = 0;
  const ESPACIO = /[\s\0]/, FIN = /[\s\0()<>\[\]\/%]/;
  while (i < c.length) {
    const ch = c[i];
    if (ESPACIO.test(ch)) { i++; continue; }
    if (ch === '%') { while (i < c.length && c[i] !== '\n' && c[i] !== '\r') i++; continue; }
    if (ch === '(') { const r = pdfCadenaTexto_(c, i); operandos.push({ s: r.texto }); i = r.fin; continue; }
    if (ch === '<') { if (c[i + 1] === '<') { const f = c.indexOf('>>', i); if (f === -1) throw new Error('contenido'); i = f + 2; operandos.push({}); continue; } throw new Error('hexadecimal'); }
    if (ch === '[') {
      let j = i + 1;
      while (j < c.length && c[j] !== ']') { if (c[j] === '(') j = pdfCadenaTexto_(c, j).fin; else if (c[j] === '<') throw new Error('hexadecimal'); else j++; }
      operandos.push({}); i = j + 1; continue;
    }
    if (ch === '/') { let j = i + 1; while (j < c.length && !FIN.test(c[j])) j++; operandos.push({ n: c.substring(i + 1, j) }); i = j; continue; }
    let j = i;
    while (j < c.length && !FIN.test(c[j])) j++;
    if (j === i) { i++; continue; }
    const w = c.substring(i, j);
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) { operandos.push({ v: parseFloat(w) }); continue; }
    if (PDF_OPERADORES_NO_.indexOf(w) !== -1) throw new Error('operador');
    const num = operandos.map(function (o) { return o.v; });
    if (w === 'BT') { x = 0; y = 0; giro = false; }
    else if (w === 'Tf' && operandos.length >= 2) letra = operandos[operandos.length - 2].n || '';
    else if (w === 'Tm' && num.length >= 6) { x = num[4]; y = num[5]; giro = Math.abs(num[1]) > 0.01 || Math.abs(num[2]) > 0.01; }
    else if ((w === 'Td' || w === 'TD') && num.length >= 2) { x += num[num.length - 2]; y += num[num.length - 1]; }
    else if (w === 'Tj' && operandos.length) {
      textos.push({ t: pdfDeCp1252_(operandos[operandos.length - 1].s || ''), x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, f: letra, neg: !!(letras[letra] && letras[letra].neg), g: giro });
    }
    operandos = [];
  }
  return textos;
}

function pdfTextos_(bytes) {
  const mal = function (motivo) { return { ok: false, motivo: motivo, hojas: [] }; };
  try {
    const t = pdfCadena_(bytes);
    if (t.indexOf('%PDF') !== 0 && t.indexOf('%PDF') > 1024) return mal('No es un PDF.');
    if (/\/Encrypt\b/.test(t)) return mal('El PDF está cifrado.');
    const obj = pdfObjetos_(t);
    const hojas = pdfHojas_(obj);
    if (!hojas.length) return mal('El PDF no trae ninguna hoja.');
    const salida = hojas.map(function (h) {
      const letras = pdfLetras_(obj, h);
      let todo = '';
      h.contenidos.forEach(function (n) { if (!obj.objetos[n]) throw new Error('estructura'); todo += pdfContenido_(obj.objetos[n]) + '\n'; });
      return pdfTextosDeContenido_(todo, letras);
    });
    return { ok: true, motivo: '', hojas: salida };
  } catch (e) {
    const m = String(e && e.message || e);
    if (m === 'filtro') return mal('El PDF usa una forma de comprimirse que no sé leer.');
    if (m === 'hexadecimal' || m === 'operador') return mal('El PDF escribe los textos de una forma que no sé leer.');
    return mal('No se ha podido abrir el PDF por dentro.');
  }
}

/* ==== Texto.gs ==== */
/* Leer un fichero como texto SOLO para mirarlo (cabecera, contar). Lo que se guarda son siempre los bytes tal como llegaron. */

/* UTF-8; si sale «�», ISO-8859-1 (así exporta Séneca unos listados). Sin BOM. */
function bytesATexto_(bytes) {
  let t = Utilities.newBlob(bytes).getDataAsString('UTF-8');
  if (t.indexOf('�') !== -1) t = Utilities.newBlob(bytes).getDataAsString('ISO-8859-1');
  return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t;
}

/* Sin etiquetas HTML (Séneca pega alguna en un título), sin comillas ni asteriscos, sin tildes, en minúsculas, sin espacios a los lados ni alrededor de los puntos, espacios seguidos reducidos a uno. */
function normalizarTitulo_(t) {
  return String(t).replace(/^﻿/, '').replace(/<[^>]*>/g, '').replace(/["*]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s*\.\s*/g, '.').replace(/\s+/g, ' ').trim();
}

/* Igual, para el nombre de un fichero (aquí los puntos no se tocan). */
function normalizarNombre_(n) {
  return String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/* El separador que más sale fuera de comillas en la primera línea; si empatan, «;». */
function detectarSeparador_(texto) {
  let comillas = false, puntoComa = 0, coma = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') comillas = !comillas;
    else if (!comillas && (c === '\n' || c === '\r')) break;
    else if (!comillas && c === ';') puntoComa++;
    else if (!comillas && c === ',') coma++;
  }
  return coma > puntoComa ? ',' : ';';
}

/* Un CSV entero en filas de celdas (con comillas dobles). Las líneas vacías se saltan. */
function leerCsv_(texto, separador) {
  const filas = [];
  let fila = [], celda = '', comillas = false;
  const cerrarFila = function () {
    fila.push(celda); celda = '';
    if (fila.length > 1 || fila[0] !== '') filas.push(fila);
    fila = [];
  };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') { if (texto[i + 1] === '"') { celda += '"'; i++; } else comillas = false; }
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === separador) { fila.push(celda); celda = ''; }
    else if (c === '\n') cerrarFila();
    else if (c !== '\r') celda += c;
  }
  if (celda !== '' || fila.length) cerrarFila();
  return filas;
}

function huella_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/* 1240 → «1.240» */
function numeroLegible_(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

/* ==== Catalogo.gs ==== */
/* El catálogo de listados. Es una tabla de datos: añadir un listado es añadir una entrada aquí y una prueba.
   El orden es el del contrato (el de la tabla de la página).
   columnas / sinColumnas: títulos que tiene que haber / que no puede haber (se comparan normalizados).
   nombre: cómo tiene que empezar el nombre del fichero (normalizado). cuenta: qué se cuenta y cómo se llama.
   ficha: de dónde sale cada dato de la ficha (curso, ambito, periodo); lo que no aparece no toca en ese listado.
   soloNombre: se reconoce solo por cómo empieza el nombre (cualquier extensión). siempre: sale en gris si falta.
   tambienEn: dónde hay que subirlo todavía a mano en otra aplicación.
   algunaColumna: al menos una de estas tiene que estar. columnasQueContienen: tiene que haber una columna cuyo título contenga cada una de estas palabras. */
const NIVELES_ = [
  { valor: 'eso1', texto: '1º ESO' }, { valor: 'eso2', texto: '2º ESO' }, { valor: 'eso3', texto: '3º ESO' }, { valor: 'eso4', texto: '4º ESO' },
  { valor: 'bac1c', texto: '1º Bachillerato de Ciencias y Tecnología' }, { valor: 'bac1h', texto: '1º Bachillerato de Humanidades y Ciencias Sociales' },
  { valor: 'bac2c', texto: '2º Bachillerato de Ciencias y Tecnología' }, { valor: 'bac2h', texto: '2º Bachillerato de Humanidades y Ciencias Sociales' }
];
/* A quién se refiere cada fichero de admisión, de planificación y de matrícula provisional (fila 19). */
const AMBITOS_GRADO_ = ['eso1', 'eso2', 'eso3', 'eso4', 'bac1h', 'bac1c', 'bac2h', 'bac2c'].map(function (v) { return NIVELES_.filter(function (n) { return n.valor === v; })[0]; })
  .concat([{ valor: 'aula-especifica', texto: 'Aula específica' }]);
const AMBITOS_MODALIDAD_ = ['bac2c', 'bac2h'].map(function (v) { return NIVELES_.filter(function (n) { return n.valor === v; })[0]; }).concat([{ valor: '', texto: 'Las dos modalidades' }]);
/* Los niveles de los libros de texto (fila 37): los de la matrícula y, por si Séneca da un solo listado para las dos modalidades, 1º y 2º de Bachillerato enteros. */
const AMBITOS_LIBROS_ = NIVELES_.concat([{ valor: 'bac1', texto: '1º Bachillerato (las dos modalidades)' }, { valor: 'bac2', texto: '2º Bachillerato (las dos modalidades)' }]);
const AMBITOS_PERSONAL_ = [
  { valor: 'docentes', texto: 'Docentes' }, { valor: 'no-docentes', texto: 'No docentes' }, { valor: '', texto: 'Todo el personal' }
];
const TAMBIEN_EN_BD_ = 'BD Alumnado, en «Datos de Séneca»';
const USAN_A_MANO_ = 'BD Alumnado (a mano)';

const CATALOGO_ = [
  { clave: 'alumnado', titulo: 'Alumnado', traeFila: 'El listado de Séneca, tal como lo bajas.', tipo: 'csv', usan: 'Gestor de asuntos, BD Alumnado', dias: 30, siempre: true, ficha: {},
    columnas: ['Alumno/a', 'Nº Id. Escolar', 'Año de la matrícula', 'Estado Matrícula'],
    cuenta: { modo: 'distintos', columna: 'Nº Id. Escolar', uno: 'alumno', varios: 'alumnos' } },
  { clave: 'matricula', titulo: 'Matrícula', tipo: 'csv', usan: 'BD Alumnado', dias: 30, siempre: true, queEs: 'una matrícula',
    nombre: ['matomcmatr'], columnas: ['Alumno/a', 'Unidad'], ficha: { curso: 'nombre', ambito: 'nivel' },
    ambitos: NIVELES_, preguntaAmbito: 'de qué nivel es',
    cuenta: { modo: 'filas', uno: 'alumno', varios: 'alumnos' } },
  { clave: 'personal', titulo: 'Personal del centro', tipo: 'csv', usan: 'Gestor de asuntos', dias: 90, siempre: true, queEs: 'personal del centro',
    columnas: ['Empleado/a', 'DNI/Pasaporte', 'Puesto'], ficha: { curso: 'nombre', ambito: 'personal' },
    ambitos: AMBITOS_PERSONAL_, preguntaAmbito: 'si es docente o no docente',
    cuenta: { modo: 'filas', uno: 'persona', varios: 'personas' } },
  { clave: 'libros', titulo: 'Libros de texto', tipo: 'csv', usan: 'Gestor de asuntos (más adelante)', dias: 365, queEs: 'el listado de libros de texto',
    columnas: ['Materia', 'ISBN/EAN', 'Editorial', 'Título'], ficha: { curso: 'nombre', ambito: 'nivelLibros' },
    ambitos: AMBITOS_LIBROS_, preguntaAmbito: 'de qué nivel es',
    cuenta: { modo: 'filas', uno: 'asignatura', varios: 'asignaturas' } },
  { clave: 'tutorias', titulo: 'Función tutorial', tipo: 'pdf', usan: 'Gestor de asuntos', dias: 180, siempre: true, queEs: 'la función tutorial',
    nombre: ['funcion tutorial', 'relfuntut'], ficha: { curso: 'nombre' }, cuenta: { modo: 'ninguno' } },
  { clave: 'consejo-escolar', titulo: 'Consejo Escolar', tipo: 'csv', usan: 'Gestor de asuntos', dias: 365, siempre: true, ficha: { periodo: 'anios' },
    columnas: ['Sector'], algunaColumna: ['Miembro', 'Miembros', 'Miembro(s)'], columnasQueContienen: ['nombramiento', 'cese'],
    cuenta: { modo: 'filas', uno: 'miembro', varios: 'miembros' } },
  { clave: 'registro-entrada', titulo: 'Registro de entrada', tipo: 'csv', usan: 'Gestor de asuntos', dias: 7, siempre: true, queEs: 'un registro de entrada',
    columnas: ['Fecha de registro', 'Extracto', 'Remitente'], sinColumnas: ['Destinatario'], ficha: { curso: { fechas: 'Fecha de registro' } },
    cuenta: { modo: 'filas', uno: 'apunte', varios: 'apuntes' } },
  { clave: 'registro-salida', titulo: 'Registro de salida', tipo: 'csv', usan: 'Gestor de asuntos', dias: 7, siempre: true, queEs: 'un registro de salida',
    columnas: ['Fecha de registro', 'Extracto', 'Destinatario'], sinColumnas: ['Remitente'], ficha: { curso: { fechas: 'Fecha de registro' } },
    cuenta: { modo: 'filas', uno: 'apunte', varios: 'apuntes' } },
  { clave: 'alumnado-bd', titulo: 'Alumnado completo', tituloFila: 'Ficha del alumno (la monta la aplicación)', traeFila: 'Todo lo de cada alumno junto, de todos los listados y de BD Alumnado.', tipo: 'json', usan: 'Gestor de asuntos', dias: 30, siempre: true, ficha: {},
    nombre: ['alumnado-bd.json'], json: { numero: 'acuerdo', listas: ['campos', 'alumnos'] },
    cuenta: { modo: 'json', lista: 'alumnos', uno: 'alumno', varios: 'alumnos' } },
  /* Los que antes se subían solo en BD Alumnado: se reconocen por cómo empieza el nombre. */
  { clave: 'censo-neae', titulo: 'Censo NEAE', soloNombre: true, nombre: ['regalunee'], usan: USAN_A_MANO_, dias: 90, queEs: 'el censo NEAE',
    ficha: { curso: 'nombre' }, tambienEn: TAMBIEN_EN_BD_ },
  { clave: 'admision', titulo: 'Solicitudes de admisión', soloNombre: true, nombre: ['regrelsolreggen'], usan: USAN_A_MANO_, dias: 365,
    queEs: 'el listado de solicitudes de admisión', ficha: { curso: 'nombre', ambito: 'grado' }, ambitos: AMBITOS_GRADO_, preguntaAmbito: 'de qué grado son', tambienEn: TAMBIEN_EN_BD_ },
  { clave: 'admision-extraordinaria', titulo: 'Solicitudes de admisión extraordinaria', soloNombre: true, nombre: ['regsollarcur'], usan: USAN_A_MANO_, dias: 365,
    queEs: 'el listado de solicitudes de admisión extraordinaria', ficha: { curso: 'nombre' }, tambienEn: TAMBIEN_EN_BD_ },
  { clave: 'resolucion-admision', titulo: 'Resolución de admisión', soloNombre: true, nombre: ['resolucionadmision'], usan: USAN_A_MANO_, dias: 365,
    queEs: 'la resolución de admisión', ficha: { curso: 'nombre' }, tambienEn: TAMBIEN_EN_BD_ },
  { clave: 'sobres-matricula', titulo: 'Sobres de matrícula', tipo: 'csv', soloNombre: true, ademasPorColumnas: true, nombre: ['solicitudestelematicas'], columnas: ['Alumno/a', 'Curso', 'Matriculación'],
    usan: USAN_A_MANO_, dias: 365, queEs: 'el listado de sobres de matrícula', ficha: { curso: 'nombre' }, tambienEn: TAMBIEN_EN_BD_ },
  { clave: 'matricula-provisional', titulo: 'Matrícula provisional', tipo: 'csv', soloNombre: true, ademasPorColumnas: true, nombre: ['regmatpro'], columnas: ['Alumno/a', 'Procedencia'],
    algunaColumna: ['Fecha de matriculación provisional', '¿Se matricula posteriormente?'], usan: USAN_A_MANO_, dias: 365, queEs: 'la matrícula provisional',
    ficha: { curso: 'nombre', ambito: 'modalidad' }, ambitos: AMBITOS_MODALIDAD_, preguntaAmbito: 'de qué modalidad es', tambienEn: TAMBIEN_EN_BD_ },
  /* La planificación solo se reconoce por sus columnas, y se mira la última (Séneca no dice con qué nombre la baja). Hay varias por nivel: el tercer trozo de la variante son sus columnas. */
  { clave: 'planificacion', titulo: 'Planificación de matrículas', tipo: 'csv', alFinal: true, nombre: ['planif'], usan: USAN_A_MANO_, dias: 365, queEs: 'la planificación de matrículas',
    ficha: { curso: 'nombre', ambito: 'nivelPlanif', periodo: 'columnas' }, ambitos: NIVELES_, preguntaAmbito: 'de qué nivel es',
    cuenta: { modo: 'planificacion', uno: 'solicitud', varios: 'solicitudes' }, tambienEn: TAMBIEN_EN_BD_ },
  /* Los ficheros de un solo alumno: van en su propio índice (indice-alumnos.json) y el alumno sale del nombre del fichero.
     El de Secundaria se mira antes: «RegDetExpEle Seco Ruiz, Luis» es de Primaria. */
  { clave: 'expediente-secundaria', titulo: 'Expediente de Secundaria', tituloFila: 'Expedientes de Secundaria', soloNombre: true, porAlumno: true,
    nombreRe: /^regdetexpele sec(?: |\.[a-z0-9]{1,5}$|$)/, usan: 'BD Alumnado', dias: 365, queEs: 'un expediente de Secundaria', ficha: { alumno: 'nombre' }, tambienEn: TAMBIEN_EN_BD_ },
  { clave: 'expediente-primaria', titulo: 'Expediente de Primaria', tituloFila: 'Expedientes de Primaria', soloNombre: true, porAlumno: true,
    nombre: ['regdetexpele'], usan: 'BD Alumnado', dias: 365, queEs: 'un expediente de Primaria', ficha: { alumno: 'nombre' }, tambienEn: TAMBIEN_EN_BD_ },
  /* Lo que las aplicaciones entregan al Centro de datos (plan 6.4): «ENTREGA <conjunto> <aplicación>.json». El conjunto va en `ambito` y la aplicación en `periodo`.
     No sale como fila de la tabla ni se puede elegir a mano (oculta). De cada una se guarda la vigente y solo la anterior. */
  { clave: 'entrega', titulo: 'Entregas de las aplicaciones', tipo: 'json', oculta: true, soloUltimaAnterior: true, usan: 'Centro de datos', dias: 365,
    nombreRe: /^entrega [a-z0-9-]+ [a-z0-9-]+\.json$/, json: { numero: 'entrega', listas: ['campos', 'registros'] }, ficha: {},
    cuenta: { modo: 'json', lista: 'registros', uno: 'registro', varios: 'registros' } }
];

function entradaCatalogo_(clave) {
  return CATALOGO_.filter(function (c) { return c.clave === clave; })[0] || tiposAprendidos_().filter(function (c) { return c.clave === clave; })[0] || null;
}

function textoNivel_(valor) {
  const n = NIVELES_.filter(function (x) { return x.valor === valor; })[0];
  return n ? n.texto : valor;
}

/* «Docentes», «1º ESO»… a partir del valor de «a quién se refiere» de un listado. */
function textoAmbito_(clave, valor) {
  const c = entradaCatalogo_(clave);
  const a = c && c.ambitos ? c.ambitos.filter(function (x) { return x.valor === (valor || ''); })[0] : null;
  return a ? a.texto : (valor || '');
}

/* El curso escolar de hoy («26-27»). El curso empieza el 1 de septiembre. */
function parDeCursos_(y) { return String(y % 100).padStart(2, '0') + '-' + String((y + 1) % 100).padStart(2, '0'); }

/* El año en que empieza el curso de hoy (2026 para «26-27»). */
function anioInicioActual_() {
  const hoy = new Date();
  return hoy.getMonth() >= 8 ? hoy.getFullYear() : hoy.getFullYear() - 1;
}

function cursoActual_() { return parDeCursos_(anioInicioActual_()); }

/* El año en que empieza un curso («99-00» → 1999, «26-27» → 2026). Dos cifras dicen un solo año: el más reciente que no pase del siguiente al actual. */
function anioDeCurso_(curso) {
  const aa = +String(curso).slice(0, 2), y = 2000 + aa;
  return y <= anioInicioActual_() + 1 ? y : 1900 + aa;
}

/* ¿Es «aa-bb» con los dos números seguidos («99-00» sí, «99-01» no)? */
function cursoValido_(curso) {
  const m = /^(\d\d)-(\d\d)$/.exec(String(curso));
  return !!m && +m[2] === (+m[1] + 1) % 100;
}

/* Para ordenar: el año de un curso, y -1 si no hay curso. */
function ordenDeCurso_(curso) { return cursoValido_(curso) ? anioDeCurso_(curso) : -1; }

/* El primer curso del que el centro guarda datos, según Francisco. */
const PRIMER_CURSO_ANIO_ = 1989;

/* Lo que ofrece el desplegable: del curso siguiente al actual hasta 89-90, el más reciente arriba. */
function cursosParaElegir_() {
  const lista = [];
  for (let y = anioInicioActual_() + 1; y >= PRIMER_CURSO_ANIO_; y--) lista.push(parDeCursos_(y));
  return lista;
}

/* Cursos sin repetir, el más reciente arriba. */
function ordenarCursos_(cursos) {
  const vistos = {};
  return cursos.filter(function (c) { if (!cursoValido_(c) || vistos[c]) return false; vistos[c] = true; return true; })
    .sort(function (a, b) { return anioDeCurso_(b) - anioDeCurso_(a); });
}

/* ==== Ficha.gs ==== */
/* La ficha de un fichero: qué es, de qué curso, a quién se refiere y de qué periodo. Aquí se interpretan las fuentes que el catálogo nombra.
   Lo que la aplicación duda, no lo supone: lo pone en `falta`. La única suposición permitida es el curso elegido en la página. */
const DOCENTES_ = ['profesor', 'maestr', 'catedr', 'orientador', 'p.e.s', 'p.t.f.p'];
const NO_DOCENTES_ = ['no docente', 'administrativ', 'ordenanza', 'conserje', 'limpia', 'monitor', 'educador', 'interprete', 'p.a.s', 'laboral'];

/* El curso que dice un nombre, siempre como «aa-bb»; «» si no dice ninguno o dice una fecha. Se prueban cuatro formas, por orden, y la primera que vale decide:
   larga («1999-2000»), mixta («1999-00»), corta («99-00», «26/27») y pegada («9900», que no empieza por 19 ni 20 porque eso es un año).
   Nunca dentro de una cadena de números: «09-10-2015» o «2015-09-10» son fechas. */
const CURSO_SEP_ = '\\s*[-–/_]\\s*';
const CURSO_ANTES_ = '(?<!\\d)(?<!\\d[-–/._])', CURSO_DESPUES_ = '(?!\\d)(?![-–/._]\\d)';

function cursoDelNombre_(nombre) {
  const t = String(nombre), tope = anioInicioActual_() + 1;
  const empiezaAnio = function (x) { return /^(19|20)/.test(x); };
  const enVentana = function (y) { return y >= tope - 99 && y <= tope; };
  const siguiente = function (a, b) { return +b === (+a + 1) % 100; };
  const formas = [
    ['(\\d{4})' + CURSO_SEP_ + '(\\d{4})', function (m) { return empiezaAnio(m[1]) && empiezaAnio(m[2]) && +m[2] === +m[1] + 1 && enVentana(+m[1]) ? +m[1] : 0; }],
    ['(\\d{4})' + CURSO_SEP_ + '(\\d\\d)', function (m) { return empiezaAnio(m[1]) && siguiente(m[1], m[2]) && enVentana(+m[1]) ? +m[1] : 0; }],
    ['(\\d\\d)' + CURSO_SEP_ + '(\\d\\d)', function (m) { return siguiente(m[1], m[2]) ? anioDeCurso_(m[1] + '-' + m[2]) : 0; }],
    ['(\\d\\d)(\\d\\d)', function (m) { return !/^(19|20)$/.test(m[1]) && siguiente(m[1], m[2]) ? anioDeCurso_(m[1] + '-' + m[2]) : 0; }]
  ];
  for (let i = 0; i < formas.length; i++) {
    const re = new RegExp(CURSO_ANTES_ + formas[i][0] + CURSO_DESPUES_, 'g');
    let m;
    while ((m = re.exec(t))) {
      const anio = formas[i][1](m);
      if (anio) return parDeCursos_(anio);
    }
  }
  return '';
}

function nivelDelNombre_(nombre) {
  let m = /([1-4])\s*º\s*eso/i.exec(nombre);
  if (m) return 'eso' + m[1];
  m = /([12])\s*º\s*bach[^a-z0-9]*([ch])(?![a-z])/i.exec(nombre);
  return m ? 'bac' + m[1] + m[2].toLowerCase() : '';
}

/* El nivel de un listado de libros: «RegAsiLibMat1_ESO» → eso1; Bachillerato con su modalidad (c/h) → bac1c…; sin modalidad → bac1 (las dos). '' si no queda claro. */
function nivelLibrosDelNombre_(nombre) {
  let m = /(?<![0-9])([1-4])\s*[º°_\s-]*\s*eso(?![a-z])/i.exec(nombre);
  if (m) return 'eso' + m[1];
  m = /(?<![0-9])([12])\s*[º°_\s-]*\s*bach[a-z]*(?:[^a-z0-9]+([ch])(?![a-z]))?/i.exec(nombre);
  return m ? 'bac' + m[1] + (m[2] ? m[2].toLowerCase() : '') : '';
}

function aniosDelNombre_(nombre) {
  const m = /(?<!\d)(\d{4})-(\d{4})(?!\d)/.exec(nombre);
  return m ? m[1] + '-' + m[2] : '';
}

/* La fecha más reciente (dd/mm/aaaa) de una columna dice el curso: empieza el 1 de septiembre. «» si no hay ninguna legible. */
function cursoPorFechas_(filas, columna) {
  const col = (filas[0] || []).map(normalizarTitulo_).indexOf(normalizarTitulo_(columna));
  if (col === -1) return '';
  let mejor = 0;
  filas.slice(1).forEach(function (f) {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(f[col] || '');
    if (!m) return;
    const t = (+m[3]) * 10000 + (+m[2]) * 100 + (+m[1]);
    if (t > mejor) mejor = t;
  });
  if (!mejor) return '';
  const anio = Math.floor(mejor / 10000), mes = Math.floor(mejor / 100) % 100;
  return parDeCursos_(mes >= 9 ? anio : anio - 1);
}

/* ¿Alguna de las listas de trozos de texto conoce este puesto? */
function puestoConocido_(puesto) {
  return NO_DOCENTES_.concat(DOCENTES_).some(function (x) { return puesto.indexOf(x) !== -1; });
}

/* Un puesto (ya normalizado) es de docentes, de no docentes o no se sabe (''): primero lo aprendido, después las dos listas de trozos. */
function ambitoDeUnPuesto_(p, aprendidos) {
  if (aprendidos[p] === 'no-docentes') return 'no-docentes';
  if (aprendidos[p] === 'docentes') return 'docentes';
  if (NO_DOCENTES_.some(function (x) { return p.indexOf(x) !== -1; })) return 'no-docentes';
  if (DOCENTES_.some(function (x) { return p.indexOf(x) !== -1; })) return 'docentes';
  return '';
}

/* Personal docente o no docente según la columna «Puesto»: { valor, duda, propuesta }. */
function ambitoPorPuestos_(filas) {
  const col = (filas[0] || []).map(normalizarTitulo_).indexOf('puesto');
  const aprendidos = aprendido_().valores['personal|puesto'] || {};
  let docentes = 0, no = 0, otros = 0;
  filas.slice(1).forEach(function (f) {
    const p = normalizarTitulo_(f[col] || '');
    if (!p) return;
    const a = ambitoDeUnPuesto_(p, aprendidos);
    if (a === 'no-docentes') no++;
    else if (a === 'docentes') docentes++;
    else otros++;
  });
  const mayoria = no > docentes ? 'no-docentes' : docentes > 0 ? 'docentes' : '';
  if (otros > 0 || docentes + no === 0) return { valor: '', duda: true, propuesta: mayoria };
  if (docentes && no) return { valor: '', duda: false, propuesta: '' };
  return { valor: docentes ? 'docentes' : 'no-docentes', duda: false, propuesta: '' };
}

/* El alumno de un fichero de «RegDetExpEle [SEC] Apellidos, Nombre (1).csv»: sin extensión, sin «(1)» y sin el prefijo. */
function alumnoDelNombre_(nombre) {
  return String(nombre).replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/\s*\(\d+\)\s*$/, '')
    .replace(/^\s*regdetexpele(?:\s+sec(?=\s|$))?/i, '').replace(/^[\s_-]+/, '').replace(/\s+/g, ' ').trim();
}

/* «Pérez Gil, Ana» → «perez-gil-ana». Sin ninguna letra, «». */
function claveDeAlumno_(texto) {
  const k = normalizarNombre_(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return /[a-z]/.test(k) ? k : '';
}

/* La variante de un listado: las partes no vacías de curso, a quién se refiere y periodo, unidas con «/». */
function varianteDeFicha_(f) {
  return [f.cursoEscolar, f.ambito, f.periodo].filter(function (x) { return x; }).join('/');
}

function fichaVacia_() { return { cursoEscolar: '', ambito: '', periodo: '', alumno: '' }; }

/* Saca la ficha de un listado del catálogo. `filas` son las filas de un CSV (o []).
   Devuelve { ficha, falta, cursoSupuesto, propuesta } con `falta` ⊂ ['cursoEscolar', 'ambito']. */
function sacarFicha_(c, nombre, filas, opciones) {
  const reglas = c.ficha || {}, ficha = fichaVacia_(), falta = [], propuesta = {};
  let supuesto = false;
  if (reglas.curso) {
    let curso = reglas.curso === 'nombre' ? cursoDelNombre_(nombre) : cursoPorFechas_(filas, reglas.curso.fechas);
    if (!curso && opciones.cursoElegido) { curso = opciones.cursoElegido; supuesto = true; }
    if (curso) ficha.cursoEscolar = curso; else falta.push('cursoEscolar');
  }
  if (reglas.ambito === 'nivel') {
    ficha.ambito = nivelDelNombre_(nombre);
    if (!ficha.ambito) falta.push('ambito');
  } else if (reglas.ambito === 'personal') {
    if (/no ?docente/.test(normalizarNombre_(nombre))) ficha.ambito = 'no-docentes';
    else {
      const a = ambitoPorPuestos_(filas);
      ficha.ambito = a.valor;
      if (a.duda) { falta.push('ambito'); if (a.propuesta) propuesta.ambito = a.propuesta; }
    }
  }
  if (reglas.ambito === 'grado' || reglas.ambito === 'nivelPlanif' || reglas.ambito === 'nivelLibros') {
    /* Del nombre; si no lo dice, lo que se contestó una vez para un fichero con ese mismo nombre; si no, es duda. */
    const dicho = reglas.ambito === 'grado' ? gradoDelNombre_(nombre) : reglas.ambito === 'nivelLibros' ? nivelLibrosDelNombre_(nombre) : nivelPlanifDelNombre_(nombre);
    ficha.ambito = dicho || ((aprendido_().valores[c.clave + '|ambito'] || {})[normalizarNombre_(nombre)] || '');
    if (!ficha.ambito) falta.push('ambito');
  } else if (reglas.ambito === 'modalidad') {
    ficha.ambito = modalidadDeProvisional_(filas);
  }
  if (reglas.periodo === 'anios') ficha.periodo = aniosDelNombre_(nombre);
  else if (reglas.periodo === 'columnas') ficha.periodo = columnasDePlanificacion_(filas[0] || []);
  let alumnoNombre = '';
  if (reglas.alumno === 'nombre') {
    alumnoNombre = alumnoDelNombre_(nombre);
    ficha.alumno = claveDeAlumno_(alumnoNombre);
    if (!ficha.alumno) falta.push('alumno');
  }
  return { ficha: ficha, falta: falta, cursoSupuesto: supuesto, propuesta: propuesta, alumnoNombre: ficha.alumno ? alumnoNombre : '' };
}

/* «Es personal del centro, pero no sé de qué curso es ni si es docente o no docente.» */
function motivoDeFalta_(c, falta) {
  const partes = falta.map(function (f) { return f === 'cursoEscolar' ? 'de qué curso es' : f === 'periodo' ? 'de qué periodo es' : f === 'alumno' ? 'de qué alumno es' : c.preguntaAmbito; });
  return 'Es ' + (c.queEs || c.titulo) + ', pero no sé ' + partes.join(' ni ') + '.';
}

/* ==== FichaAdmision.gs ==== */
/* A quién se refieren los ficheros de admisión, de planificación y de matrícula provisional (fila 19). Reglas de referencia/bd-alumnado/Admision.gs, Planificacion.gs y Provisionales.gs.
   La planificación se reconoce por sus columnas: nadie sabe con qué nombre la baja Séneca. */

/* El grado que dice el nombre de un fichero de solicitudes: «aula específica», «1º BACH-h», «1º ESO» (con o sin «º»). */
function gradoDelNombre_(nombre) {
  if (/aula\s*espec/i.test(nombre)) return 'aula-especifica';
  const bac = String(nombre).match(/([12])\s*º?\s*bach[^a-z0-9]*([ch])\b/i);
  if (bac) return 'bac' + bac[1] + bac[2].toLowerCase();
  const eso = String(nombre).match(/([1-4])\s*º?\s*eso/i);
  return eso ? 'eso' + eso[1] : '';
}

/* El nivel que propone el nombre de una planificación (acepta «1ESO», «1_ESO», «2 BACH CIENCIAS», «2º BACH-h»). Bachillerato sin modalidad es duda: ''. */
function nivelPlanifDelNombre_(nombre) {
  const m = String(nombre || '').match(/([1-4])[ºo°\s_.\-]*(ESO|BACH|EBE)(?:[\s_.\-]*(CIENCIAS|HUMANIDADES|C|H)(?![A-Za-z]))?/i);
  if (!m) return '';
  const etapa = m[2].toUpperCase();
  if (etapa === 'ESO') return 'eso' + m[1];
  if (etapa === 'EBE' || !m[3] || +m[1] > 2) return '';
  return 'bac' + m[1] + (m[3].toLowerCase().charAt(0) === 'c' ? 'c' : 'h');
}

/* Columnas de otros ficheros de Séneca que ya conocemos: si aparecen, no es una planificación. */
const PLANIF_COLUMNAS_AJENAS_ = ['unidad', 'nº id. escolar', 'n id. escolar', 'dni/pasaporte', 'fecha de nacimiento', 'primer apellido', 'segundo apellido', 'estado matricula', 'matriculacion',
  'fecha de presentacion', 'centro de procedencia', 'centro solicitado', 'estado de la solicitud', 'numero solicitud', 'total puntos', 'nota media eso', 'nie',
  'estado de la solicitud tramitada por el centro', 'necesidades especificas de apoyo educativo', 'ano academico', 'procedencia'];

/* ¿Son estas columnas las de una planificación? Primera «Nombre», «Alumno/a» o «Alumno»; al menos cuatro; alguna asignatura desde la cuarta; y ninguna de los otros listados. `titulos` va normalizada. */
function cabeceraDePlanificacion_(titulos) {
  const ajenas = PLANIF_COLUMNAS_AJENAS_.map(normalizarTitulo_);
  if (titulos.length < 4 || ['nombre', 'alumno/a', 'alumno'].indexOf(titulos[0]) === -1) return false;
  if (titulos.some(function (x, i) { return i > 0 && ajenas.indexOf(x) !== -1; })) return false;
  return titulos.slice(3).some(function (x) { return !!x; });
}

/* El tercer trozo de la variante de una planificación: «col-» y ocho letras de la huella de sus asignaturas (desde la cuarta columna), normalizadas y ordenadas. */
function columnasDePlanificacion_(cabecera) {
  const asig = cabecera.slice(3).map(normalizarTitulo_).filter(String).sort();
  return 'col-' + huella_(Utilities.newBlob(asig.join('|')).getBytes()).slice(0, 8);
}

/* 'bac2c' | 'bac2h' | '' según la columna «Procedencia»: todas de Ciencias, todas de Humanidades, o de las dos / ninguna. */
function modalidadDeProvisional_(filas) {
  const col = (filas[0] || []).map(normalizarTitulo_).indexOf('procedencia');
  if (col === -1) return '';
  let c = 0, h = 0;
  filas.slice(1).forEach(function (f) {
    const p = normalizarTitulo_(f[col] || '');
    if (p.indexOf('humanidades') !== -1) h++; else if (p.indexOf('ciencias') !== -1) c++;
  });
  return c && !h ? 'bac2c' : (h && !c ? 'bac2h' : '');
}

/* ==== RepasoAdmision.gs ==== */
/* Repaso de una sola vez (fila 19): lo de admisión, planificación y matrícula provisional que ya estaba guardado antes de que llevara grado, nivel o modalidad.
   Se vuelve a reconocer cada fichero con las reglas nuevas, como al recolocar, y solo se mueven ficheros. No marca el índice como ocupado: las subidas siguen funcionando.
   El avance vive en _interno/repaso-admision.json: { empezado, total, hechos, sitio, sinClasificar, terminado, pendientes: [ como en recolocar.json ] }. */
const REPASO_ADMISION_CLAVES_ = ['admision', 'planificacion', 'matricula-provisional'];

function leerRepasoAdmision_(raiz) {
  return leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'repaso-admision.json');
}

function escribirRepasoAdmision_(raiz, estado) {
  escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), 'repaso-admision.json', estado);
}

/* Lista lo que hay que repasar: los vigentes (que salen del índice) y lo que está en anteriores/. Guarda antes una copia del índice. */
function prepararRepasoAdmision_(raiz, indice) {
  const movimientos = leerMovimientos_(raiz);
  const lista = [];
  const quedan = [];
  indice.listados.forEach(function (e) {
    if (REPASO_ADMISION_CLAVES_.indexOf(e.clave) === -1) { quedan.push(e); return; }
    lista.push({ idDrive: e.idDrive, nombre: e.fichero, fecha: e.subido, quien: e.subidoPor || 'recolocado', via: e.via || 'recolocado', vigente: 1,
      claveAntes: e.clave, fichaAntes: { cursoEscolar: e.cursoEscolar || '', ambito: e.ambito || '' } });
  });
  REPASO_ADMISION_CLAVES_.forEach(function (clave) {
    const ant = raiz.getFoldersByName('anteriores');
    const base = ant.hasNext() ? ant.next().getFoldersByName(clave) : null;   // sin crear carpetas vacías
    if (!base || !base.hasNext()) return;
    recorrerFicheros_(base.next(), function (f) {
      const m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d) (.*)$/.exec(f.getName());
      const fecha = m ? isoDePrefijo_(m) : ahoraMadrid_(f.getDateCreated());
      const nombre = m ? m[7] : f.getName();
      const q = quienSubio_(movimientos, nombre, fecha);
      lista.push({ idDrive: f.getId(), nombre: nombre, fecha: fecha, quien: q.quien, via: q.via, vigente: 0 });
    });
  });
  if (lista.length) subcarpetaPorRuta_(raiz, '_interno').createFile('indice-antes-del-repaso-admision.json', JSON.stringify(indice, null, 2), 'application/json');
  lista.sort(function (a, b) { return (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) || (a.vigente - b.vigente); });
  lista.forEach(function (p) { delete p.vigente; });
  const est = { empezado: ahoraMadrid_(), total: lista.length, hechos: 0, sitio: 0, sinClasificar: 0, terminado: false, pendientes: lista };
  escribirRepasoAdmision_(raiz, est);
  indice.listados = quedan;
  escribirIndice_(raiz, indice);
  return est;
}

/* Si toca, prepara y avanza hasta `topeMs` (como mínimo un fichero por llamada). Devuelve { hechos, total } mientras quede algo, y null si no hay nada que hacer. */
function repasarAdmision_(raiz, topeMs) {
  let est = leerRepasoAdmision_(raiz);
  if (est && est.terminado) return null;
  if (!est) {
    const rec = leerRecolocar_(raiz);
    const indice = leerIndice_(raiz);
    if (indice.ocupado || (rec && !rec.terminado) || !indice.contrato || indice.contrato < 2) return null;   // primero se termina lo otro; sin índice, no hay nada
    cargarAprendido_(raiz);
    est = prepararRepasoAdmision_(raiz, indice);
  }
  const inicio = new Date().getTime();
  while (est.pendientes.length) {
    const p = est.pendientes[0];
    const que = recolocarUno_(raiz, p);
    est.pendientes.shift();
    est.hechos++;
    if (que === 'sitio') est.sitio++;
    else if (que === 'sinClasificar') est.sinClasificar++;
    escribirRepasoAdmision_(raiz, est);
    if (new Date().getTime() - inicio >= topeMs) break;
  }
  if (est.pendientes.length) return { hechos: est.hechos, total: est.total };
  est.terminado = true;
  escribirRepasoAdmision_(raiz, est);
  if (est.total) apuntarMovimiento_(raiz, { quien: 'recolocado', via: 'recolocado', fichero: '', que: 'guardado',
    mensaje: 'Repasados los ficheros de admisión, planificación y matrícula provisional: ' + frasePlural_(est.sitio, 'fichero', 'ficheros') + ' en su sitio y ' + est.sinClasificar + ' en «Sin clasificar».' });
  return null;
}

/* ==== Aprendido.gs ==== */
/* Lo que Francisco enseña a la aplicación al completar una ficha a mano. Vive en _interno/aprendido.json (se muda con la carpeta):
   { tipos:    [ { clave, titulo, usaCurso, usaPeriodo, ambitos: [ { valor, texto } ], creado, creadoPor } ],
     columnas: [ { titulos: [ ordenados y normalizados ], clave } ],
     nombres:  [ { empieza, clave } ],
     valores:  { 'personal|puesto': { 'valor normalizado': 'docentes' | 'no-docentes' } } }
   Lo aprendido nunca pasa por encima del catálogo: solo se mira cuando nada del catálogo encaja. Solo dice «qué es». */
var APRENDIDO_ = null;

const PERIODOS_ = [
  { valor: 'ev1', texto: '1ª evaluación' }, { valor: 'ev2', texto: '2ª evaluación' }, { valor: 'ev3', texto: '3ª evaluación' },
  { valor: 'ordinaria', texto: 'Evaluación ordinaria' }, { valor: 'extraordinaria', texto: 'Evaluación extraordinaria' }
];

function aprendidoVacio_() { return { tipos: [], columnas: [], nombres: [], valores: {} }; }

/* Lo ya cargado en esta ejecución (sin tocar Drive). */
function aprendido_() { return APRENDIDO_ || aprendidoVacio_(); }

function cargarAprendido_(raiz) {
  APRENDIDO_ = Object.assign(aprendidoVacio_(), leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'aprendido.json') || {});
  return APRENDIDO_;
}

function escribirAprendido_(raiz) {
  escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), 'aprendido.json', aprendido_());
}

/* Un tipo aprendido con la forma de una entrada del catálogo, para que el resto del programa lo trate igual. */
function tipoComoCatalogo_(t) {
  return { clave: t.clave, titulo: t.titulo, tipo: 'aprendido', aprendido: true, soloNombre: true, usan: '', dias: 365, queEs: '«' + t.titulo + '»',
    porAlumno: !!t.porAlumno, usaCurso: !!t.usaCurso, usaPeriodo: !!t.usaPeriodo, ambitos: t.ambitos || [], preguntaAmbito: 'a quién se refiere', ficha: {} };
}

function tiposAprendidos_() { return aprendido_().tipos.map(tipoComoCatalogo_); }

function todosLosTipos_() { return CATALOGO_.concat(tiposAprendidos_()); }

function textoPeriodo_(valor) {
  if (/^col-[0-9a-f]{8}$/.test(String(valor))) return '';   // las columnas de una planificación no se enseñan
  const p = PERIODOS_.filter(function (x) { return x.valor === valor; })[0];
  return p ? p.texto : (valor || '');
}

function valorValidoDePeriodo_(v) { return PERIODOS_.some(function (x) { return x.valor === v; }) || /^\d{4}-\d{4}$/.test(v) || /^col-[0-9a-f]{8}$/.test(v); }

/* «Horario del profesorado» → «horario-del-profesorado». */
function claveDeTitulo_(texto) {
  return normalizarNombre_(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function ordenarTitulos_(titulos) {
  return titulos.filter(function (t, i) { return titulos.indexOf(t) === i; }).sort();
}

/* La clave que dice lo aprendido de un fichero, o ''. Las columnas valen para un CSV; los nombres, para lo demás. */
function claveAprendida_(nombre, tipo, titulos) {
  const a = aprendido_();
  let r = null;
  if (tipo === 'csv' && titulos.length) {
    const t = ordenarTitulos_(titulos).join('|');
    r = a.columnas.filter(function (x) { return x.titulos.join('|') === t; })[0];
  } else if (tipo !== 'csv') {
    const n = llaveDeNombre_(nombre);
    r = a.nombres.filter(function (x) { return n.indexOf(x.empieza) === 0; })[0];
  }
  return r && entradaCatalogo_(r.clave) ? r.clave : '';
}

/* La ficha de un tipo aprendido: el curso sale del nombre (o del elegido), a quién se refiere del texto de uno de sus valores,
   y el periodo siempre es duda. */
function sacarFichaAprendida_(c, nombre, opciones) {
  const ficha = fichaVacia_(), falta = [], n = normalizarNombre_(nombre);
  let supuesto = false;
  if (c.porAlumno) {
    const a = alumnoPorAlumnado_(nombre);
    if (a) ficha.alumno = claveDeAlumno_(a); else falta.push('alumno');
    return { ficha: ficha, falta: falta, cursoSupuesto: false, propuesta: {}, alumnoNombre: a };
  }
  if (c.usaCurso) {
    let curso = cursoDelNombre_(nombre);
    if (!curso && opciones.cursoElegido) { curso = opciones.cursoElegido; supuesto = true; }
    if (curso) ficha.cursoEscolar = curso; else falta.push('cursoEscolar');
  }
  if (c.ambitos.length) {
    const hay = c.ambitos.filter(function (a) { return a.valor && n.indexOf(normalizarNombre_(a.texto)) !== -1; })[0];
    if (hay) ficha.ambito = hay.valor; else falta.push('ambito');
  }
  if (c.usaPeriodo) falta.push('periodo');
  return { ficha: ficha, falta: falta, cursoSupuesto: supuesto, propuesta: {} };
}

/* La clave de un tipo nuevo: la del título, y si ya existe, con -2, -3… Una clave creada no se cambia nunca. */
function claveLibre_(titulo) {
  const base = claveDeTitulo_(titulo);
  if (!base) throw new Error('Escribe el nombre del tipo de fichero con letras.');
  let clave = base, i = 2;
  while (entradaCatalogo_(clave)) clave = base + '-' + i++;
  return clave;
}

/* Lo que se aprende de un pendiente que no se sabía qué era: las columnas de su CSV, o el principio de su nombre. Devuelve la frase, o ''. */
function aprenderQueEs_(p, clave, alumnoNombre) {
  const a = aprendido_();
  if (p.tipo === 'csv' && (p.titulos || []).length) {
    const t = ordenarTitulos_(p.titulos);
    if (a.columnas.some(function (x) { return x.titulos.join('|') === t.join('|'); })) return '';
    a.columnas.push({ titulos: t, clave: clave });
    return 'La próxima vez que llegue un fichero con estas mismas columnas, lo colocaré solo.';
  }
  if (p.tipo === 'csv') return '';
  const sinExtension = llaveDeNombre_(String(p.fichero).replace(/\.[A-Za-z0-9]{1,5}$/, ''));
  let empieza = sinExtension.replace(/\d.*$/, '').trim();
  if (alumnoNombre) {
    /* Un tipo de un solo alumno: lo que hay en el nombre antes del nombre del alumno; si no está, no se aprende nada. */
    const i = (' ' + sinExtension + ' ').indexOf(' ' + llaveDeNombre_(alumnoNombre) + ' ');
    if (i < 0) return '';
    empieza = (' ' + sinExtension + ' ').slice(0, i).trim();
  }
  if (empieza.replace(/[^a-z]/g, '').length < 5 || a.nombres.some(function (x) { return x.empieza === empieza; })) return '';
  a.nombres.push({ empieza: empieza, clave: clave });
  return 'La próxima vez que llegue un fichero con un nombre que empiece así, lo colocaré solo.';
}

/* Los puestos de un fichero de personal que ninguna lista conocía y que Francisco acaba de colocar: se apuntan con su respuesta. */
function aprenderPuestos_(bytes, respuesta) {
  if (respuesta !== 'docentes' && respuesta !== 'no-docentes') return;
  const filas = leerCsv_(bytesATexto_(bytes), detectarSeparador_(bytesATexto_(bytes)));
  const col = (filas[0] || []).map(normalizarTitulo_).indexOf('puesto');
  if (col === -1) return;
  const a = aprendido_();
  const sabidos = a.valores['personal|puesto'] = a.valores['personal|puesto'] || {};
  filas.slice(1).forEach(function (f) {
    const p = normalizarTitulo_(f[col] || '');
    if (p && !sabidos[p] && !puestoConocido_(p)) sabidos[p] = respuesta;
  });
}

/* Lo contestado una vez para un fichero de admisión o de planificación cuyo nombre no decía el grado o el nivel se recuerda por el nombre del fichero. */
function aprenderAmbitoDeNombre_(clave, fichero, ambito) {
  if (!ambito) return;
  const v = aprendido_().valores;
  (v[clave + '|ambito'] = v[clave + '|ambito'] || {})[normalizarNombre_(fichero)] = ambito;
}

/* ==== Alumnos.gs ==== */
/* Los ficheros de un solo alumno (expedientes…): cada tipo tiene un vigente por alumno, todos en alumnos/<clave>/.
   Van en su propio índice, indice-alumnos.json, y en indice.json solo hay una entrada de resumen por tipo (porAlumno: true). */
const ARCHIVO_ALUMNOS_ = 'indice-alumnos.json';
var NOMBRES_ALUMNADO_ = null;

function leerIndiceAlumnos_(raiz) {
  return leerJson_(raiz, ARCHIVO_ALUMNOS_) || { contrato: 2, actualizado: '', listados: [] };
}

function escribirIndiceAlumnos_(raiz, ind) {
  ind.actualizado = ahoraMadrid_();
  escribirJson_(raiz, ARCHIVO_ALUMNOS_, ind);
}

/* «Pérez Gil, Ana» y «perez gil ana» son la misma persona. */
function llaveDeNombre_(t) { return normalizarNombre_(t).replace(/[^a-z0-9]+/g, ' ').trim(); }

/* Los `Alumno/a` del listado de alumnado vigente: [nombre]. Se lee una sola vez por ejecución. */
function nombresAlumnado_(raiz) {
  if (NOMBRES_ALUMNADO_) return NOMBRES_ALUMNADO_;
  const e = buscarEnIndice_(leerIndice_(raiz), 'alumnado', '');
  const vistos = {}, lista = [];
  if (e) {
    try {
      const texto = bytesATexto_(ficheroDeEntrada_(e).getBlob().getBytes());
      const filas = leerCsv_(texto, detectarSeparador_(texto));
      const col = (filas[0] || []).map(normalizarTitulo_).indexOf('alumno/a');
      if (col !== -1) filas.slice(1).forEach(function (f) { const n = (f[col] || '').trim(); if (n && !vistos[n]) { vistos[n] = true; lista.push(n); } });
    } catch (x) { /* sin alumnado legible: sin sugerencias */ }
  }
  NOMBRES_ALUMNADO_ = lista;
  return lista;
}

/* El alumno de un fichero de un tipo aprendido: el nombre completo de alguien del alumnado que esté dentro del nombre del fichero.
   Devuelve el nombre solo si es uno solo. */
function alumnoPorAlumnado_(nombre) {
  const k = ' ' + llaveDeNombre_(String(nombre).replace(/\.[A-Za-z0-9]{1,5}$/, '')) + ' ';
  const hay = nombresAlumnado_(carpetaDatos_()).filter(function (n) { const l = llaveDeNombre_(n); return l && k.indexOf(' ' + l + ' ') !== -1; });
  return hay.length === 1 ? hay[0] : '';
}

function resumenAlumnos_(n) { return n + (n === 1 ? ' alumno' : ' alumnos'); }

/* Guarda un fichero de un solo alumno. Mismas reglas que guardarListado_, con el alumno como parte de la identidad. */
function guardarDeAlumno_(nombre, bytes, rec, quien, via, existente) {
  const c = entradaCatalogo_(rec.clave);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const raiz = carpetaDatos_();
    const ind = leerIndiceAlumnos_(raiz);
    const alumnoNombre = rec.alumnoNombre || alumnoDelNombre_(nombre);
    const alumno = (rec.ficha && rec.ficha.alumno) || claveDeAlumno_(alumnoNombre);
    const limpio = nombreLimpio_(nombre), h = huella_(bytes);
    const llegado = (existente && existente.llegado) || ahoraMadrid_();
    const apuntar = function (que, mensaje) {
      if (existente && existente.sinRegistro) return;
      apuntarMovimiento_(raiz, { quien: quien, via: via, fichero: nombre, que: que, mensaje: mensaje });
    };
    const rutaAnt = 'anteriores/' + rec.clave;
    const previo = ind.listados.filter(function (e) { return e.clave === rec.clave && e.alumno === alumno; })[0] || null;
    if (ind.listados.some(function (e) { return e.clave === rec.clave && e.alumno !== alumno && e.fichero === limpio; })) {
      const m = 'Ya hay un expediente con ese mismo nombre de otro alumno. No lo he guardado encima.';
      if (existente) return { estado: 'sin-clasificar', mensaje: m };
      return enviarASinClasificar_(nombre, bytes, { clave: c.clave, ficha: rec.ficha, falta: ['alumno'], propuesta: {}, motivo: m, tipo: rec.tipo, titulos: [], alumnoNombre: alumnoNombre }, quien, via);
    }
    const moverAAnteriores = function (prefijoDe) {
      existente.fichero.moveTo(subcarpetaPorRuta_(raiz, rutaAnt));
      existente.fichero.setName(prefijoFecha_(prefijoDe) + ' ' + limpio);
    };
    if (previo && previo.huella === h) {
      const m = 'Ya lo tenía: es el mismo fichero del ' + fechaLegible_(previo.subido).split(' ')[0];
      if (existente) { moverAAnteriores(llegado); previo.anteriores = (previo.anteriores || 0) + 1; escribirIndiceAlumnos_(raiz, ind); }
      apuntar('ya', m);
      return { estado: 'ya', mensaje: m };
    }
    if (previo && new Date(previo.subido).getTime() > new Date(llegado).getTime()) {
      if (existente) moverAAnteriores(llegado);
      else subcarpetaPorRuta_(raiz, rutaAnt).createFile(Utilities.newBlob(bytes, MIME_POR_TIPO_[rec.tipo] || MIME_POR_TIPO_.otro, prefijoFecha_(llegado) + ' ' + limpio));
      previo.anteriores = (previo.anteriores || 0) + 1;
      escribirIndiceAlumnos_(raiz, ind);
      const m = 'Guardado como versión anterior: ya hay uno más reciente, del ' + fechaLegible_(previo.subido).split(' ')[0] + '.';
      apuntar('guardado', m);
      return { estado: 'guardado', mensaje: m, clave: rec.clave, variante: '' };
    }
    /* 1. El fichero nuevo; 2. el vigente de antes a anteriores/; 3. su índice; 4. el resumen. */
    const destino = subcarpetaPorRuta_(raiz, 'alumnos/' + rec.clave);
    let nuevo;
    if (existente) { existente.fichero.moveTo(destino); existente.fichero.setName(limpio); nuevo = existente.fichero; }
    else nuevo = destino.createFile(Utilities.newBlob(bytes, MIME_POR_TIPO_[rec.tipo] || MIME_POR_TIPO_.otro, limpio));
    let movido = false;
    if (previo) {
      try {
        const viejo = ficheroDeEntrada_(previo);
        viejo.moveTo(subcarpetaPorRuta_(raiz, rutaAnt));
        viejo.setName(prefijoFecha_(previo.subido) + ' ' + viejo.getName());
        movido = true;
      } catch (e) { /* el anterior ya no estaba en Drive */ }
    }
    const cuenta = contarListado_(c, bytes, rec.tipo);
    const nombreAlumnado = nombresAlumnado_(raiz).map(llaveDeNombre_);
    const entrada = { clave: rec.clave, alumno: alumno, alumnoNombre: alumnoNombre, fichero: limpio, ruta: 'alumnos/' + rec.clave + '/' + limpio, idDrive: nuevo.getId(),
      tipo: rec.tipo, subido: llegado, subidoPor: quien, via: via, bytes: bytes.length, filas: cuenta.filas, huella: h,
      enAlumnado: nombreAlumnado.indexOf(llaveDeNombre_(alumnoNombre)) !== -1, anteriores: (previo ? previo.anteriores || 0 : 0) + (movido ? 1 : 0) };
    if (previo) ind.listados[ind.listados.indexOf(previo)] = entrada; else ind.listados.push(entrada);
    escribirIndiceAlumnos_(raiz, ind);
    ponerResumenAlumnos_(raiz, ind, rec.clave);
    const mensaje = [c.titulo, alumnoNombre, 'guardado'].join(' · ') + (c.tambienEn ? '. De momento también hay que subirlo en ' + c.tambienEn + '.' : '');
    apuntar('guardado', mensaje);
    return { estado: 'guardado', mensaje: mensaje, clave: rec.clave, variante: '' };
  } finally {
    lock.releaseLock();
  }
}

/* En indice.json, una entrada de resumen por tipo con ficheros: así las demás aplicaciones saben que existe, sin cargar con cientos de entradas. */
function ponerResumenAlumnos_(raiz, ind, clave) {
  const indice = leerIndice_(raiz);
  const suyos = ind.listados.filter(function (e) { return e.clave === clave; });
  const n = suyos.length;
  /* La huella del tipo: la de la lista ordenada de las huellas de sus ficheros. Cambia al cambiar, añadir o quitar uno. */
  const huella = huella_(Utilities.newBlob(suyos.map(function (e) { return e.huella; }).sort().join('\n')).getBytes());
  const resumen = { clave: clave, variante: '', porAlumno: true, alumnos: n, indice: ARCHIVO_ALUMNOS_, actualizado: ind.actualizado, resumen: resumenAlumnos_(n), huella: huella };
  const i = indice.listados.map(function (e) { return e.porAlumno && e.clave; }).indexOf(clave);
  if (i === -1) indice.listados.push(resumen); else indice.listados[i] = resumen;
  escribirIndice_(raiz, indice);
}

/* Las filas de la tabla: una por tipo con ficheros, sin color de viejo y válida en todos los cursos. */
function filaDeAlumnos_(c, ind) {
  const suyos = ind.listados.filter(function (e) { return e.clave === c.clave; });
  if (!suyos.length) return null;
  const ultimo = suyos.slice().sort(function (a, b) { return new Date(b.subido).getTime() - new Date(a.subido).getTime(); })[0];
  return { clave: c.clave, variante: '', cursoEscolar: '', nombre: c.tituloFila || c.titulo, ambito: '', periodo: '', estado: 'neutra', etiqueta: '',
    deCuando: 'el último, ' + fechaLegible_(ultimo.subido).split(' ')[0], trae: resumenAlumnos_(suyos.length), usan: c.usan, subidoPor: ultimo.subidoPor || '',
    anteriores: 0, url: '', alumnos: suyos.length };
}

/* Los alumnos de un tipo, por orden alfabético: [{ nombre, fecha, url, anteriores, enAlumnado }]. Se pide al abrir la fila, no en webEstado. */
function webAlumnosDe(clave, ctx) {
  const c = entradaCatalogo_(clave);
  if (!c || !c.porAlumno) throw new Error('Ese listado no existe.');
  cargarAprendido_(carpetaDatos_());
  return leerIndiceAlumnos_(carpetaDatos_()).listados.filter(function (e) { return e.clave === clave; })
    .sort(function (a, b) { return llaveDeNombre_(a.alumnoNombre) < llaveDeNombre_(b.alumnoNombre) ? -1 : 1; })
    .map(function (e) {
      return { nombre: e.alumnoNombre, fecha: fechaLegible_(e.subido).split(' ')[0], url: e.idDrive ? 'https://drive.google.com/file/d/' + e.idDrive + '/view' : '', anteriores: e.anteriores || 0, enAlumnado: e.enAlumnado !== false };
    });
}

/* Para las sugerencias de la caja «Alumno/a». */
function webNombresAlumnado(ctx) {
  return nombresAlumnado_(carpetaDatos_());
}

/* Al estrenar esta versión: los expedientes que esperaban en «Sin clasificar» (sin tipo) se colocan solos, del que llegó antes al que llegó después.
   Como mucho `topeMs` por llamada. Devuelve true si quedan por mirar. */
function colocarExpedientes_(raiz, topeMs) {
  const lista = leerPendientes_(raiz).pendientes.filter(function (p) { return !p.clave && /^regdetexpele/.test(normalizarNombre_(p.fichero)); })
    .sort(function (a, b) { return new Date(a.llegado).getTime() - new Date(b.llegado).getTime(); });
  if (!lista.length) return false;
  const inicio = new Date().getTime();
  let hechos = 0;
  for (let i = 0; i < lista.length; i++) {
    if (hechos && new Date().getTime() - inicio >= topeMs) return true;
    const q = lista[i];
    const fichero = ficheroDePendiente_(raiz, q);
    const bytes = fichero.getBlob().getBytes();
    const rec = reconocerFichero_(q.fichero, bytes, { cursoElegido: '' });
    if (rec.clave && !rec.falta.length) {
      rec.variante = '';
      const r = guardarListado_(q.fichero, bytes, rec, q.llegadoPor, q.via, { fichero: fichero, llegado: q.llegado });
      if (r.estado !== 'sin-clasificar') quitarPendiente_(raiz, q.id);
    } else {
      actualizarPendiente_(raiz, q.id, { clave: rec.clave, ficha: rec.ficha, falta: rec.falta, propuesta: rec.propuesta || {}, motivo: rec.motivo, alumnoNombre: rec.alumnoNombre || '' });
    }
    hechos++;
  }
  return false;
}

/* ==== Reconocer.gs ==== */
/* Qué listado es un fichero y qué ficha lleva. Se reconoce por el contenido; el nombre solo ayuda donde el catálogo lo dice.
   opciones = { cursoElegido } ('' por el buzón entrada/). Devuelve siempre:
     { clave,            "" si no se sabe qué es
       ficha,            { cursoEscolar, ambito, periodo, alumno }: lo que sí se sabe
       falta,            datos que tocan en ese listado y son duda: 'cursoEscolar', 'ambito'
       cursoSupuesto,    el curso salió del desplegable de la página
       propuesta,        { ambito } si hay una apuesta para lo dudoso
       motivo,           frase llana para cuando falta algo o no se sabe qué es
       tipo,             'pdf' | 'json' | 'csv' | 'otro'
       titulos }         títulos de columna normalizados de un CSV ([] en lo demás) */
function reconocerFichero_(nombre, bytes, opciones) {
  opciones = opciones || {};
  const n = normalizarNombre_(nombre);
  const esPdf = bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  let texto = '', json = null, filas = [], titulos = [];
  if (!esPdf) {
    texto = bytesATexto_(bytes);
    if (/^\s*\{/.test(texto)) { try { json = JSON.parse(texto); } catch (e) { json = null; } }
  }
  const tipo = esPdf ? 'pdf' : json ? 'json' : /\.(csv|txt)$/i.test(nombre) ? 'csv' : 'otro';
  if (!esPdf && !json && tipo === 'csv') {
    filas = leerCsv_(texto, detectarSeparador_(texto));
    titulos = (filas[0] || []).map(normalizarTitulo_);
  } else if (!esPdf && !json) {
    titulos = (leerCsv_(texto.split('\n')[0], detectarSeparador_(texto))[0] || []).map(normalizarTitulo_);
  }
  const encajan = [];
  CATALOGO_.forEach(function (c) {
    if (c.alFinal || (c.soloNombre && !c.ademasPorColumnas)) return;
    if (c.tipo === 'pdf') { if (esPdf && empiezaPor_(n, c.nombre)) encajan.push(c); return; }
    if (c.tipo === 'json') { if (json && (c.nombreRe ? c.nombreRe.test(n) : n === c.nombre[0]) && esJsonDe_(json, c.json)) encajan.push(c); return; }
    if (esPdf || json) return;
    if (c.nombre && !c.ademasPorColumnas && !empiezaPor_(n, c.nombre)) return;
    if (!c.columnas.every(function (x) { return titulos.indexOf(normalizarTitulo_(x)) !== -1; })) return;
    if (c.algunaColumna && !c.algunaColumna.some(function (x) { return titulos.indexOf(normalizarTitulo_(x)) !== -1; })) return;
    if (c.columnasQueContienen && !c.columnasQueContienen.every(function (x) { return titulos.some(function (t) { return t.indexOf(x) !== -1; }); })) return;
    if ((c.sinColumnas || []).some(function (x) { return titulos.indexOf(normalizarTitulo_(x)) !== -1; })) return;
    encajan.push(c);
  });
  const base = { clave: '', ficha: fichaVacia_(), falta: [], cursoSupuesto: false, propuesta: {}, alumnoNombre: '', motivo: '', tipo: tipo, titulos: tipo === 'csv' || tipo === 'otro' ? titulos : [] };
  if (!encajan.length) {
    const porNombre = CATALOGO_.filter(function (c) { return c.soloNombre && (c.nombreRe ? c.nombreRe.test(n) : empiezaPor_(n, c.nombre)); })[0];
    if (porNombre) encajan.push(porNombre);
  }
  const cambios = tipo === 'json' ? cambiosDeEntrada_(nombre) : null;
  if (cambios && !encajan.length) { base.motivo = 'Parece un fichero de cambios de una aplicación, pero no se ha podido aplicar: ¿«' + cambios[2] + '» puede mandar cambios a «' + cambios[1] + '»? ¿está bien hecho?'; return base; }
  let aprendida = '';
  if (!encajan.length) aprendida = claveAprendida_(nombre, tipo, base.titulos);
  /* Lo último de todo: las reglas flojas por columnas (la planificación). */
  if (!encajan.length && !aprendida && tipo === 'csv') {
    const flojo = CATALOGO_.filter(function (c) { return c.alFinal && cabeceraDePlanificacion_(titulos); })[0];
    if (flojo) encajan.push(flojo);
  }
  if (encajan.length !== 1 && !aprendida) {
    base.motivo = MOTIVO_NO_SE_;
    return base;
  }
  const c = aprendida ? entradaCatalogo_(aprendida) : encajan[0];
  if (c.clave === 'entrega') return reconocerEntrega_(base, n, json);
  if (c.clave === 'alumnado-bd' && relevoHecho_(carpetaDatos_())) { base.motivo = MOTIVO_YA_LO_GENERA_; return base; }
  const f = c.aprendido ? sacarFichaAprendida_(c, nombre, opciones) : sacarFicha_(c, nombre, filas, opciones);
  base.clave = c.clave; base.ficha = f.ficha; base.falta = f.falta; base.cursoSupuesto = f.cursoSupuesto; base.propuesta = f.propuesta; base.alumnoNombre = f.alumnoNombre || '';
  if (f.falta.length) base.motivo = motivoDeFalta_(c, f.falta);
  return base;
}

const MOTIVO_NO_SE_ = 'No sé todavía qué es este fichero. Está guardado en «Sin clasificar».';

function empiezaPor_(n, prefijos) { return prefijos.some(function (p) { return n.indexOf(p) === 0; }); }

function esJsonDe_(json, regla) {
  return typeof json[regla.numero] === 'number' && regla.listas.every(function (l) { return Array.isArray(json[l]); });
}

/* Cuánto trae: { filas, resumen }. filas es null en un PDF o en un fichero que no se sabe leer. */
function contarListado_(c, bytes, tipo) {
  if (c.cuenta && c.cuenta.modo === 'ninguno') return { filas: null, resumen: 'Fichero PDF' };
  if (c.soloNombre) {
    if (tipo !== 'csv') return { filas: null, resumen: tipo === 'pdf' ? 'Fichero PDF' : 'Fichero' };
    const texto = bytesATexto_(bytes);
    const n = Math.max(0, leerCsv_(texto, detectarSeparador_(texto)).length - 1);
    return { filas: n, resumen: numeroLegible_(n) + (n === 1 ? ' fila' : ' filas') };
  }
  let n, filas;
  if (c.cuenta.modo === 'planificacion') {
    const todas = leerCsv_(bytesATexto_(bytes), detectarSeparador_(bytesATexto_(bytes)));
    n = filas = todas.slice(1).filter(function (f) { return String(f[0] || '').trim(); }).length;
    const asig = (todas[0] || []).slice(3).map(function (t) { return String(t || '').trim(); }).filter(String);
    return { filas: filas, resumen: numeroLegible_(n) + ' ' + (n === 1 ? c.cuenta.uno : c.cuenta.varios) + (asig.length ? ' · ' + asig.join(', ') : '') };
  }
  if (c.cuenta.modo === 'json') {
    n = filas = JSON.parse(bytesATexto_(bytes))[c.cuenta.lista].length;
  } else {
    const texto = bytesATexto_(bytes);
    const sep = detectarSeparador_(texto);
    const todas = leerCsv_(texto, sep);
    const datos = todas.slice(1);
    filas = datos.length;
    n = filas;
    if (c.cuenta.modo === 'distintos') {
      const col = todas[0].map(normalizarTitulo_).indexOf(normalizarTitulo_(c.cuenta.columna));
      const vistos = {};
      datos.forEach(function (f) { if (f[col]) vistos[f[col]] = true; });
      n = Object.keys(vistos).length;
    }
  }
  return { filas: filas, resumen: numeroLegible_(n) + ' ' + (n === 1 ? c.cuenta.uno : c.cuenta.varios) };
}

const MOTIVO_YA_LO_GENERA_ = 'Este fichero ya lo genera el Centro de datos.';

/* Una entrega es válida si el número es 1, el conjunto está en el registro, el conjunto y el origen de dentro son los del nombre y esa aplicación puede entregar a ese conjunto.
   Si no, va a «Sin clasificar» con su motivo en llano. */
function reconocerEntrega_(base, n, json) {
  const m = /^entrega ([a-z0-9-]+) ([a-z0-9-]+)\.json$/.exec(n);
  const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === m[1]; })[0];
  const dice = function (motivo) { base.motivo = 'Parece una entrega de una aplicación, pero ' + motivo + '.'; return base; };
  if (json.entrega !== 1) return dice('no es de la versión 1');
  if (!conj) return dice('el conjunto «' + m[1] + '» no existe');
  if (json.conjunto !== m[1]) return dice('el conjunto de dentro no es el del nombre');
  if (json.origen !== m[2]) return dice('el origen de dentro no es el del nombre');
  if (conj.entregas.indexOf(m[2]) === -1) return dice('«' + m[2] + '» no puede entregar a «' + m[1] + '»');
  base.clave = 'entrega';
  base.ficha = { cursoEscolar: '', ambito: m[1], periodo: m[2], alumno: '' };
  return base;
}

/* ¿Ya genera el Centro de datos el fichero completo? Desde que llegó la primera entrega válida: no se deshace. */
function relevoHecho_(raiz) {
  const avance = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'hechos.json');
  if (avance && avance.relevo) return true;
  /* Solo cuentan las entregas de un conjunto con ficha completa: las de un conjunto entregado entero no hacen el relevo. */
  return leerIndice_(raiz).listados.some(function (e) {
    return e.clave === 'entrega' && CONJUNTOS_.some(function (c) { return c.fichaCompleta && c.conjunto === e.ambito; });
  });
}

/* ==== Carpeta.gs ==== */
/* La carpeta «CENTRO DE DATOS» de Drive. Su id vive en la propiedad CARPETA_ID: nunca escrito en el código. */
const NOMBRE_CARPETA_CD_ = 'CENTRO DE DATOS';
const SUBCARPETAS_CD_ = ['entrada', 'listados', 'alumnos', 'anteriores', 'sin-clasificar', 'hecho', '_interno'];

const PASOS_PERMISO_ = [
  'Abre el enlace del lanzador y cópialo.',
  'En script.google.com, proyecto «Centro de datos», borra lo que hay, pega y guarda.',
  'Implementar → Gestionar implementaciones → el lápiz → Versión: Nueva versión → Implementar.',
  'Si pide «Autorizar acceso», acéptalo.',
  'Si después de eso sigue igual: en el editor, elige la función «autorizar» y pulsa Ejecutar.',
  'Recarga esta página.'
];

/* { estado: 'sinId' | 'perdida' | 'ok', carpeta } */
function buscarCarpetaCD_() {
  const id = PropertiesService.getScriptProperties().getProperty('CARPETA_ID');
  if (!id) return { estado: 'sinId', carpeta: null };
  try {
    const carpeta = DriveApp.getFolderById(id);
    if (carpeta.isTrashed()) return { estado: 'perdida', carpeta: null };
    return { estado: 'ok', carpeta: carpeta };
  } catch (e) {
    return { estado: 'perdida', carpeta: null };
  }
}

function leerJson_(carpeta, nombre) {
  const it = carpeta.getFilesByName(nombre);
  if (!it.hasNext()) return null;
  return JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
}

/* Siempre sobre el mismo fichero: su id no cambia. */
function escribirJson_(carpeta, nombre, objeto) {
  const texto = JSON.stringify(objeto, null, 2);
  const it = carpeta.getFilesByName(nombre);
  if (it.hasNext()) it.next().setContent(texto);
  else carpeta.createFile(nombre, texto, 'application/json');
}

/* Va a una subcarpeta por su ruta («listados/alumnado»), creando lo que falte. */
function subcarpetaPorRuta_(raiz, ruta) {
  let actual = raiz;
  String(ruta).split('/').filter(function (p) { return p; }).forEach(function (nombre) {
    const it = actual.getFoldersByName(nombre);
    actual = it.hasNext() ? it.next() : actual.createFolder(nombre);
  });
  return actual;
}

/* Repone solo lo que falte; lo que ya está no se toca. */
function reponerForma_(carpeta) {
  SUBCARPETAS_CD_.forEach(function (n) { subcarpetaPorRuta_(carpeta, n); });
  const ahora = ahoraMadrid_();
  if (!carpeta.getFilesByName('indice.json').hasNext()) {
    escribirJson_(carpeta, 'indice.json', {
      contrato: 2, cursoActual: cursoActual_(), ocupado: false, actualizado: ahora, web: ScriptApp.getService().getUrl() || '', listados: [], capacidades: ['hechos', 'entregas'], recibe: recibeDeRegistro_(), hechos: []
    });
  }
  if (!carpeta.getFilesByName('configuracion.json').hasNext()) {
    escribirJson_(carpeta, 'configuracion.json', {
      contrato: 1, actualizado: ahora, actualizadoPor: '',
      centro: { nombre: '', codigo: '', direccion: '', localidad: '', provincia: '', telefono: '' },
      correo: { direccionDelCentro: '', firma: '' }
    });
  }
}

function crearCarpetaNueva_() {
  const carpeta = DriveApp.createFolder(NOMBRE_CARPETA_CD_);
  PropertiesService.getScriptProperties().setProperty('CARPETA_ID', carpeta.getId());
  reponerForma_(carpeta);
  return carpeta;
}

/* Lo que enseña la página sobre la carpeta. Solo el dueño la crea o la repone. */
function estadoCarpeta_(esDueno) {
  let r = buscarCarpetaCD_();
  if (r.estado === 'sinId') {
    if (!esDueno) return { ok: false, perdida: false, mensaje: 'Todavía no hay carpeta de datos. La crea el dueño al entrar.' };
    r = { estado: 'ok', carpeta: crearCarpetaNueva_() };
  } else if (r.estado === 'ok' && esDueno) {
    reponerForma_(r.carpeta);
  }
  if (r.estado === 'perdida') return { ok: false, perdida: true, mensaje: 'No encuentro la carpeta de los datos.' };
  return { ok: true, nombre: r.carpeta.getName(), url: 'https://drive.google.com/drive/folders/' + r.carpeta.getId() };
}

/* ¿El texto de Google dice que falta un permiso? (en inglés o en español) */
function esFalloDePermiso_(e) {
  return /permission to call|Required permissions|permiso para llamar|Permisos necesarios|Authorization is required/i.test(String((e && e.message) || e || ''));
}

/* Lo que enseña la página cuando crear o reponer la carpeta falla. Nunca lanza: así el resto de la página se pinta. */
function errorDeCarpeta_(e, esDueno) {
  const detalle = esDueno ? String((e && e.message) || e || '').slice(0, 400) : '';
  if (esFalloDePermiso_(e)) {
    return { ok: false, perdida: false, permiso: true, mensaje: 'Falta un permiso de Google para escribir en Drive.', pasos: esDueno ? PASOS_PERMISO_ : [], detalle: detalle };
  }
  return { ok: false, perdida: false, mensaje: 'No he podido preparar la carpeta de los datos.', detalle: detalle };
}

/* Apunta los datos a otra carpeta. Vale si existe y o es un Centro de datos (indice.json con contrato) o está vacía (entonces se le da la forma). */
function cambiarCarpeta_(enlace) {
  const t = String(enlace || '').trim();
  const m = /\/folders\/([A-Za-z0-9_-]+)/.exec(t) || /[?&]id=([A-Za-z0-9_-]+)/.exec(t) || /^([A-Za-z0-9_-]{10,})$/.exec(t);
  if (!m) return { ok: false, mensaje: 'Pega el enlace de una carpeta de Drive.' };
  let carpeta;
  try {
    carpeta = DriveApp.getFolderById(m[1]);
    if (carpeta.isTrashed()) throw new Error('papelera');
  } catch (e) {
    return { ok: false, mensaje: 'No encuentro esa carpeta, o esta cuenta no puede abrirla.' };
  }
  let indice = null;
  try { indice = leerJson_(carpeta, 'indice.json'); } catch (e) { indice = null; }
  if (indice && typeof indice.contrato === 'number') {
    if (indice.contrato > 2) return { ok: false, mensaje: 'Esa carpeta es de un Centro de datos más nuevo que este programa.' };
  } else if (carpeta.getFiles().hasNext() || carpeta.getFolders().hasNext()) {
    return { ok: false, mensaje: 'Esa carpeta tiene otros ficheros y no es un Centro de datos. Elige una carpeta vacía.' };
  } else {
    reponerForma_(carpeta);
  }
  PropertiesService.getScriptProperties().setProperty('CARPETA_ID', carpeta.getId());
  return { ok: true, mensaje: 'Ahora los datos están en ' + carpeta.getName() + '. Las demás aplicaciones tienen que apuntar a la carpeta nueva.' };
}

/* ==== Indice.gs ==== */
/* indice.json y el registro de movimientos. El índice se escribe siempre el último y siempre sobre el mismo fichero. */
const MAX_MOVIMIENTOS_ = 200;

function carpetaDatos_() {
  const r = buscarCarpetaCD_();
  if (r.estado !== 'ok') throw new Error('No encuentro la carpeta de los datos.');
  return r.carpeta;
}

/* Qué entregas recibe este Centro de datos: una línea por conjunto y aplicación. Sale del registro de conjuntos (`entero`: la entrega es la lista entera del conjunto; `cambios`: no entrega la lista sino cambios sueltos, sin `entrega` ni `entero`). */
function recibeDeRegistro_() {
  const lista = [];
  CONJUNTOS_.forEach(function (conj) { (conj.entregas || []).forEach(function (app) { lista.push({ conjunto: conj.conjunto, de: app, entrega: 1, entero: !!conj.entregadoPor }); }); });
  CONJUNTOS_.forEach(function (conj) { (conj.cambios || []).forEach(function (app) { lista.push({ conjunto: conj.conjunto, de: app, cambios: 1 }); }); });
  return lista;
}

function indiceNuevo_() {
  return { contrato: 2, cursoActual: cursoActual_(), ocupado: false, actualizado: '', web: '', listados: [], capacidades: ['hechos', 'entregas'], recibe: recibeDeRegistro_(), hechos: [] };
}

function leerIndice_(raiz) {
  return leerJson_(raiz, 'indice.json') || indiceNuevo_();
}

/* Una parte de hecho/ está al día si todos los listados de los que salió siguen con la huella con que se hizo. Se recalcula en cada escritura del índice,
   así que al guardar un fichero nuevo sus partes quedan con alDia: false en esa misma escritura. */
function recalcularAlDia_(indice) {
  (indice.hechos || []).forEach(function (h) {
    h.alDia = (h.fuentes || []).length > 0 && h.fuentes.every(function (f) { const e = buscarEnIndice_(indice, f.clave, f.variante); return !!e && e.huella === f.huella; });
  });
}

function escribirIndice_(raiz, indice) {
  indice.actualizado = ahoraMadrid_();
  indice.cursoActual = cursoActual_();
  indice.capacidades = ['hechos', 'entregas'];
  indice.recibe = recibeDeRegistro_();
  indice.hechos = indice.hechos || [];
  recalcularAlDia_(indice);
  if (!indice.web) indice.web = ScriptApp.getService().getUrl() || '';
  escribirJson_(raiz, 'indice.json', indice);
}

function buscarEnIndice_(indice, clave, variante) {
  return indice.listados.filter(function (e) { return e.clave === clave && (e.variante || '') === (variante || ''); })[0] || null;
}

/* Apunta qué pasó con un fichero. Se guardan los 200 últimos, en _interno/registro.json. */
function apuntarMovimiento_(raiz, mov) {
  const interno = subcarpetaPorRuta_(raiz, '_interno');
  const reg = leerJson_(interno, 'registro.json') || { movimientos: [] };
  mov.cuando = ahoraMadrid_();
  reg.movimientos.push(mov);
  reg.movimientos = reg.movimientos.slice(-MAX_MOVIMIENTOS_);
  escribirJson_(interno, 'registro.json', reg);
}

function leerMovimientos_(raiz) {
  const interno = subcarpetaPorRuta_(raiz, '_interno');
  return (leerJson_(interno, 'registro.json') || { movimientos: [] }).movimientos;
}

function hayFicheros_(carpeta) {
  if (carpeta.getFiles().hasNext()) return true;
  const it = carpeta.getFolders();
  while (it.hasNext()) if (hayFicheros_(it.next())) return true;
  return false;
}

/* Un índice del contrato 1 pasa al 2: a cada entrada los campos de la ficha que le falten (salen de su variante de hoy), el curso de hoy
   y `ocupado` (verdadero si hay algo guardado, hasta que se recoloque). No mueve ningún fichero. Llamarla otra vez no cambia nada. */
function ponerAlDiaIndice_(raiz) {
  const indice = leerJson_(raiz, 'indice.json');
  if (!indice || indice.contrato >= 2) return false;
  indice.contrato = 2;
  indice.listados.forEach(function (e) {
    const partes = (e.variante || '').split('/');
    const derivado = { cursoEscolar: '', ambito: '', periodo: '', alumno: '' };
    if (e.clave === 'matricula') { derivado.cursoEscolar = partes[0] || ''; derivado.ambito = partes[1] || ''; }
    else if (e.clave === 'personal') derivado.cursoEscolar = /^\d\d-\d\d$/.test(e.variante || '') ? e.variante : '';
    else if (e.clave === 'consejo-escolar') derivado.periodo = e.variante || '';
    Object.keys(derivado).forEach(function (k) { if (e[k] === undefined) e[k] = derivado[k]; });
  });
  const anteriores = raiz.getFoldersByName('anteriores');
  indice.ocupado = indice.listados.length > 0 || (anteriores.hasNext() && hayFicheros_(anteriores.next()));
  escribirIndice_(raiz, indice);
  return true;
}

/* Un índice que no dice qué entregas recibe (o dice otra cosa) se reescribe con lo del registro. Sin índice no hace nada. */
function ponerAlDiaRecibe_(raiz) {
  const indice = leerJson_(raiz, 'indice.json');
  if (!indice || JSON.stringify(indice.recibe) === JSON.stringify(recibeDeRegistro_())) return false;
  escribirIndice_(raiz, indice);
  return true;
}

/* Lo primero que hace quien abre la página o recoge la entrada. */
function ponerAlDia_(raiz) {
  cargarAprendido_(raiz);
  ponerAlDiaIndice_(raiz);
  ponerAlDiaRecibe_(raiz);
  try { rellenarIds_(raiz); } catch (e) { /* se reintenta en la próxima vuelta */ }
  migrarSinReconocer_(raiz);
  try { ponerAlDiaSoporte_(raiz); } catch (e) { /* vaciar el dato viejo nunca rompe la página */ }
}

function ordenAmbito_(e) {
  const c = entradaCatalogo_(e.clave);
  const i = c && c.ambitos ? c.ambitos.map(function (a) { return a.valor; }).indexOf(e.ambito || '') : -1;
  return String(i + 10);
}

/* «Qué trae» de una fila: la frase del catálogo (si la tiene) y, detrás, lo que cuenta el listado. */
function traeDeFila_(c, resumen) {
  return c.traeFila ? c.traeFila + (resumen ? ' ' + resumen + '.' : '') : (resumen || '');
}

/* Lo que enseña la tabla de la página: todas las filas (de todos los cursos) y, en el curso actual, una gris por cada listado de los de siempre que no tenga ninguna. */
function estadoListados_(raiz) {
  const indice = leerIndice_(raiz);
  const ahora = new Date();
  const actual = cursoActual_();
  const filas = [];
  const indiceAlumnos = leerIndiceAlumnos_(raiz);
  todosLosTipos_().forEach(function (c) {
    if (c.oculta) return;
    if (c.porAlumno) {
      const fila = filaDeAlumnos_(c, indiceAlumnos);
      if (fila) filas.push(fila);
      return;
    }
    const suyos = indice.listados.filter(function (e) { return e.clave === c.clave; })
      .sort(function (a, b) { return ordenDeCurso_(b.cursoEscolar) - ordenDeCurso_(a.cursoEscolar) || (ordenAmbito_(a) < ordenAmbito_(b) ? -1 : 1); });
    if (c.siempre && !suyos.some(function (e) { return !e.cursoEscolar || e.cursoEscolar === actual; })) {
      filas.push({ clave: c.clave, variante: '', cursoEscolar: actual, nombre: c.tituloFila || c.titulo, ambito: '', periodo: '', estado: 'gris', etiqueta: 'Nunca subido',
        deCuando: '', trae: c.traeFila || '', usan: c.usan, subidoPor: '', anteriores: 0, url: '' });
    }
    suyos.forEach(function (e) {
      const viejo = (ahora.getTime() - new Date(e.subido).getTime()) / 86400000 > (e.caducaDias || c.dias);
      filas.push({ clave: e.clave, variante: e.variante || '', cursoEscolar: e.cursoEscolar || '', nombre: c.tituloFila || c.titulo, ambito: textoAmbito_(e.clave, e.ambito),
        periodo: textoPeriodo_(e.periodo), estado: viejo ? 'ambar' : 'verde', etiqueta: viejo ? 'Se ha quedado viejo' : '',
        deCuando: fechaLegible_(e.subido) + ' · ' + haceTiempo_(e.subido, ahora),
        trae: traeDeFila_(c, e.resumen), usan: c.usan, subidoPor: e.subidoPor === DUENO_CD_ ? 'Centro de datos' : (e.subidoPor || ''), anteriores: e.anteriores || 0,
        url: e.idDrive ? 'https://drive.google.com/file/d/' + e.idDrive + '/view' : '' });
    });
  });
  const cursos = {};
  cursos[actual] = true;
  indice.listados.forEach(function (e) { if (e.cursoEscolar) cursos[e.cursoEscolar] = true; });
  const movimientos = leerMovimientos_(raiz).slice(-10).reverse().map(function (m) {
    return { cuando: fechaLegible_(m.cuando), texto: (m.fichero ? m.fichero + ' — ' : '') + m.mensaje, estado: m.que };
  });
  const pendientes = leerPendientes_(raiz).pendientes.map(pendienteParaPagina_);
  return { filas: filas, movimientos: movimientos, cursoActual: actual, cursos: ordenarCursos_(Object.keys(cursos)), pendientes: pendientes };
}

/* ==== Ids.gs ==== */
/* Fila 44: los ids de Drive que faltan. La página nueva guarda ficheros sin poder saber su id: la entrada del índice llega con `idDrive` vacío.
   `rellenarIds_` se lo pone (por la `ruta`) y `ficheroDeEntrada_` abre por id y, si no hay o no sirve, por `ruta`. Lo que se rellena se cuenta en _interno/ids.json. */
const ARCHIVO_IDS_ = 'ids.json';

/* El fichero de una ruta («listados/alumnado/x.csv»), sin crear nada. null si no está (la papelera no cuenta). */
function ficheroPorRuta_(raiz, ruta) {
  const trozos = String(ruta || '').split('/').filter(function (p) { return p; });
  const nombre = trozos.pop();
  if (!nombre) return null;
  let c = raiz;
  for (let i = 0; i < trozos.length; i++) {
    const it = c.getFoldersByName(trozos[i]);
    if (!it.hasNext()) return null;
    c = it.next();
  }
  const fs = c.getFilesByName(nombre);
  return fs.hasNext() ? fs.next() : null;
}

/* Abre el fichero de una entrada del índice: por `idDrive` y, si está vacío o ya no existe, por `ruta`. Si no está en ningún sitio, falla como DriveApp. */
function ficheroDeEntrada_(e) {
  let fallo = null;
  if (e && e.idDrive) { try { return DriveApp.getFileById(e.idDrive); } catch (x) { fallo = x; } }
  const f = e && e.ruta ? ficheroPorRuta_(carpetaDatos_(), e.ruta) : null;
  if (f) return f;
  if (e && e.ruta && (!fallo || /^Esta página solo lee/.test(String(fallo.message)))) {
    /* Sin el id de Drive (la página nueva no lo puede usar): si el fichero se movió de carpeta, se busca por su nombre en el resto y vale si solo hay uno. */
    { const otro = ficheroPorNombre_(carpetaDatos_(), String(e.ruta).split('/').pop()); if (otro) return otro; }
    let motivo = '';
    try { motivo = motivoDeRuta_(carpetaDatos_(), e.ruta); } catch (x) { if (x && x.cargar) throw x; }
    throw new Error('No encuentro el fichero ' + e.ruta + (motivo ? ' (' + motivo + ')' : '') + '.');
  }
  throw fallo || new Error('No encuentro el fichero ' + String((e && (e.ruta || e.fichero)) || '') + '.');
}

/* El único fichero con ese nombre en todas las carpetas de listados (no mira _interno ni hecho), o null si no hay ninguno o hay varios. */
function ficheroPorNombre_(raiz, nombre) {
  const halladas = [];
  const mirar = function (c, nivel) {
    const fs = c.getFilesByName(nombre);
    while (fs.hasNext()) halladas.push(fs.next());
    const cs = c.getFolders();
    while (cs.hasNext()) { const h = cs.next(); if (nivel === 0 && (h.getName() === '_interno' || h.getName() === 'hecho')) continue; mirar(h, nivel + 1); }
  };
  mirar(raiz, 0);
  return halladas.length === 1 ? halladas[0] : null;
}

/* Por qué no sale un fichero por su ruta, en pocas palabras y sin datos de nadie: qué trozo falta y si hay otro que se llama casi igual (tildes o mayúsculas). Solo para decir un fallo. */
function motivoDeRuta_(raiz, ruta) {
  const trozos = String(ruta || '').split('/').filter(function (p) { return p; });
  const nombre = trozos.pop();
  if (!nombre) return 'la entrada no trae ruta';
  const llano = function (t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  let c = raiz;
  for (let i = 0; i < trozos.length; i++) {
    const it = c.getFoldersByName(trozos[i]);
    if (!it.hasNext()) return 'no está la carpeta «' + trozos[i] + '»';
    c = it.next();
  }
  const mismos = c.getFilesByName(nombre);
  if (mismos.hasNext()) return 'sí está, pero no se abre';
  const todos = c.getFiles();
  let n = 0, parecidos = 0;
  while (todos.hasNext()) { const f = todos.next(); n++; if (llano(f.getName()) === llano(nombre)) parecidos++; }
  return 'en su carpeta hay ' + n + ' ficheros y ' + (parecidos ? parecidos + ' se llama casi igual (tildes o mayúsculas)' : 'ninguno se llama así');
}

/* Pone `idDrive` a las entradas de una lista que lo traen vacío. Devuelve { rellenadas, sinFichero: [entrada] }. */
function rellenarLista_(raiz, lista) {
  const r = { rellenadas: 0, sinFichero: [] };
  (lista || []).forEach(function (e) {
    if (e.idDrive || e.porAlumno) return;   // el resumen de un tipo «por alumno» no es un fichero
    const f = ficheroPorRuta_(raiz, e.ruta);
    if (f) { e.idDrive = f.getId(); r.rellenadas++; } else r.sinFichero.push(e);
  });
  return r;
}

/* Recorre indice.json (listados y hechos) e indice-alumnos.json y rellena los ids vacíos. Si no hay ninguno vacío no escribe nada. El índice se escribe al final. */
function rellenarIds_(raiz) {
  const indice = leerJson_(raiz, 'indice.json');
  if (!indice) return null;
  const alumnos = leerJson_(raiz, ARCHIVO_ALUMNOS_);
  const vacios = function (l) { return (l || []).some(function (e) { return !e.idDrive && !e.porAlumno; }); };
  const previo = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_IDS_);
  if (!vacios(indice.listados) && !vacios(indice.hechos) && !(alumnos && vacios(alumnos.listados))) {
    if (previo && previo.sinFichero.length) escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_IDS_, { version: VERSION_CD, cuando: ahoraMadrid_(), habia: previo.habia, rellenadas: previo.rellenadas, sinFichero: [] });
    return null;
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ind = leerIndice_(raiz);
    const ia = leerJson_(raiz, ARCHIVO_ALUMNOS_);
    const a = rellenarLista_(raiz, ind.listados), b = rellenarLista_(raiz, ind.hechos), c = ia ? rellenarLista_(raiz, ia.listados) : { rellenadas: 0, sinFichero: [] };
    const sin = a.sinFichero.concat(b.sinFichero, c.sinFichero);
    const res = { version: VERSION_CD, cuando: ahoraMadrid_(), habia: a.rellenadas + b.rellenadas + c.rellenadas + sin.length, rellenadas: a.rellenadas + b.rellenadas + c.rellenadas,
      sinFichero: sin.map(function (e) { return { clave: e.clave || e.conjunto || '', variante: e.variante || e.parte || '', ruta: e.ruta || '' }; }) };
    if (c.rellenadas) escribirIndiceAlumnos_(raiz, ia);
    if (a.rellenadas || b.rellenadas) escribirIndice_(raiz, ind);   // el índice, lo último
    escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_IDS_, res);
    return res;
  } finally {
    lock.releaseLock();
  }
}

/* Una línea por entrada que sigue sin fichero, en el formato de los avisos de Avisos.gs. */
function avisosDeIdsSinFichero_(raiz) {
  let r = null;
  try { r = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_IDS_); } catch (e) { r = null; }
  return ((r && r.sinFichero) || []).map(function (s) {
    const c = entradaCatalogo_(s.clave);
    const donde = (c ? c.titulo : s.clave) + (s.variante ? ' · ' + s.variante : '');
    const aviso = { tipo: 'ids-sin-fichero', id: null, datos: { listado: donde } };
    const f = frasePlanaDeAviso_(aviso);
    return { huella: huellaDeAviso_('listados', s.ruta, aviso), conjunto: 'listados', donde: 'Listados · ' + donde, tipo: aviso.tipo, quien: donde, que: f.texto, conocida: f.conocida };
  });
}

/* ==== Guardar.gs ==== */
/* Guardar un listado: el fichero tal como llegó, el anterior a anteriores/, y el índice lo último.
   Un fichero solo sustituye a otro si las dos fichas coinciden en todo; si difieren en algo, se guardan los dos. */
const MIME_POR_TIPO_ = { csv: 'text/csv', pdf: 'application/pdf', json: 'application/json', otro: 'application/octet-stream' };

function nombreLimpio_(nombre) {
  const n = String(nombre).replace(/[\/\\\u0000-\u001f]/g, '').trim();
  return n || 'fichero';
}

/* «2026-10-08T21:39:12+02:00» → «20261008-213912» */
function prefijoFecha_(iso) {
  return String(iso).replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
}

/* Deja en una carpeta de anteriores/ solo las `quedan` más recientes (el nombre lleva la fecha delante); las demás van a la papelera. */
function podarAnteriores_(raiz, ruta, quedan) {
  const it = subcarpetaPorRuta_(raiz, ruta).getFiles(), lista = [];
  while (it.hasNext()) { const f = it.next(); lista.push({ f: f, n: f.getName() }); }
  lista.sort(function (a, b) { return a.n < b.n ? 1 : -1; }).slice(quedan).forEach(function (x) { x.f.setTrashed(true); });
}

function rutaDeListado_(base, clave, variante) {
  return base + '/' + clave + (variante ? '/' + variante : '');
}

/* Todo lo que llega se guarda: o es un listado con su ficha completa, o va a «Sin clasificar».
   Devuelve { estado: 'guardado' | 'ya' | 'sin-clasificar', mensaje, … }. opciones = { cursoElegido }. */
function procesarFichero_(nombre, bytes, quien, via, opciones) {
  cargarAprendido_(carpetaDatos_());
  const rec = reconocerFichero_(nombre, bytes, opciones);
  if (rec.clave && !rec.falta.length) {
    rec.variante = varianteDeFicha_(rec.ficha);
    return guardarListado_(nombre, bytes, rec, quien, via, null);
  }
  return enviarASinClasificar_(nombre, bytes, rec, quien, via);
}

function mensajeDeGuardado_(c, e, cursoSupuesto) {
  const partes = [c.titulo];
  if (e.ambito) partes.push(textoAmbito_(c.clave, e.ambito));
  if (e.periodo) partes.push(textoPeriodo_(e.periodo));
  if (e.cursoEscolar) partes.push(e.cursoEscolar + (cursoSupuesto ? ' (el curso elegido arriba)' : ''));
  partes.push(e.resumen, 'guardado');
  return partes.join(' · ') + (c.tambienEn ? '. De momento también hay que subirlo en ' + c.tambienEn + '.' : '');
}

/* `existente` = { fichero, llegado, sinRegistro } cuando el fichero ya está en Drive (sale de «Sin clasificar»): se mueve en vez de crear otro.
   `llegado` es la fecha en que llegó; un fichero más viejo nunca quita de vigente a uno más nuevo. */
function guardarListado_(nombre, bytes, rec, quien, via, existente) {
  const c = entradaCatalogo_(rec.clave);
  if (c.porAlumno) return guardarDeAlumno_(nombre, bytes, rec, quien, via, existente);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const raiz = carpetaDatos_();
    const indice = leerIndice_(raiz);
    const previo = buscarEnIndice_(indice, rec.clave, rec.variante);
    const h = huella_(bytes);
    const llegado = (existente && existente.llegado) || ahoraMadrid_();
    const apuntar = function (que, mensaje) {
      if (existente && existente.sinRegistro) return;   // recolocar: solo se apunta el resumen final
      apuntarMovimiento_(raiz, { quien: quien, via: via, fichero: nombre, que: que, mensaje: mensaje });
    };
    const limpio = nombreLimpio_(nombre);
    const cuenta = contarListado_(c, bytes, rec.tipo);
    const rutaAnt = rutaDeListado_('anteriores', rec.clave, rec.variante);
    /* Mismo fichero que el vigente. */
    if (previo && previo.huella === h) {
      const m = 'Ya lo tenía: es el mismo fichero del ' + fechaLegible_(previo.subido).split(' ')[0];
      if (existente) {
        existente.fichero.moveTo(subcarpetaPorRuta_(raiz, rutaAnt));
        existente.fichero.setName(prefijoFecha_(llegado) + ' ' + limpio);
        previo.anteriores = (previo.anteriores || 0) + 1;
        escribirIndice_(raiz, indice);
      }
      apuntar('ya', m);
      return { estado: 'ya', mensaje: m };
    }
    /* Uno más viejo que el vigente: va directo a anteriores/ y el vigente no cambia. */
    if (previo && new Date(previo.subido).getTime() > new Date(llegado).getTime()) {
      const carpetaAnt = subcarpetaPorRuta_(raiz, rutaAnt);
      if (existente) { existente.fichero.moveTo(carpetaAnt); existente.fichero.setName(prefijoFecha_(llegado) + ' ' + limpio); }
      else carpetaAnt.createFile(Utilities.newBlob(bytes, MIME_POR_TIPO_[rec.tipo] || MIME_POR_TIPO_.otro, prefijoFecha_(llegado) + ' ' + limpio));
      previo.anteriores = (previo.anteriores || 0) + 1;
      if (c.soloUltimaAnterior) podarAnteriores_(raiz, rutaAnt, 1);
      escribirIndice_(raiz, indice);
      const m = 'Guardado como versión anterior: ya hay uno más reciente, del ' + fechaLegible_(previo.subido).split(' ')[0] + '.';
      apuntar('guardado', m);
      return { estado: 'guardado', mensaje: m, clave: rec.clave, variante: rec.variante };
    }
    const tipo = c.tipo === 'pdf' || c.tipo === 'json' || c.tipo === 'csv' ? c.tipo : rec.tipo;
    /* 1. Primero el fichero nuevo: si esto falla, no se ha tocado nada. */
    const destino = subcarpetaPorRuta_(raiz, rutaDeListado_('listados', rec.clave, rec.variante));
    let nuevo;
    if (existente) { existente.fichero.moveTo(destino); existente.fichero.setName(limpio); nuevo = existente.fichero; }
    else nuevo = destino.createFile(Utilities.newBlob(bytes, MIME_POR_TIPO_[tipo] || MIME_POR_TIPO_.otro, limpio));
    /* 2. El vigente de antes pasa a anteriores/, con su fecha delante. */
    let movido = false;
    if (previo) {
      try {
        const viejo = ficheroDeEntrada_(previo);
        viejo.moveTo(subcarpetaPorRuta_(raiz, rutaAnt));
        viejo.setName(prefijoFecha_(previo.subido) + ' ' + viejo.getName());
        movido = true;
      } catch (e) { /* el anterior ya no estaba en Drive: no hay nada que archivar */ }
    }
    if (previo && c.soloUltimaAnterior) podarAnteriores_(raiz, rutaAnt, 1);
    /* 3. El índice, lo último. */
    const f = rec.ficha;
    const entrada = {
      clave: rec.clave, variante: rec.variante, titulo: c.titulo, fichero: limpio,
      ruta: rutaDeListado_('listados', rec.clave, rec.variante) + '/' + limpio, idDrive: nuevo.getId(), tipo: tipo,
      cursoEscolar: f.cursoEscolar, ambito: f.ambito, periodo: f.periodo, alumno: f.alumno,
      subido: llegado, subidoPor: quien, via: via, bytes: bytes.length, filas: cuenta.filas,
      resumen: cuenta.resumen, huella: h, caducaDias: c.dias, anteriores: (previo ? previo.anteriores || 0 : 0) + (movido ? 1 : 0)
    };
    if (previo) indice.listados[indice.listados.indexOf(previo)] = entrada; else indice.listados.push(entrada);
    escribirIndice_(raiz, indice);
    const mensaje = mensajeDeGuardado_(c, entrada, rec.cursoSupuesto);
    apuntar('guardado', mensaje);
    return { estado: 'guardado', mensaje: mensaje, clave: rec.clave, variante: rec.variante };
  } finally {
    lock.releaseLock();
  }
}

/* ==== SinClasificar.gs ==== */
/* «Sin clasificar»: todo lo que llega y no se sabe colocar se guarda aquí, con lo que sí se sabe y lo que falta.
   La lista vive en _interno/sin-clasificar.json: { pendientes: [ { id, fichero, idDrive, llegado, llegadoPor, via, bytes, huella, tipo, titulos,
   clave, ficha, falta, propuesta, motivo } ] }. */
const ARCHIVO_PENDIENTES_ = 'sin-clasificar.json';

function leerPendientes_(raiz) {
  return leerJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_PENDIENTES_) || { pendientes: [] };
}

function escribirPendientes_(raiz, lista) {
  escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_PENDIENTES_, lista);
}

/* Lo propuesto para un pendiente, con el curso que dice su nombre (se calcula al vuelo, no se guarda). */
function propuestaConCurso_(p) {
  const propuesta = Object.assign({}, p.propuesta || {}), curso = cursoDelNombre_(p.fichero);
  if (curso) propuesta.cursoEscolar = curso;
  return propuesta;
}

/* Los cursos del desplegable: la lista de siempre más los que ya hay en el índice y en las fichas de los pendientes (puede haber alguno anterior a 89-90). */
function cursosElegibles_(raiz) {
  const extra = leerIndice_(raiz).listados.map(function (e) { return e.cursoEscolar; })
    .concat(leerPendientes_(raiz).pendientes.map(function (p) { return (p.ficha || {}).cursoEscolar; }));
  return ordenarCursos_(cursosParaElegir_().concat(extra));
}

/* El sitio de un pendiente en la carpeta: el nombre lleva la fecha de llegada delante. */
function rutaDePendiente_(p) { return 'sin-clasificar/' + prefijoFecha_(p.llegado) + ' ' + p.fichero; }

/* El fichero de un pendiente: por su `idDrive` y, si está vacío (lo guarda así la página nueva, fila 45) o ya no sirve, por su sitio. Si no está en ningún sitio, falla como DriveApp. */
function ficheroDePendiente_(raiz, p) {
  let fallo = null;
  if (p.idDrive) { try { return DriveApp.getFileById(p.idDrive); } catch (x) { fallo = x; } }
  const f = ficheroPorRuta_(raiz, rutaDePendiente_(p));
  if (f) return f;
  throw fallo || new Error('No encuentro el fichero ' + p.fichero + '.');
}

/* Lo que la página enseña de un pendiente (sin los trozos internos). */
function pendienteParaPagina_(p) {
  const c = p.clave ? entradaCatalogo_(p.clave) : null;
  const desplegables = [];
  (p.falta || []).forEach(function (campo) {
    if (campo === 'cursoEscolar') {
      desplegables.push({ campo: 'cursoEscolar', pregunta: '¿De qué curso?', elegido: (p.ficha || {}).cursoEscolar || cursoDelNombre_(p.fichero), opciones: cursosParaElegir_().map(function (x) { return { valor: x, texto: x }; }) });
    } else if (campo === 'ambito' && c && c.ambitos) {
      desplegables.push({ campo: 'ambito', pregunta: '¿A quién se refiere?', elegido: (p.propuesta || {}).ambito || '', opciones: c.ambitos });
    }
  });
  return { id: p.id, fichero: p.fichero, url: p.idDrive ? 'https://drive.google.com/file/d/' + p.idDrive + '/view' : 'https://drive.google.com/drive/search?q=' + encodeURIComponent(p.fichero), llegado: fechaLegible_(p.llegado), llegadoPor: p.llegadoPor,
    clave: p.clave, motivo: p.motivo, desplegables: desplegables, falta: p.falta || [], ficha: p.ficha || fichaVacia_(), propuesta: propuestaConCurso_(p), alumnoNombre: p.alumnoNombre || '' };
}

/* Quita un pendiente de la lista o le cambia los datos (con el cerrojo puesto). */
function quitarPendiente_(raiz, id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = leerPendientes_(raiz);
    lista.pendientes = lista.pendientes.filter(function (x) { return x.id !== id; });
    escribirPendientes_(raiz, lista);
  } finally {
    lock.releaseLock();
  }
}

function actualizarPendiente_(raiz, id, campos) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = leerPendientes_(raiz);
    lista.pendientes.forEach(function (x) { if (x.id === id) Object.assign(x, campos); });
    escribirPendientes_(raiz, lista);
  } finally {
    lock.releaseLock();
  }
}

/* El id sale de la huella: no hay dos pendientes con los mismos bytes. */
function idPendiente_(huella) { return 'p' + huella.slice(0, 16); }

/* Guarda el fichero en sin-clasificar/ y lo apunta en la lista. Si ya hay uno igual, no guarda otro. */
function enviarASinClasificar_(nombre, bytes, rec, quien, via) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const raiz = carpetaDatos_();
    const lista = leerPendientes_(raiz);
    const h = huella_(bytes);
    const apuntar = function (que, mensaje) { apuntarMovimiento_(raiz, { quien: quien, via: via, fichero: nombre, que: que, mensaje: mensaje }); };
    const igual = lista.pendientes.filter(function (p) { return p.huella === h; })[0];
    if (igual) {
      const m = 'Ya lo tenía: está en «Sin clasificar» desde el ' + fechaLegible_(igual.llegado).split(' ')[0];
      apuntar('ya', m);
      return { estado: 'ya', mensaje: m };
    }
    const llegado = ahoraMadrid_(), limpio = nombreLimpio_(nombre);
    const fichero = subcarpetaPorRuta_(raiz, 'sin-clasificar').createFile(Utilities.newBlob(bytes, MIME_POR_TIPO_[rec.tipo] || MIME_POR_TIPO_.otro, prefijoFecha_(llegado) + ' ' + limpio));
    const p = { id: idPendiente_(h), fichero: limpio, idDrive: fichero.getId(), llegado: llegado, llegadoPor: quien, via: via, bytes: bytes.length, huella: h,
      tipo: rec.tipo, titulos: rec.titulos || [], clave: rec.clave, ficha: rec.ficha, falta: rec.falta, propuesta: rec.propuesta || {}, alumnoNombre: rec.alumnoNombre || '', motivo: rec.motivo };
    lista.pendientes.push(p);
    escribirPendientes_(raiz, lista);
    apuntar('sin-clasificar', rec.motivo);
    return Object.assign({ estado: 'sin-clasificar', mensaje: rec.motivo }, pendienteParaPagina_(p));
  } finally {
    lock.releaseLock();
  }
}

/* Lo que había en sin-reconocer/ pasa a sin-clasificar/ y se apunta; lo que ahora sí se sabe colocar, se coloca. sin-reconocer/ no se borra. */
function migrarSinReconocer_(raiz) {
  const it = raiz.getFoldersByName('sin-reconocer');
  if (!it.hasNext()) return 0;
  const vieja = it.next();
  if (!vieja.getFiles().hasNext()) return 0;
  const nueva = subcarpetaPorRuta_(raiz, 'sin-clasificar');
  const desfase = ahoraMadrid_().slice(-6);
  const ficheros = [];
  const f = vieja.getFiles();
  while (f.hasNext()) ficheros.push(f.next());
  let movidos = 0;
  ficheros.forEach(function (fichero) {
    const m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d) (.*)$/.exec(fichero.getName());
    const original = m ? m[7] : fichero.getName();
    const llegado = m ? m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6] + desfase : ahoraMadrid_();
    fichero.moveTo(nueva);
    const bytes = fichero.getBlob().getBytes();
    const rec = reconocerFichero_(original, bytes, { cursoElegido: '' });
    if (rec.clave && !rec.falta.length) {
      rec.variante = varianteDeFicha_(rec.ficha);
      guardarListado_(original, bytes, rec, 'entrada', 'entrada', { fichero: fichero, llegado: llegado });
    } else {
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        const lista = leerPendientes_(raiz);
        const h = huella_(bytes);
        if (!lista.pendientes.some(function (x) { return x.huella === h; })) lista.pendientes.push({ id: idPendiente_(h), fichero: original, idDrive: fichero.getId(), llegado: llegado, llegadoPor: 'entrada', via: 'entrada', bytes: bytes.length,
          huella: h, tipo: rec.tipo, titulos: rec.titulos || [], clave: rec.clave, ficha: rec.ficha, falta: rec.falta, propuesta: rec.propuesta || {}, alumnoNombre: rec.alumnoNombre || '', motivo: rec.motivo });
        escribirPendientes_(raiz, lista);
      } finally {
        lock.releaseLock();
      }
    }
    movidos++;
  });
  return movidos;
}

/* ==== Completar.gs ==== */
/* Completar a mano la ficha de un pendiente de «Sin clasificar», quitarlo, o cambiar la ficha de un listado ya guardado. */

/* Lo que hace falta saber para elegir una ficha entera con desplegables: los tipos de fichero que se pueden elegir. */
function tiposParaPagina_(raiz) {
  const hayAlumnado = leerIndice_(raiz).listados.some(function (e) { return e.clave === 'alumnado'; });
  const relevo = relevoHecho_(raiz);
  return todosLosTipos_().filter(function (c) { return !c.oculta && !(c.clave === 'alumnado' && hayAlumnado) && !(c.clave === 'alumnado-bd' && relevo); }).map(function (c) {
    return {
      clave: c.clave, titulo: c.titulo, aprendido: !!c.aprendido, ambitos: c.ambitos || [], alumno: !!c.porAlumno,
      curso: c.aprendido ? c.usaCurso : !!(c.ficha || {}).curso,
      ambito: !(c.ambitos || []).length ? '' : c.aprendido ? 'abierta' : 'lista',
      periodo: c.aprendido ? (c.usaPeriodo ? 'evaluaciones' : '') : ((c.ficha || {}).periodo === 'anios' ? 'anios' : '')
    };
  });
}

function tieneDato_(datos, campo) { return Object.prototype.hasOwnProperty.call(datos, campo); }

/* Valida lo que manda el navegador y devuelve { c, nuevo, ficha }. No guarda nada: `nuevo` es el tipo por crear, si lo hay. */
function fichaDeCompletar_(p, datos) {
  const falta = p.falta || [], ficha = fichaVacia_();
  let c, nuevo = null;
  const titulo = String(datos.tituloNuevo || '').trim();
  if (tieneDato_(datos, 'tituloNuevo') && titulo) {
    if (titulo.length < 2 || titulo.length > 60) throw new Error('Escribe el nombre del tipo de fichero (entre 2 y 60 letras).');
    nuevo = { clave: claveLibre_(titulo), titulo: titulo, porAlumno: !!datos.porAlumno, usaCurso: false, usaPeriodo: false, ambitos: [] };
    c = tipoComoCatalogo_(nuevo);
  } else {
    const clave = String(datos.clave || p.clave || '');
    if (!clave) throw new Error('Elige qué es este fichero.');
    c = entradaCatalogo_(clave);
    if (!c || c.oculta) throw new Error('Ese tipo de fichero no existe.');
    if (clave === 'alumnado-bd' && relevoHecho_(carpetaDatos_())) throw new Error(MOTIVO_YA_LO_GENERA_);
    if (clave === 'alumnado' && leerIndice_(carpetaDatos_()).listados.some(function (e) { return e.clave === 'alumnado'; })) {
      throw new Error('Ya hay un alumnado guardado. Para cambiarlo, suelta el fichero.');
    }
  }
  if (c.porAlumno) {
    const nombreA = tieneDato_(datos, 'alumno') ? String(datos.alumno).trim() : (falta.indexOf('alumno') === -1 ? p.alumnoNombre || '' : '');
    if (!claveDeAlumno_(nombreA) || nombreA.length > 80) throw new Error('Escribe el nombre del alumno o de la alumna.');
    ficha.alumno = claveDeAlumno_(nombreA);
    return { c: c, nuevo: nuevo, ficha: ficha, alumnoNombre: nombreA };
  }
  const dado = function (campo) { return tieneDato_(datos, campo) ? String(datos[campo]) : (falta.indexOf(campo) === -1 ? (p.ficha || {})[campo] || '' : undefined); };
  /* Curso */
  const curso = dado('cursoEscolar');
  if (nuevo) {
    if (curso === undefined || (curso && !cursoValido_(curso))) throw new Error('Elige un curso.');
    ficha.cursoEscolar = curso; nuevo.usaCurso = !!curso;
  } else if (c.aprendido ? c.usaCurso : (c.ficha || {}).curso) {
    if (curso === undefined || !cursoValido_(curso)) throw new Error('Elige un curso.');
    ficha.cursoEscolar = curso;
  }
  /* A quién se refiere */
  const textoNuevo = String(datos.ambitoNuevo || '').trim();
  if (textoNuevo) {
    if (!(nuevo || c.aprendido)) throw new Error('Para este tipo hay que elegir de la lista.');
    if (textoNuevo.length > 40) throw new Error('Ese nombre es demasiado largo.');
    const valor = claveDeTitulo_(textoNuevo);
    if (!valor) throw new Error('Escribe a quién se refiere con letras.');
    const aprendidoC = nuevo || aprendido_().tipos.filter(function (t) { return t.clave === c.clave; })[0];
    if (!aprendidoC.ambitos.some(function (a) { return a.valor === valor; })) aprendidoC.ambitos.push({ valor: valor, texto: textoNuevo });
    ficha.ambito = valor;
  } else if ((c.ambitos || []).length || (nuevo && tieneDato_(datos, 'ambito'))) {
    const v = dado('ambito');
    if (v === undefined || !(c.ambitos.some(function (a) { return a.valor === v; }) || (c.aprendido && v === ''))) throw new Error('Elige a quién se refiere.');
    ficha.ambito = v;
  }
  /* Periodo */
  const periodo = nuevo && !tieneDato_(datos, 'periodo') && /^col-/.test(dado('periodo') || '') ? '' : dado('periodo');   // las columnas de una planificación no son un periodo
  if (nuevo) {
    if (periodo && !valorValidoDePeriodo_(periodo)) throw new Error('Elige un periodo.');
    ficha.periodo = periodo || ''; nuevo.usaPeriodo = !!periodo;
  } else if (c.aprendido ? c.usaPeriodo : (c.ficha || {}).periodo === 'anios') {
    if (c.aprendido ? !(periodo && valorValidoDePeriodo_(periodo)) : (periodo === undefined || (periodo && !/^\d{4}-\d{4}$/.test(periodo)))) throw new Error('Elige un periodo.');
    ficha.periodo = periodo;
  }
  if (!nuevo && (c.ficha || {}).periodo === 'columnas') ficha.periodo = (p.ficha || {}).periodo || '';   // las columnas de una planificación vienen del fichero
  return { c: c, nuevo: nuevo, ficha: ficha };
}

function frasePlural2_(n) { return n === 1 ? 'Además he colocado solo otro fichero igual.' : 'Además he colocado solos otros ' + n + ' ficheros iguales.'; }

/* Vuelve a pasar por las reglas los demás pendientes, del que llegó antes al que llegó después; los que ya no tienen dudas se colocan. */
function recolocarPendientes_(raiz, salvo) {
  const lista = leerPendientes_(raiz).pendientes.filter(function (q) { return q.id !== salvo; })
    .sort(function (a, b) { return new Date(a.llegado).getTime() - new Date(b.llegado).getTime(); });
  const colocados = [];
  lista.forEach(function (q) {
    const fichero = ficheroDePendiente_(raiz, q);
    const bytes = fichero.getBlob().getBytes();
    const rec = reconocerFichero_(q.fichero, bytes, { cursoElegido: '' });
    if (rec.clave && !rec.falta.length) {
      rec.variante = varianteDeFicha_(rec.ficha);
      const r = guardarListado_(q.fichero, bytes, rec, q.llegadoPor, q.via, { fichero: fichero, llegado: q.llegado });
      if (r.estado !== 'sin-clasificar') colocados.push(q.id);
    } else {
      q.clave = rec.clave; q.ficha = rec.ficha; q.falta = rec.falta; q.propuesta = rec.propuesta || {}; q.motivo = rec.motivo; q.alumnoNombre = rec.alumnoNombre || '';
    }
  });
  return { colocados: colocados, restantes: lista };
}

/* Completa la ficha entera a mano: datos = { clave | tituloNuevo, cursoEscolar, ambito | ambitoNuevo, periodo }.
   El fichero que ya está en Drive se mueve; no se crea otro. Después aprende lo que toque y recoloca los demás pendientes. */
function webCompletarFicha(id, datos, ctx) {
  const raiz = carpetaDatos_();
  if (estaRecolocando_(raiz)) return { estado: 'error', mensaje: MENSAJE_RECOLOCANDO_ };
  cargarAprendido_(raiz);
  const p = leerPendientes_(raiz).pendientes.filter(function (x) { return x.id === id; })[0];
  if (!p) return { estado: 'error', mensaje: 'Ese fichero ya no está pendiente.' };
  const d = fichaDeCompletar_(p, datos || {});
  if (d.nuevo) aprendido_().tipos.push(Object.assign(d.nuevo, { creado: ahoraMadrid_(), creadoPor: (ctx && ctx.correo) || '' }));
  const fichero = ficheroDePendiente_(raiz, p);
  const bytes = fichero.getBlob().getBytes();
  const rec = { clave: d.c.clave, ficha: d.ficha, variante: varianteDeFicha_(d.ficha), tipo: p.tipo, cursoSupuesto: false, alumnoNombre: d.alumnoNombre || '' };
  const r = guardarListado_(p.fichero, bytes, rec, p.llegadoPor, p.via, { fichero: fichero, llegado: p.llegado });
  /* Aprender: qué es (si no se sabía) y los puestos nuevos. */
  const frase = p.clave && p.clave === d.c.clave ? '' : aprenderQueEs_(p, d.c.clave, d.alumnoNombre || '');
  if (d.c.clave === 'personal' && (p.falta || []).indexOf('ambito') !== -1) aprenderPuestos_(bytes, d.ficha.ambito);
  if ((d.c.clave === 'admision' || d.c.clave === 'planificacion' || d.c.clave === 'libros') && (p.falta || []).indexOf('ambito') !== -1) aprenderAmbitoDeNombre_(d.c.clave, p.fichero, d.ficha.ambito);
  escribirAprendido_(raiz);
  const otros = recolocarPendientes_(raiz, id);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const actual = leerPendientes_(raiz);
    const nuevos = {};
    otros.restantes.forEach(function (q) { nuevos[q.id] = q; });
    actual.pendientes = actual.pendientes.filter(function (x) { return x.id !== id && otros.colocados.indexOf(x.id) === -1; })
      .map(function (x) { return nuevos[x.id] || x; });
    escribirPendientes_(raiz, actual);
  } finally {
    lock.releaseLock();
  }
  if (r.estado === 'ya') return r;
  const partes = [d.c.titulo];
  if (d.alumnoNombre) partes.push(d.alumnoNombre);
  if (d.ficha.ambito) partes.push(textoAmbito_(d.c.clave, d.ficha.ambito));
  if (d.ficha.periodo) partes.push(textoPeriodo_(d.ficha.periodo));
  if (d.ficha.cursoEscolar) partes.push(d.ficha.cursoEscolar);
  const mensaje = [/^Guardado como versión anterior/.test(r.mensaje) ? r.mensaje : 'Guardado como ' + partes.join(' · ') + '.'].concat(otros.colocados.length ? [frasePlural2_(otros.colocados.length)] : [], frase ? [frase] : []).join(' ');
  return Object.assign({}, r, { mensaje: mensaje, colocados: otros.colocados.length, aprendido: !!frase });
}

/* Quita un pendiente de la lista sin borrarlo: el fichero se queda en _interno/descartados/. */
function webQuitarPendiente(id, ctx) {
  const raiz = carpetaDatos_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = leerPendientes_(raiz);
    const p = lista.pendientes.filter(function (x) { return x.id === id; })[0];
    if (!p) return { estado: 'error', mensaje: 'Ese fichero ya no está pendiente.' };
    ficheroDePendiente_(raiz, p).moveTo(subcarpetaPorRuta_(raiz, '_interno/descartados'));
    lista.pendientes = lista.pendientes.filter(function (x) { return x.id !== id; });
    escribirPendientes_(raiz, lista);
    apuntarMovimiento_(raiz, { quien: (ctx && ctx.correo) || '', via: 'pagina', fichero: p.fichero, que: 'sin-clasificar', mensaje: 'Quitado de «Sin clasificar». Sigue en la carpeta de datos, en «_interno/descartados».' });
    return { estado: 'quitado', mensaje: 'Quitado de «Sin clasificar».' };
  } finally {
    lock.releaseLock();
  }
}

/* Para un listado ya guardado con la ficha equivocada: su fichero vigente vuelve a «Sin clasificar» con su ficha de ahora; el anterior más reciente pasa a vigente. */
function webCambiarFicha(clave, variante, ctx) {
  if (!entradaCatalogo_(clave) || !/^[0-9A-Za-z-]+(\/[0-9A-Za-z-]+){0,2}$|^$/.test(String(variante || ''))) throw new Error('Ese listado no existe.');
  if (clave === 'alumnado' || entradaCatalogo_(clave).porAlumno) throw new Error('Este listado no se puede cambiar de ficha: suelta el fichero nuevo.');
  const raiz = carpetaDatos_();
  if (estaRecolocando_(raiz)) return { estado: 'error', mensaje: MENSAJE_RECOLOCANDO_ };
  cargarAprendido_(raiz);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let id, siguiente = null;
  try {
    const indice = leerIndice_(raiz);
    const e = buscarEnIndice_(indice, clave, variante);
    if (!e) return { estado: 'error', mensaje: 'Ese listado ya no está guardado.' };
    const fichero = ficheroDeEntrada_(e);
    const bytes = fichero.getBlob().getBytes();
    const rec = reconocerFichero_(e.fichero, bytes, { cursoElegido: '' });
    const h = huella_(bytes);
    id = idPendiente_(h);
    const lista = leerPendientes_(raiz);
    if (lista.pendientes.some(function (x) { return x.id === id; })) return { estado: 'error', mensaje: 'Ese fichero ya está en «Sin clasificar».' };
    fichero.moveTo(subcarpetaPorRuta_(raiz, 'sin-clasificar'));
    fichero.setName(prefijoFecha_(e.subido) + ' ' + e.fichero);
    lista.pendientes.push({ id: id, fichero: e.fichero, idDrive: e.idDrive, llegado: e.subido, llegadoPor: e.subidoPor, via: e.via, bytes: bytes.length, huella: h,
      tipo: e.tipo, titulos: rec.titulos || [], clave: e.clave, ficha: { cursoEscolar: e.cursoEscolar || '', ambito: e.ambito || '', periodo: e.periodo || '', alumno: e.alumno || '' },
      falta: [], propuesta: { ambito: e.ambito || '' }, motivo: 'Lo has sacado de la tabla para cambiarle los datos.' });
    escribirPendientes_(raiz, lista);
    indice.listados = indice.listados.filter(function (x) { return x !== e; });
    escribirIndice_(raiz, indice);
    siguiente = { e: e, indice: indice };
  } finally {
    lock.releaseLock();
  }
  /* El anterior más reciente vuelve a ser el vigente. */
  const carpeta = subcarpetaPorRuta_(raiz, rutaDeListado_('anteriores', clave, variante));
  const anteriores = [];
  const it = carpeta.getFiles();
  while (it.hasNext()) {
    const f = it.next(), m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d) (.*)$/.exec(f.getName());
    if (m) anteriores.push({ f: f, fecha: isoDePrefijo_(m), nombre: m[7], orden: m.slice(1, 7).join('') });
  }
  anteriores.sort(function (a, b) { return a.orden < b.orden ? 1 : -1; });
  if (anteriores.length) {
    const a = anteriores[0], e = siguiente.e;
    const q = quienSubio_(leerMovimientos_(raiz), a.nombre, a.fecha);
    guardarListado_(a.nombre, a.f.getBlob().getBytes(), { clave: clave, variante: variante, ficha: { cursoEscolar: e.cursoEscolar || '', ambito: e.ambito || '', periodo: e.periodo || '', alumno: e.alumno || '' }, tipo: e.tipo, cursoSupuesto: false },
      q.quien, q.via, { fichero: a.f, llegado: a.fecha, sinRegistro: true });
    const indice = leerIndice_(raiz);
    const nueva = buscarEnIndice_(indice, clave, variante);
    if (nueva) { nueva.anteriores = anteriores.length - 1; escribirIndice_(raiz, indice); }
  }
  apuntarMovimiento_(raiz, { quien: (ctx && ctx.correo) || '', via: 'pagina', fichero: siguiente.e.fichero, que: 'sin-clasificar', mensaje: 'Sacado de la tabla para cambiarle los datos.' });
  return { estado: 'ok', id: id, mensaje: 'Ahora está en «Sin clasificar», con los datos que tenía.' };
}

/* ==== Repaso.gs ==== */
/* Al estrenar la regla de los cursos antiguos: lo que esperaba en «Sin clasificar» con tipo pero sin curso se vuelve a mirar una sola vez.
   No se tocan los que no tienen `cursoEscolar` en `falta` (los sacados de la tabla con «Cambiar»). Cada pendiente lleva su marca `cursoRepasado`.
   Como mucho `topeMs` por llamada. Devuelve true si quedan por mirar. */
function repasarCursos_(raiz, topeMs) {
  const lista = leerPendientes_(raiz).pendientes.filter(function (p) { return p.clave && (p.falta || []).indexOf('cursoEscolar') !== -1 && !p.cursoRepasado; })
    .sort(function (a, b) { return new Date(a.llegado).getTime() - new Date(b.llegado).getTime(); });
  if (!lista.length) return false;
  const inicio = new Date().getTime();
  let hechos = 0;
  for (let i = 0; i < lista.length; i++) {
    if (hechos && new Date().getTime() - inicio >= topeMs) return true;
    const q = lista[i];
    const fichero = ficheroDePendiente_(raiz, q);
    const bytes = fichero.getBlob().getBytes();
    const rec = reconocerFichero_(q.fichero, bytes, { cursoElegido: '' });
    let colocado = false;
    if (rec.clave && !rec.falta.length) {
      rec.variante = varianteDeFicha_(rec.ficha);
      colocado = guardarListado_(q.fichero, bytes, rec, q.llegadoPor, q.via, { fichero: fichero, llegado: q.llegado }).estado !== 'sin-clasificar';
    }
    if (colocado) quitarPendiente_(raiz, q.id);
    else actualizarPendiente_(raiz, q.id, { clave: rec.clave, ficha: rec.ficha, falta: rec.falta, propuesta: rec.propuesta || {}, motivo: rec.motivo, alumnoNombre: rec.alumnoNombre || '', cursoRepasado: true });
    hechos++;
  }
  return false;
}

/* ==== RepasoConsejo.gs ==== */
/* Al estrenar el Consejo Escolar (fila 22): lo que esperaba en «Sin clasificar» sin saber qué era se vuelve a mirar una sola vez, porque ahora se reconocen los listados del Consejo con los
   títulos de Séneca (con HTML y asteriscos). Solo se coloca lo que ahora resulta ser del Consejo y sabe su periodo; lo demás se deja como estaba. Cada pendiente lleva su marca `consejoRepasado`.
   Como mucho `topeMs` por llamada. Devuelve true si quedan por mirar. */
function repasarConsejo_(raiz, topeMs) {
  const lista = leerPendientes_(raiz).pendientes.filter(function (p) { return !p.clave && !p.consejoRepasado; })
    .sort(function (a, b) { return new Date(a.llegado).getTime() - new Date(b.llegado).getTime(); });
  if (!lista.length) return false;
  const inicio = new Date().getTime();
  let hechos = 0;
  for (let i = 0; i < lista.length; i++) {
    if (hechos && new Date().getTime() - inicio >= topeMs) return true;
    const q = lista[i];
    const fichero = ficheroDePendiente_(raiz, q);
    const bytes = fichero.getBlob().getBytes();
    const rec = reconocerFichero_(q.fichero, bytes, { cursoElegido: '' });
    let colocado = false;
    if (rec.clave === 'consejo-escolar' && !rec.falta.length) {
      rec.variante = varianteDeFicha_(rec.ficha);
      colocado = guardarListado_(q.fichero, bytes, rec, q.llegadoPor, q.via, { fichero: fichero, llegado: q.llegado }).estado !== 'sin-clasificar';
    }
    if (colocado) quitarPendiente_(raiz, q.id); else actualizarPendiente_(raiz, q.id, { consejoRepasado: true });
    hechos++;
  }
  return false;
}

/* ==== HechosCampos.gs ==== */
/* Datos ya hechos (plan «el Centro de datos como núcleo», docs/PLAN-NUCLEO.md). Aquí vive el registro: qué conjuntos hay, de qué listados se alimentan
   y qué campos lleva cada uno. Un dato nuevo que venga en una columna es una línea en la tabla de campos: no se añade código suelto.
   Cada lector y cada montador llevan su propio número de versión, que se sube a mano cuando cambia su regla (no es VERSION_CD). */
const ACUERDO_HECHO_ = 1;
const DUENO_CD_ = 'centro-de-datos-ies';
const SIN_DATO_ = '?';
const ESTADOS_QUE_NO_CUENTAN_ = ['anulada', 'trasladada'];
const CABECERAS_DOMICILIO_ = {
  direccion: ['Dirección', 'Domicilio'],
  codigoPostal: ['Código postal'],
  localidad: ['Localidad de residencia', 'Localidad', 'Localidad residencia'],
  provincia: ['Provincia de residencia', 'Provincia']
};

/* Los campos de la ficha del alumno que salen de RegAlum, en el orden de CAMPOS_GESTOR (referencia/bd-alumnado/ParaElGestor.gs).
   col: títulos posibles de la columna (gana el primero que tenga valor). calculado: no sale de una columna. */
const CAMPOS_ALUMNADO_ = [
  { clave: 'apellido1', etiqueta: 'Primer apellido', apartado: 'Identidad', tipo: 'texto', col: ['Primer apellido'] },
  { clave: 'apellido2', etiqueta: 'Segundo apellido', apartado: 'Identidad', tipo: 'texto', col: ['Segundo apellido'] },
  { clave: 'nombre', etiqueta: 'Nombre', apartado: 'Identidad', tipo: 'texto', col: ['Nombre'] },
  { clave: 'alumno', etiqueta: 'Alumno/a', apartado: 'Identidad', tipo: 'texto', col: ['Alumno/a'] },
  { clave: 'sexo', etiqueta: 'Sexo', apartado: 'Identidad', tipo: 'texto', col: ['Sexo'] },
  { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', apartado: 'Identidad', tipo: 'fecha', col: ['Fecha de nacimiento'] },
  { clave: 'documento', etiqueta: 'DNI/NIE', apartado: 'Identidad', tipo: 'texto', col: ['DNI/Pasaporte', 'DNI', 'NIF'] },
  { clave: 'localidadNacimiento', etiqueta: 'Localidad de nacimiento', apartado: 'Identidad', tipo: 'texto', col: ['Localidad de nacimiento'] },
  { clave: 'nacionalidad', etiqueta: 'Nacionalidad', apartado: 'Identidad', tipo: 'texto', col: ['Nacionalidad'] },
  { clave: 'curso', etiqueta: 'Curso', apartado: 'Matrícula', tipo: 'texto', col: ['Curso'], fuente: 'matricula,alumnado' },
  { clave: 'unidad', etiqueta: 'Grupo', apartado: 'Matrícula', tipo: 'texto', col: ['Unidad'], fuente: 'matricula,alumnado' },
  { clave: 'ensenanza', etiqueta: 'Enseñanza', apartado: 'Matrícula', tipo: 'texto', calculado: 'ensenanza', fuente: 'matricula,alumnado' },
  { clave: 'estadoMatricula', etiqueta: 'Estado de la matrícula', apartado: 'Matrícula', tipo: 'texto', col: ['Estado Matrícula'] },
  { clave: 'edad', etiqueta: 'Edad a 31/12', apartado: 'Matrícula', tipo: 'numero', col: ['Edad a 31/12 del año de matrícula'] },
  { clave: 'centroProcedencia', etiqueta: 'Centro de procedencia', apartado: 'Procedencia', tipo: 'texto', col: ['Centro de procedencia'], fuente: 'alumnado,expediente-primaria' },
  { clave: 'centrosSecundaria', etiqueta: 'Centros en Secundaria', apartado: 'Procedencia', tipo: 'texto', historia: true, fuente: 'expediente-secundaria' },
  { clave: 'primariaCentro', etiqueta: 'Centro de 6º (expediente)', apartado: 'Procedencia', tipo: 'texto', historia: true, fuente: 'expediente-primaria' },
  { clave: 'materias', etiqueta: 'Materias matriculadas', apartado: 'Materias', tipo: 'tabla', calculado: 'materias', fuente: 'matricula',
    columnas: [{ clave: 'materia', etiqueta: 'Materia' }, { clave: 'situacion', etiqueta: 'Situación' }] },
  { clave: 'modalidad', etiqueta: 'Modalidad', apartado: 'Materias', tipo: 'texto', calculado: 'modalidad', fuente: 'matricula' },
  { clave: 'matriculaNivel', etiqueta: 'Listado de matrícula', apartado: 'Materias', tipo: 'texto', calculado: 'matriculaNivel', fuente: 'matricula' },
  { clave: 'matriculaCeldas', etiqueta: 'Casillas del listado de matrícula', apartado: 'Materias', tipo: 'tabla', calculado: 'matriculaCeldas', fuente: 'matricula',
    columnas: [{ clave: 'columna', etiqueta: 'Columna' }, { clave: 'valor', etiqueta: 'Valor' }] },
  { clave: 'trayectoria', etiqueta: 'Matrículas en el centro', apartado: 'Historia', tipo: 'tabla', calculado: 'trayectoria',
    columnas: [{ clave: 'ano', etiqueta: 'Año' }, { clave: 'curso', etiqueta: 'Curso' }, { clave: 'unidad', etiqueta: 'Grupo' }, { clave: 'estado', etiqueta: 'Estado' }] },
  { clave: 'cursoAnterior', etiqueta: 'Curso el año pasado', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'alumnado,expediente-secundaria' },
  { clave: 'repetiaAnteriorBruto', etiqueta: 'Repetía el año pasado (según los ficheros)', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'alumnado,expediente-secundaria,expediente-primaria' },
  { clave: 'repiteCurso', etiqueta: 'Repite el curso actual', apartado: 'Historia', tipo: 'si-no', historia: true, fuente: 'alumnado,expediente-secundaria,matricula' },
  { clave: 'repeticionesEso', etiqueta: 'Repeticiones en ESO', apartado: 'Historia', tipo: 'numero', historia: true, fuente: 'alumnado,expediente-secundaria' },
  { clave: 'cursosRepetidosEso', etiqueta: 'Cursos repetidos en ESO', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'alumnado,expediente-secundaria' },
  { clave: 'fuenteEso', etiqueta: 'Fuente ESO', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'alumnado,expediente-secundaria' },
  { clave: 'repeticionesPrimaria', etiqueta: 'Rep. Primaria (calculado)', apartado: 'Historia', tipo: 'numero', historia: true, fuente: 'alumnado,expediente-primaria' },
  { clave: 'cursosRepetidosPrimaria', etiqueta: 'Cursos repetidos en Primaria', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'expediente-primaria' },
  { clave: 'fuentePrimaria', etiqueta: 'Fuente Primaria', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'alumnado,expediente-primaria' },
  { clave: 'repSinLocalizarBruto', etiqueta: 'Rep. sin localizar (según los ficheros)', apartado: 'Historia', tipo: 'numero', historia: true, fuente: 'alumnado,expediente-primaria,expediente-secundaria' },
  { clave: 'primariaExpediente', etiqueta: 'Tiene expediente de Primaria', apartado: 'Historia', tipo: 'si-no', historia: true, fuente: 'expediente-primaria' },
  { clave: 'primariaCompleto', etiqueta: 'Expediente de Primaria completo', apartado: 'Historia', tipo: 'si-no', historia: true, fuente: 'expediente-primaria' },
  { clave: 'primariaInicioNormal', etiqueta: 'Empezó Primaria a su edad', apartado: 'Historia', tipo: 'si-no', historia: true, fuente: 'expediente-primaria,alumnado' },
  { clave: 'primariaAnoPrimero', etiqueta: 'Año de 1º de Primaria', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'expediente-primaria' },
  { clave: 'primariaAnoSexto', etiqueta: 'Año de 6º de Primaria', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'expediente-primaria' },
  { clave: 'primariaPendientes', etiqueta: 'Pendientes de 6º', apartado: 'Historia', tipo: 'lista', historia: true, fuente: 'expediente-primaria' },
  { clave: 'primariaArrastradas', etiqueta: 'Arrastraba de Primaria', apartado: 'Historia', tipo: 'lista', historia: true, fuente: 'expediente-primaria' },
  { clave: 'primariaRepeticiones', etiqueta: 'Rep. Primaria (expediente)', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'expediente-primaria' },
  { clave: 'secundariaExpediente', etiqueta: 'Tiene expediente de Secundaria', apartado: 'Historia', tipo: 'si-no', historia: true, fuente: 'expediente-secundaria' },
  { clave: 'secundariaSuspensosAnterior', etiqueta: 'Suspensos el año pasado (expediente)', apartado: 'Historia', tipo: 'numero', historia: true, fuente: 'expediente-secundaria' },
  { clave: 'secundariaAnos', etiqueta: 'Años de Secundaria que trae', apartado: 'Historia', tipo: 'texto', historia: true, fuente: 'expediente-secundaria' },
  { clave: 'secundariaTrayectoria', etiqueta: 'Años de Secundaria (expediente)', apartado: 'Historia', tipo: 'tabla', historia: true, fuente: 'expediente-secundaria',
    columnas: [{ clave: 'ano', etiqueta: 'Año' }, { clave: 'curso', etiqueta: 'Curso' }, { clave: 'centro', etiqueta: 'Centro' }, { clave: 'estado', etiqueta: 'Estado' }, { clave: 'suspensos', etiqueta: 'Suspensos' }] },
  { clave: 'secundariaNotas', etiqueta: 'Notas de Secundaria (expediente)', apartado: 'Historia', tipo: 'tabla', historia: true, fuente: 'expediente-secundaria',
    columnas: [{ clave: 'ano', etiqueta: 'Año' }, { clave: 'materia', etiqueta: 'Materia' }, { clave: 'nota', etiqueta: 'Nota' }, { clave: 'de', etiqueta: 'De' }] },
  { clave: 'censoNeae', etiqueta: 'Está en el censo NEAE', apartado: 'Apoyos', tipo: 'si-no', historia: true, fuente: 'censo-neae' },
  { clave: 'censoNecesidades', etiqueta: 'NEAE (censo)', apartado: 'Apoyos', tipo: 'texto', historia: true, fuente: 'censo-neae' },
  { clave: 'censoMedidas', etiqueta: 'Medidas y recursos (censo)', apartado: 'Apoyos', tipo: 'texto', historia: true, fuente: 'censo-neae' },
  { clave: 'censoLocalizado', etiqueta: 'Cómo se localizó', apartado: 'Apoyos', tipo: 'texto', historia: true, fuente: 'censo-neae' },
  { clave: 'numPendientes', etiqueta: 'Nº pendientes', apartado: 'Historia', tipo: 'numero', calculado: 'numPendientes', fuente: 'matricula,expediente-primaria' },
  { clave: 'pendientes', etiqueta: 'Asignaturas pendientes', apartado: 'Historia', tipo: 'lista', calculado: 'pendientes', fuente: 'matricula,expediente-primaria' },
  { clave: 'telefono', etiqueta: 'Teléfono', apartado: 'Contacto', tipo: 'texto', col: ['Teléfono'] },
  { clave: 'telefonoPersonal', etiqueta: 'Teléfono personal', apartado: 'Contacto', tipo: 'texto', col: ['Teléfono personal', 'Teléfono móvil'] },
  { clave: 'telefonoUrgencia', etiqueta: 'Teléfono de urgencia', apartado: 'Contacto', tipo: 'texto', col: ['Teléfono de urgencia'] },
  { clave: 'correo', etiqueta: 'Correo electrónico', apartado: 'Contacto', tipo: 'texto', col: ['Correo electrónico', 'Correo Electrónico Personal Alumno'] },
  { clave: 'domicilio', etiqueta: 'Domicilio', apartado: 'Contacto', tipo: 'texto', col: CABECERAS_DOMICILIO_.direccion },
  { clave: 'codigoPostal', etiqueta: 'Código postal', apartado: 'Contacto', tipo: 'texto', col: CABECERAS_DOMICILIO_.codigoPostal },
  { clave: 'localidad', etiqueta: 'Localidad', apartado: 'Contacto', tipo: 'texto', col: CABECERAS_DOMICILIO_.localidad },
  { clave: 'provincia', etiqueta: 'Provincia', apartado: 'Contacto', tipo: 'texto', col: CABECERAS_DOMICILIO_.provincia },
  { clave: 'tutores', etiqueta: 'Tutores legales', apartado: 'Contacto', tipo: 'tabla', calculado: 'tutores',
    columnas: [{ clave: 'orden', etiqueta: 'Tutor' }, { clave: 'apellido1', etiqueta: 'Primer apellido' }, { clave: 'apellido2', etiqueta: 'Segundo apellido' },
               { clave: 'nombre', etiqueta: 'Nombre' }, { clave: 'documento', etiqueta: 'DNI/NIE' }, { clave: 'sexo', etiqueta: 'Sexo' },
               { clave: 'telefono', etiqueta: 'Teléfono' }, { clave: 'movil', etiqueta: 'Móvil' }, { clave: 'correo', etiqueta: 'Correo electrónico' }] }
];

/* Los campos de la ficha del personal (fila 11), en el orden en que se publican. Los que llevan `col` salen de una columna del listado; los `calculado`, de varias filas. */
const CAMPOS_PERSONAL_ = [
  { clave: 'empleado', etiqueta: 'Empleado/a', apartado: 'Identidad', tipo: 'texto', col: ['Empleado/a'] },
  { clave: 'apellidos', etiqueta: 'Apellidos', apartado: 'Identidad', tipo: 'texto', calculado: 'apellidos' },
  { clave: 'nombre', etiqueta: 'Nombre', apartado: 'Identidad', tipo: 'texto', calculado: 'nombre' },
  { clave: 'documento', etiqueta: 'DNI/Pasaporte', apartado: 'Identidad', tipo: 'texto', col: ['DNI/Pasaporte'] },
  { clave: 'tipoPersonal', etiqueta: 'Docente o no docente', apartado: 'Puesto', tipo: 'texto', calculado: 'tipoPersonal' },
  { clave: 'puesto', etiqueta: 'Puesto', apartado: 'Puesto', tipo: 'texto', col: ['Puesto'] },
  { clave: 'especialidad', etiqueta: 'Especialidad', apartado: 'Puesto', tipo: 'texto', col: ['Especialidad'] },
  { clave: 'fechaTomaPosesion', etiqueta: 'Fecha de toma de posesión', apartado: 'Puesto', tipo: 'fecha', col: ['Fecha de toma de posesión'] },
  { clave: 'fechaCese', etiqueta: 'Fecha de cese', apartado: 'Puesto', tipo: 'fecha', col: ['Fecha de cese'] },
  { clave: 'situacion', etiqueta: 'Situación', apartado: 'Puesto', tipo: 'texto', col: ['Situación'] },
  { clave: 'puestos', etiqueta: 'Filas en los listados', apartado: 'Puesto', tipo: 'tabla', calculado: 'puestos',
    columnas: [{ clave: 'listado', etiqueta: 'Listado' }, { clave: 'puesto', etiqueta: 'Puesto' }, { clave: 'fechaTomaPosesion', etiqueta: 'Fecha de toma de posesión' }, { clave: 'fechaCese', etiqueta: 'Fecha de cese' }] },
  { clave: 'telefono', etiqueta: 'Teléfono', apartado: 'Contacto', tipo: 'texto', col: ['Teléfono'] },
  { clave: 'correo', etiqueta: 'Correo electrónico', apartado: 'Contacto', tipo: 'texto', col: ['Correo', 'Correo electrónico'] },
  { clave: 'listados', etiqueta: 'Listados en los que sale', apartado: 'Listado', tipo: 'lista', calculado: 'listados' },
  { clave: 'celdas', etiqueta: 'Casillas del listado', apartado: 'Listado', tipo: 'tabla', calculado: 'celdas', columnas: [{ clave: 'columna', etiqueta: 'Columna' }, { clave: 'valor', etiqueta: 'Valor' }] }
];

/* Los campos de los libros de texto (fila 37), en el orden en que se publican. Los que llevan `col` salen de una columna del listado; `nivel`, `nivelTexto` y `conLibro` los pone el montador. */
const CAMPOS_LIBROS_ = [
  { clave: 'nivel', etiqueta: 'Nivel', apartado: 'Asignatura', tipo: 'texto' },
  { clave: 'nivelTexto', etiqueta: 'Nivel (para leer)', apartado: 'Asignatura', tipo: 'texto' },
  { clave: 'materia', etiqueta: 'Asignatura', apartado: 'Asignatura', tipo: 'texto', col: ['Materia'] },
  { clave: 'conLibro', etiqueta: 'Tiene libro', apartado: 'Libro', tipo: 'si-no' },
  { clave: 'isbn', etiqueta: 'ISBN/EAN', apartado: 'Libro', tipo: 'texto', col: ['ISBN/EAN'] },
  { clave: 'editorial', etiqueta: 'Editorial', apartado: 'Libro', tipo: 'texto', col: ['Editorial'] },
  { clave: 'titulo', etiqueta: 'Título', apartado: 'Libro', tipo: 'texto', col: ['Título'] },
  { clave: 'anioImplantacion', etiqueta: 'Año de implantación', apartado: 'Libro', tipo: 'numero', col: ['Año de Impl.'] },
  { clave: 'importe', etiqueta: 'Importe estimado (€)', apartado: 'Libro', tipo: 'numero', col: ['Importe estimado'] },
  { clave: 'digital', etiqueta: 'Digital', apartado: 'Libro', tipo: 'si-no', col: ['Digital'] },
  { clave: 'chequeLibro', etiqueta: 'Incluido en el cheque libro', apartado: 'Libro', tipo: 'si-no', col: ['Incluir en cheque libro'] },
  { clave: 'otroMaterial', etiqueta: 'Otro material curricular', apartado: 'Libro', tipo: 'si-no', col: ['Otro material curricular'] },
  { clave: 'celdas', etiqueta: 'Casillas del listado', apartado: 'Listado', tipo: 'tabla', columnas: [{ clave: 'columna', etiqueta: 'Columna' }, { clave: 'valor', etiqueta: 'Valor' }] }
];

/* Los campos de las tutorías (fila 21): una ficha por grupo; las filas de `tutores` son las de `COLUMNAS_TUTORES_TUTORIAS_`. */
const COLUMNAS_TUTORES_TUTORIAS_ = [{ clave: 'id', etiqueta: 'Documento normalizado' }, { clave: 'documento', etiqueta: 'DNI/NIE' }, { clave: 'empleado', etiqueta: 'Empleado/a' },
  { clave: 'apellidos', etiqueta: 'Apellidos' }, { clave: 'nombre', etiqueta: 'Nombre' }, { clave: 'periodo', etiqueta: 'Periodo' }, { clave: 'desde', etiqueta: 'Desde' },
  { clave: 'hasta', etiqueta: 'Hasta' }, { clave: 'sustituto', etiqueta: 'Sustituto/a' }, { clave: 'hoy', etiqueta: 'Está en vigor hoy' }, { clave: 'enPersonal', etiqueta: 'Está en la ficha del personal' }];
const CAMPOS_TUTORIAS_ = [
  { clave: 'unidad', etiqueta: 'Grupo', apartado: 'Grupo', tipo: 'texto', calculado: 'unidad' },
  { clave: 'tutores', etiqueta: 'Tutores del curso', apartado: 'Tutoría', tipo: 'tabla', calculado: 'tutores', columnas: COLUMNAS_TUTORES_TUTORIAS_ },
  { clave: 'tutorHoy', etiqueta: 'Tutor/a hoy', apartado: 'Tutoría', tipo: 'texto', calculado: 'tutorHoy' },
  { clave: 'tutorHoyId', etiqueta: 'Documento del tutor/a de hoy', apartado: 'Tutoría', tipo: 'texto', calculado: 'tutorHoyId' }
];

/* Los campos del Consejo Escolar (fila 22). `en`: 'periodo' o 'historial' si solo van en una de las dos partes; sin él, van en las dos. */
const CAMPOS_CONSEJO_ = [
  { clave: 'miembro', etiqueta: 'Miembro', apartado: 'Miembro', tipo: 'texto', calculado: 'miembro' },
  { clave: 'apellidos', etiqueta: 'Apellidos', apartado: 'Miembro', tipo: 'texto', calculado: 'apellidos' },
  { clave: 'nombre', etiqueta: 'Nombre', apartado: 'Miembro', tipo: 'texto', calculado: 'nombre' },
  { clave: 'claveNombre', etiqueta: 'Nombre para comparar', apartado: 'Miembro', tipo: 'texto', calculado: 'claveNombre' },
  { clave: 'sector', etiqueta: 'Sector', apartado: 'Nombramiento', tipo: 'texto', calculado: 'sector' },
  { clave: 'cargo', etiqueta: 'Cargo', apartado: 'Nombramiento', tipo: 'texto', calculado: 'cargo' },
  { clave: 'nombramiento', etiqueta: 'Nombramiento', apartado: 'Nombramiento', tipo: 'fecha', calculado: 'nombramiento' },
  { clave: 'cese', etiqueta: 'Cese', apartado: 'Nombramiento', tipo: 'fecha', calculado: 'cese' },
  { clave: 'nato', etiqueta: 'Miembro nato (sin fechas)', apartado: 'Nombramiento', tipo: 'si-no', calculado: 'nato' },
  { clave: 'fichaConjunto', etiqueta: 'Ficha: de qué tipo', apartado: 'Ficha', tipo: 'texto', calculado: 'fichaConjunto' },
  { clave: 'fichaId', etiqueta: 'Ficha: su identificador', apartado: 'Ficha', tipo: 'texto', calculado: 'fichaId' },
  { clave: 'celdas', etiqueta: 'Casillas del listado', apartado: 'Listado', tipo: 'tabla', calculado: 'celdas', en: 'periodo', columnas: [{ clave: 'columna', etiqueta: 'Columna' }, { clave: 'valor', etiqueta: 'Valor' }] },
  { clave: 'periodos', etiqueta: 'Periodos en que aparece', apartado: 'Listado', tipo: 'lista', calculado: 'periodos', en: 'historial' },
  { clave: 'miembroHoy', etiqueta: 'Miembro hoy', apartado: 'Nombramiento', tipo: 'si-no', calculado: 'miembroHoy', en: 'historial' }
];

/* Los campos que añade el paso propio de los cargos (fila 25, HechosCargos.gs) a lo que entrega el Gestor. */
const CAMPOS_CARGOS_ = [
  { clave: 'claveNombre', etiqueta: 'Nombre para comparar', apartado: 'Ocupante', tipo: 'texto', dueno: DUENO_CD_, fuente: 'entrega' },
  { clave: 'fichaConjunto', etiqueta: 'Ficha: de qué tipo', apartado: 'Ocupante', tipo: 'texto', dueno: DUENO_CD_, fuente: 'personal' },
  { clave: 'fichaId', etiqueta: 'Ficha: su identificador', apartado: 'Ocupante', tipo: 'texto', dueno: DUENO_CD_, fuente: 'personal' },
  { clave: 'ocupaHoy', etiqueta: 'Ocupa el cargo hoy', apartado: 'Ocupante', tipo: 'si-no', dueno: DUENO_CD_, fuente: 'entrega' }
];

/* Los campos de los contactos del profesorado (fila 98). `origen` es una clave más de `datos` (de dónde sale cada dato) y no va aquí: no es un dato para enseñar. */
const CAMPOS_CONTACTOS_ = [
  { clave: 'empleado', etiqueta: 'Empleado/a', apartado: 'Identidad', tipo: 'texto', dueno: DUENO_CD_, fuente: 'personal' },
  { clave: 'correoCentro', etiqueta: 'Correo del centro', apartado: 'Contacto', tipo: 'texto', dueno: DUENO_CD_, fuente: 'personal' },
  { clave: 'correoPersonal', etiqueta: 'Correo personal', apartado: 'Contacto', tipo: 'texto', dueno: DUENO_CD_, fuente: 'personal' },
  { clave: 'movil', etiqueta: 'Móvil', apartado: 'Contacto', tipo: 'texto', dueno: DUENO_CD_, fuente: 'personal' }
];

/* Los conjuntos. fuentes: qué claves del catálogo lo alimentan, con qué lector (HechosLeer.gs) y su versión.
   Los nombres de lector y de montador son palabras: lectorDe_ y montadorDe_ (más abajo, en otros ficheros) los convierten en función. */
const CONJUNTOS_ = [
  { conjunto: 'alumnado', titulo: 'Alumnado', cuenta: 'alumnos', acuerdoHecho: ACUERDO_HECHO_, montador: 'alumnado', versionMontador: 5,
    /* Quién puede entregar al conjunto y cómo se llama; y su ficha completa (el fichero que juntará partes y entregas). */
    entregas: ['bd-alumnado-ies'], aplicaciones: { 'bd-alumnado-ies': 'BD Alumnado' },
    fichaCompleta: { clave: 'alumnado-bd', fichero: 'ALUMNADO-BD.json', acuerdo: 2, version: 1 },
    fuentes: [{ clave: 'alumnado', lector: 'regalum', versionLector: 2 }, { clave: 'matricula', lector: 'matricula', versionLector: 1, porCurso: true, esMatricula: true },
      { clave: 'expediente-primaria', lector: 'expedientePrimaria', versionLector: 1, porAlumno: true, soloActuales: true },
      { clave: 'expediente-secundaria', lector: 'expedienteSecundaria', versionLector: 1, porAlumno: true, soloActuales: true },
      { clave: 'censo-neae', lector: 'censo', versionLector: 1, porCurso: true }], campos: CAMPOS_ALUMNADO_ },
  /* El personal (fila 11): una parte por cada curso con algún listado `personal`, sin `actuales` ni `antiguos`, sin entregas ni ficha completa. `porCursos`: sus fuentes son
     todos los listados `personal` con curso (no hay un «primero»). `sufijoAvisos`: cómo cuenta la página sus avisos. */
  { conjunto: 'personal', titulo: 'Personal', cuenta: 'personas', acuerdoHecho: ACUERDO_HECHO_, montador: 'personal', versionMontador: 1, porCursos: true,
    entregas: [], aplicaciones: {}, sufijoAvisos: 'del personal',
    fuentes: [{ clave: 'personal', lector: 'personal', versionLector: 1 }], campos: CAMPOS_PERSONAL_ },
  /* Los libros de texto (fila 37): una parte por cada curso con algún listado `libros` (un fichero por nivel), como el personal. Sin entregas ni ficha completa. */
  { conjunto: 'libros', titulo: 'Libros de texto', cuenta: 'libros', acuerdoHecho: ACUERDO_HECHO_, montador: 'libros', versionMontador: 1, porCursos: true,
    entregas: [], aplicaciones: {}, sufijoAvisos: 'de los libros',
    fuentes: [{ clave: 'libros', lector: 'libros', versionLector: 1 }], campos: CAMPOS_LIBROS_ },
  /* Las tutorías (fila 21): una parte por cada curso con un PDF de la función tutorial. Además de su listado mira la parte del personal y la `actuales` del alumnado del mismo curso
     (`mira`) y se rehace cuando cambia el día en que una línea empieza o acaba (`conDias`). Van después de esos dos. */
  { conjunto: 'tutorias', titulo: 'Tutorías', cuenta: 'grupos', acuerdoHecho: ACUERDO_HECHO_, montador: 'tutorias', versionMontador: 1, porCursos: true, mira: ['personal', 'alumnado'], conDias: true,
    entregas: [], aplicaciones: {}, sufijoAvisos: 'de las tutorías',
    fuentes: [{ clave: 'tutorias', lector: 'tutorias', versionLector: 3 }], campos: CAMPOS_TUTORIAS_ },
  /* El Consejo Escolar (fila 22): no va por cursos sino por periodos. Una parte `periodo` por cada listado con periodo y un `historial` que sale de ellas (`porPeriodos`). Mira el personal y el alumnado
     (`mira`) y el historial se rehace el día en que cambia «miembro hoy» (`conDias`, sus días en `avance.dias`). Va detrás de los otros tres. */
  { conjunto: 'consejo-escolar', titulo: 'Consejo Escolar', cuenta: 'nombramientos', acuerdoHecho: ACUERDO_HECHO_, montador: 'consejo', versionMontador: 1, porCursos: true, porPeriodos: true,
    mira: ['personal', 'alumnado'], conDias: true, entregas: [], aplicaciones: {}, sufijoAvisos: 'del Consejo Escolar',
    fuentes: [{ clave: 'consejo-escolar', lector: 'consejo', versionLector: 1 }], campos: CAMPOS_CONSEJO_ },
  /* Las empresas (fila 23): el primer conjunto que se entrega entero. No tiene listados ni campos propios: su única fuente es la entrega vigente de `entregadoPor` (la lista entera) y sus campos y registros los dice
     ella (HechosEnteros.gs). Una sola parte, `todas`. Otro conjunto así es otra línea como esta. `entregadas` y `quienEntrega` son palabras de la línea de la página. */
  { conjunto: 'empresas', titulo: 'Empresas', cuenta: 'empresas', acuerdoHecho: ACUERDO_HECHO_, montador: 'entero', versionMontador: 1, entregadoPor: 'gestor-asuntos-ies',
    entregas: ['gestor-asuntos-ies'], aplicaciones: { 'gestor-asuntos-ies': 'Gestor de asuntos' }, entregadas: 'entregadas', quienEntrega: 'el Gestor de asuntos', sufijoAvisos: 'de empresas',
    fuentes: [], campos: [] },
  /* Las Administraciones (fila 24): otro conjunto entregado entero por el Gestor, igual que las empresas, con las dos claves opcionales del registro: `desglose` (por qué clave de `datos` se reparte la cuenta que dice la
     página y cómo se llama cada trozo) y `unicos` (claves de `datos` cuyo valor no debería repetirse entre registros: si se repite, aviso, y el registro entra igual). */
  { conjunto: 'administraciones', titulo: 'Administraciones', cuenta: 'administraciones', acuerdoHecho: ACUERDO_HECHO_, montador: 'entero', versionMontador: 1, entregadoPor: 'gestor-asuntos-ies',
    entregas: ['gestor-asuntos-ies'], aplicaciones: { 'gestor-asuntos-ies': 'Gestor de asuntos' }, entregadas: 'entregadas', quienEntrega: 'el Gestor de asuntos', sufijoAvisos: 'de administraciones',
    desglose: { clave: 'clase', trozos: [{ valor: 'organismo', uno: 'organismo', varios: 'organismos' }, { valor: 'centro', uno: 'centro', varios: 'centros' }] },
    unicos: ['tercero', 'codigoCentro'], fuentes: [], campos: [] },
  /* Los cargos (fila 25): entregado entero por el Gestor y con tres claves más, opcionales y válidas para cualquier conjunto así: `pasoPropio` (una palabra de `pasoPropioDe_`: lo que se hace después de montar, aquí unir
     con el personal y decir quién ocupa hoy), `camposPropios` (los campos que añade ese paso) y `cuentaPor` (por qué clave de `datos` se cuentan los valores distintos que dice la página). `mira`: los conjuntos
     de los que depende (todas sus partes); `conDias`: se rehace el día en que cambia «ocupa hoy». `parteNombre`: la parte se llama `todos`. `avisosPropios`: los avisos que da el paso, además de los de todo conjunto así. */
  { conjunto: 'cargos', titulo: 'Cargos', cuenta: 'cargos', acuerdoHecho: ACUERDO_HECHO_, montador: 'entero', versionMontador: 1, entregadoPor: 'gestor-asuntos-ies', parteNombre: 'todos',
    entregas: ['gestor-asuntos-ies'], aplicaciones: { 'gestor-asuntos-ies': 'Gestor de asuntos' }, entregadas: 'entregados', quienEntrega: 'el Gestor de asuntos', sufijoAvisos: 'de cargos',
    pasoPropio: 'cargos', camposPropios: CAMPOS_CARGOS_, cuentaPor: 'cargo', avisosPropios: ['sin-ficha', 'ficha-dudosa', 'fechas'], mira: ['personal'], conDias: true, fuentes: [], campos: [] },
  /* Los contactos del profesorado (fila 98): sale del personal del curso de hoy (los listados `personal` de ese curso son sus fuentes) y de lo escrito a mano (`_interno/contactos-a-mano.json`, HechosContactos.gs). Una sola parte, `todos`.
     `cambios`: qué aplicaciones pueden mandarle cambios (`CAMBIOS contactos <aplicación>.json`); no recibe entregas. `datosSinCampo`: claves de `datos` que no son un campo. Sin diagnóstico: son contactos. */
  { conjunto: 'contactos', titulo: 'Contactos del profesorado', cuenta: 'contactos', acuerdoHecho: ACUERDO_HECHO_, montador: 'contactos', versionMontador: 1, deContactos: true, parteNombre: 'todos', sinDiagnostico: true,
    entregas: [], aplicaciones: { 'ausencias-guardias-ies': 'Ausencias y Guardias', 'centro-de-datos-ies': 'Centro de datos' }, cambios: ['ausencias-guardias-ies'], datosSinCampo: ['origen'], sufijoAvisos: 'de contactos',
    fuentes: [], campos: CAMPOS_CONTACTOS_ }
];

/* Los campos de un conjunto como van en el fichero: sin las pistas de dónde sale cada uno, y con su dueño y su fuente.
   En una parte sin fuentes de curso (`antiguos`) solo van los que salen del primer listado, y su fuente es solo ese. */
function camposPublicos_(conj, soloPrimera, tipoDeParte) {
  const primera = conj.fuentes[0].clave;
  return conj.campos.filter(function (c) { return !c.en || c.en === tipoDeParte; }).filter(function (c) { return !soloPrimera || (!c.historia && (!c.fuente || c.fuente.split(',').indexOf(primera) !== -1)); }).map(function (c) {
    const d = { clave: c.clave, etiqueta: c.etiqueta, apartado: c.apartado, tipo: c.tipo };
    if (c.columnas) d.columnas = c.columnas;
    d.dueno = DUENO_CD_;
    d.fuente = soloPrimera ? primera : (c.fuente || primera);
    return d;
  });
}

/* Como la `normalizar` de BD Alumnado: así se comparan nombres y estados. */
function normalizarAlumno_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/* Un valor del fichero al tipo del campo (como convertirGestor_). Lo vacío y «?» no se escriben: devuelve null. */
function convertirValorHecho_(v, tipo) {
  if (v === null || v === undefined) return null;
  const t = String(v).replace(/\s+/g, ' ').trim();
  if (!t || t === SIN_DATO_) return null;
  if (tipo === 'numero') { const n = parseFloat(t.replace(',', '.')); return isNaN(n) ? null : n; }
  if (tipo === 'fecha') {
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : null;
  }
  if (tipo === 'si-no') { const n = normalizarAlumno_(t); return n.indexOf('si') === 0 ? true : (n === 'no' ? false : null); }
  if (tipo === 'lista') { const l = t.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(String); return l.length ? l : null; }
  return t;
}

/* ==== HechosSiglas.gs ==== */
/* Las siglas de las materias, copiadas como tabla de datos de BD Alumnado (referencia/bd-alumnado/BaseHojas.gs y Bachillerato.gs): una materia se abrevia igual en toda la casa.
   Se comparan sin tildes ni mayúsculas (SIGLAS_ESO_) o tal cual (SIGLAS_BAC_). */
const SIGLAS_ESO_ = {
  'Biología y Geología': 'BYG', 'Educación Física': 'EFI', 'Educación Plástica, Visual y Audiovisual': 'EPV', 'Geografía e Historia': 'GEH',
  'Lengua Castellana y Literatura': 'LCL', 'Matemáticas': 'MAT', 'Música': 'MUS', 'Inglés': 'ING', 'Francés (Segundo Idioma)': 'FRA2',
  'Área Lingüística de carácter transversal': 'ALCT', 'Computación y Robótica': 'CYR', 'Oratoria y Debate': 'OYD',
  'Music, theatre and games for English': 'MTGE', 'Atención Educativa': 'ATEDU', 'Religión Católica': 'REL', 'Religión Evangélica': 'REV',
  'Física y Química': 'FYQ', 'Tecnología y Digitalización': 'TYD', 'Educación en Valores Cívicos y Éticos': 'VCE',
  'Proyecto de Educación Plástica y Audiovisual': 'PEPA', 'Ámbito Científico-Tecnológico': 'ACT', 'Ámbito Lingüístico y Social': 'ALS',
  'Laboratorio de Física y Química': 'LFQ', 'Cultura Clásica': 'CC', 'Matemáticas A': 'MAA', 'Matemáticas B': 'MAB', 'Dibujo Técnico': 'DBT',
  'Digitalización': 'DIG', 'Economía y Emprendimiento': 'ECE', 'Expresión Artística': 'EAR', 'Formación y Orientación Personal y Profesional': 'FOP',
  'Latín': 'LAT', 'Nutrición, Salud y Deporte': 'NSD', 'Prácticas Biológicas': 'PB', 'Tecnología': 'TEC'
};

const SIGLAS_BAC_ = {
  'Filosofía': 'FIL', 'Historia de España': 'HES', 'Historia de la Filosofía': 'HFI', 'Matemáticas Aplicadas a las Ciencias Sociales': 'MCS',
  'Biología, Geología y Ciencias Ambientales': 'BGCA', 'Biología': 'BIO', 'Física': 'FIS', 'Química': 'QUI', 'Tecnología e Ingeniería': 'TEI',
  'Anatomía Aplicada': 'ANA', 'Antropología y Sociología': 'ANT', 'Creación Digital y Pensamiento Computacional': 'CDPC',
  'Patrimonio Cultural y Artístico de Andalucía': 'PCA', 'Fisiología Humana': 'FIH', 'Iniciación al Comentario de Texto': 'ICT', 'Olimpismo': 'OLI',
  'Tecnologías de la Información y la Comunicación': 'TIC', 'Cultura Emprendedora y Empresarial': 'CEE', 'Educación para la Convivencia Democrática': 'ECD',
  'Proyectos Transversales de Educación en Valores': 'PTEV', 'Economía': 'ECO', 'Historia del Mundo Contemporáneo': 'HMC', 'Literatura Universal': 'LUN',
  'Griego': 'GRI', 'Actividad Física, Salud y Sociedad': 'AFSS', 'Programación y Computación': 'PRC', 'Psicología': 'PSI', 'Estadística': 'EST',
  'Empresa y Diseño de Modelos de Negocio': 'EDMN', 'Geografía': 'GEO', 'Historia del Arte': 'HAR', 'Finanzas y Economía': 'FYE', 'Electrotecnia': 'ELE',
  'Introducción a las Ciencias de la Salud': 'ICS', 'Imagen y Sonido': 'IMS', 'Ciencias de la Tierra y del Medio Ambiente': 'CTMA',
  'Geología y Ciencias Ambientales': 'GEOA', 'Fundamentos de Administración y Gestión': 'FAG', 'Mitología Clásica': 'MIC'
};

/* Materias que delatan la modalidad de un fichero de Bachillerato (modalidadPorLasMaterias_ de BD Alumnado). */
const DELATAN_CIENCIAS_ = ['Física y Química', 'Dibujo Técnico', 'Química', 'Física', 'Biología, Geología y Ciencias Ambientales', 'Biología', 'Tecnología e Ingeniería'];
const DELATAN_HUMANIDADES_ = ['Latín', 'Griego', 'Historia del Arte', 'Literatura Universal', 'Economía', 'Geografía'];
const MODALIDAD_CIENCIAS_ = 'Ciencias y Tecnología';
const MODALIDAD_HUMANIDADES_ = 'Humanidades y CC. Sociales';

function siglaEso_(nombre) {
  const objetivo = normalizarAlumno_(nombre);
  const clave = Object.keys(SIGLAS_ESO_).filter(function (k) { return normalizarAlumno_(k) === objetivo; })[0];
  return clave === undefined ? nombre : SIGLAS_ESO_[clave];
}

function siglaBac_(materia) {
  const t = String(materia || '').trim();
  if (SIGLAS_ESO_[t] !== undefined) return SIGLAS_ESO_[t];
  if (SIGLAS_BAC_[t] !== undefined) return SIGLAS_BAC_[t];
  return t;
}

/* «Filosofía (1º de Bachillerato (Humanid.y Ciencias Social» → «Filosofía». Ojo: «Francés (Segundo Idioma)» también lleva paréntesis y no es una pendiente. */
function pendienteDeBachillerato_(titulo) {
  const t = String(titulo || '').trim();
  const i = t.indexOf('(1º de Bachillerato');
  return i <= 0 ? '' : t.substring(0, i).trim();
}

function modalidadPorLasMaterias_(titulos) {
  let c = 0, h = 0;
  titulos.forEach(function (t) {
    const x = String(t || '').trim();
    if (DELATAN_CIENCIAS_.indexOf(x) !== -1) c++;
    if (DELATAN_HUMANIDADES_.indexOf(x) !== -1) h++;
  });
  return c > h ? MODALIDAD_CIENCIAS_ : (h > c ? MODALIDAD_HUMANIDADES_ : '');
}

/* Las materias de Primaria, acortadas (referencia/bd-alumnado/Primaria.gs). Las que ya están en SIGLAS_ESO_ se buscan allí. */
const SIGLAS_PRIMARIA_ = {
  'Conocimiento del Medio Natural Social y Cultural': 'CM', 'Educación Artística': 'ART', 'Inglés (Primer Idioma)': 'ING', 'Ciencias de la Naturaleza': 'CNA',
  'Ciencias Sociales': 'CSO', 'Valores sociales y cívicos': 'VSC', 'Proyecto Interdisciplinar': 'PI', 'Proyecto Interdisciplinar 1': 'PI',
  'Educación para la Ciudadanía y los Derechos Humanos': 'ECDH', 'Inteligencia Emocional en el Aula. Colegio con Consciencia Plena': 'IE', 'Materia de diseño propio 1': 'MDP'
};

/* La sigla de una materia de Primaria; si no la conoce devuelve el nombre y lo apunta en `sinSigla`. */
function siglaPrimaria_(nombre, sinSigla) {
  const objetivo = normalizarAlumno_(nombre);
  const clave = Object.keys(SIGLAS_PRIMARIA_).filter(function (k) { return normalizarAlumno_(k) === objetivo; })[0];
  if (clave !== undefined) return SIGLAS_PRIMARIA_[clave];
  const general = siglaEso_(nombre);
  if (normalizarAlumno_(general) !== objetivo) return general;
  if (sinSigla) sinSigla.push('Materia de Primaria sin abreviar: ' + nombre);
  return nombre;
}

/* ==== HechosLeer.gs ==== */
/* Los lectores: abren un listado y devuelven SOLO lo que la tabla de campos nombra, ya interpretado. Se guarda en _interno/leido/<clave>.json
   con la huella del fichero y la versión del lector: mientras no cambie ninguna de las dos, no se vuelve a abrir. Lleva datos de menores: solo en Drive. */
function lectorDe_(nombre) { return { regalum: leerRegAlum_, matricula: leerMatricula_, censo: leerCensoNeae_, personal: leerPersonal_, libros: leerLibros_, tutorias: leerTutorias_, consejo: leerConsejo_, entrega: leerEntrega_ }[nombre]; }

/* «2026» → «26-27». Como anoAcademico_ de BD Alumnado. */
function anoAcademicoHecho_(ano) {
  const n = parseInt(ano, 10);
  if (!n) return '';
  if (n < 1900 || n > 2200) return String(ano);
  return String(n).slice(-2) + '-' + String(n + 1).slice(-2);
}

/* Las columnas de cada tutor (primer y segundo): empiezan por el dato y llevan «primer tutor» o «segundo tutor». `cab` va normalizada. */
function columnasTutoresRegAlum_(cab) {
  const busca = function (orden, prefijos, sin) {
    for (let j = 0; j < cab.length; j++) {
      const t = cab[j];
      if (t.indexOf(orden + ' tutor') === -1) continue;
      if (sin && sin.some(function (s) { return t.indexOf(s) !== -1; })) continue;
      if (prefijos.some(function (p) { return t.indexOf(p) === 0; })) return j;
    }
    return -1;
  };
  return ['primer', 'segundo'].map(function (o) {
    return {
      apellido1: busca(o, ['primer apellido']), apellido2: busca(o, ['segundo apellido']), nombre: busca(o, ['nombre']),
      documento: busca(o, ['dni', 'nif', 'documento']), sexo: busca(o, ['sexo']), telefono: busca(o, ['telefono'], ['movil', 'personal', 'urgencia']),
      movil: busca(o, ['telefono movil', 'telefono personal', 'movil']), correo: busca(o, ['correo'])
    };
  });
}

/* RegAlum: una fila por alumno y año de matrícula. Devuelve
   { lector, clave, huella, anos: [2025, 2026], sinId: [{ ano, datos }], filas: [{ id, ano, v: {clave: valor}, t: [tutores] | null, tr: [año, curso, grupo, estado] }] } */
function leerRegAlum_(bytes, fuente, huella, conj, entrada) {
  const texto = bytesATexto_(bytes);
  const tabla = leerCsv_(texto, detectarSeparador_(texto));
  if (!tabla.length) throw new Error('El listado de alumnado está vacío.');
  const cab = tabla[0].map(normalizarTitulo_);
  const donde = function (t) { return cab.indexOf(normalizarTitulo_(t)); };
  const iId = donde('Nº Id. Escolar'), iAno = donde('Año de la matrícula'), iEstado = donde('Estado Matrícula');
  const iAlumno = donde('Alumno/a'), iCurso = donde('Curso'), iUnidad = donde('Unidad');
  if (iId === -1 || iAno === -1) throw new Error('A RegAlum le faltan columnas necesarias.');
  const simples = conj.campos.filter(function (c) { return c.col; }).map(function (c) {
    return { clave: c.clave, tipo: c.tipo, idx: c.col.map(donde).filter(function (j) { return j !== -1; }) };
  });
  const tutores = columnasTutoresRegAlum_(cab);
  const celda = function (fila, j) { const v = j === -1 ? '' : String(fila[j] || '').trim(); return v || null; };
  const salida = { lector: fuente.versionLector, clave: fuente.clave, huella: huella, anos: [], sinId: [], filas: [] };
  const vistos = {};
  for (let f = 1; f < tabla.length; f++) {
    const fila = tabla[f];
    const id = String(fila[iId] || '').trim();
    const ano = parseInt(fila[iAno], 10) || 0;
    if (!id) {
      salida.sinId.push({ ano: ano, datos: { alumno: convertirValorHecho_(fila[iAlumno], 'texto'), curso: convertirValorHecho_(fila[iCurso], 'texto'), unidad: convertirValorHecho_(fila[iUnidad], 'texto') } });
      continue;
    }
    const v = {};
    simples.forEach(function (c) {
      for (let k = 0; k < c.idx.length; k++) {
        if (String(fila[c.idx[k]] || '').trim()) { const x = convertirValorHecho_(fila[c.idx[k]], c.tipo); if (x !== null) v[c.clave] = x; return; }
      }
    });
    const t = [];
    tutores.forEach(function (k, orden) {
      const x = { orden: orden + 1, apellido1: celda(fila, k.apellido1), apellido2: celda(fila, k.apellido2), nombre: celda(fila, k.nombre),
        documento: celda(fila, k.documento), sexo: celda(fila, k.sexo), telefono: celda(fila, k.telefono), movil: celda(fila, k.movil), correo: celda(fila, k.correo) };
      if (x.apellido1 || x.nombre || x.documento) t.push(x);
    });
    if (ano > 0 && !vistos[ano]) { vistos[ano] = true; salida.anos.push(ano); }
    salida.filas.push({ id: id, ano: ano, v: v, t: t.length ? t : null, tr: [anoAcademicoHecho_(fila[iAno]) || null, celda(fila, iCurso), celda(fila, iUnidad), celda(fila, iEstado)] });
  }
  salida.anos.sort(function (a, b) { return a - b; });
  return salida;
}

/* La matrícula de un nivel: una columna por materia y, en cada casilla, MATR, CONV, APRO, PEND… o nada. Se guarda
   { lector, clave, variante, huella, fichero, nivel, titulos: [todos, en su orden], filas: [{ n: nombre, u: grupo, c: [[columna, VALOR]…] }] }
   con solo las casillas no vacías (menos el nombre y el grupo). El nivel sale de la variante («26-27/eso1»). */
function leerMatricula_(bytes, fuente, huella, conj, entrada) {
  const texto = bytesATexto_(bytes);
  const tabla = leerCsv_(texto, detectarSeparador_(texto));
  if (!tabla.length) throw new Error('El listado de matrícula está vacío.');
  const titulos = tabla[0].map(function (t) { return String(t).trim(); });
  const tn = titulos.map(normalizarAlumno_);
  const iNombre = tn.indexOf('alumno/a'), iUnidad = tn.indexOf('unidad');
  if (iNombre === -1) throw new Error('A la matrícula le falta la columna del alumno.');
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, fichero: entrada.fichero || '',
    nivel: String(entrada.variante || '').split('/')[1] || '', titulos: titulos, filas: [] };
  for (let f = 1; f < tabla.length; f++) {
    const fila = tabla[f];
    const nombre = String(fila[iNombre] || '').trim();
    if (!nombre) continue;
    const c = [];
    for (let j = 0; j < titulos.length; j++) {
      if (j === iNombre || j === iUnidad || !titulos[j]) continue;
      const v = String(fila[j] || '').trim().toUpperCase();
      if (v) c.push([j, v]);
    }
    salida.filas.push({ n: nombre, u: iUnidad === -1 ? '' : String(fila[iUnidad] || '').trim(), c: c });
  }
  return salida;
}

/* Cómo se llaman, en _interno/leido/, el listado leído de una fuente: «alumnado», «matricula~26-27~eso1». */
function claveLeido_(clave, variante) { return clave + (variante ? '/' + variante : ''); }
function nombreDeLeido_(k) { return k.replace(/\//g, '~') + '.json'; }

/* Abre UNA fuente (un listado del índice) y guarda lo leído. `t` = { conj, fuente, entrada, k }. */
function leerUnaFuente_(raiz, t, avance) {
  const t0 = new Date().getTime();
  const bytes = ficheroDeEntrada_(t.entrada).getBlob().getBytes();
  const leido = lectorDe_(t.fuente.lector)(bytes, t.fuente, huella_(bytes), t.conj, t.entrada);
  escribirJsonCompacto_(subcarpetaPorRuta_(raiz, '_interno/leido'), nombreDeLeido_(t.k), leido);
  avance.leidos[t.k] = { version: t.fuente.versionLector, huella: leido.huella };
  if (leido.anos) avance.leidos[t.k].anos = leido.anos;
  if (leido.cambios) avance.leidos[t.k].cambios = leido.cambios;
  if (leido.sobran) avance.leidos[t.k].sobran = leido.sobran;
  if (leido.cursosBusqueda) avance.leidos[t.k].cursosBusqueda = leido.cursosBusqueda;
  avance.segundos.lectores[t.k] = Math.round((new Date().getTime() - t0) / 1000);
}

function cargarLeido_(raiz, k) {
  return leerJson_(subcarpetaPorRuta_(raiz, '_interno/leido'), nombreDeLeido_(k));
}

/* Lo leído de un listado que ya no está en el índice se va a la papelera. */
function quitarLeidoViejo_(raiz, indice, avance) {
  const dir = subcarpetaPorRuta_(raiz, '_interno/leido');
  const it = dir.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const k = f.getName().replace(/\.json$/, '').replace(/~/g, '/');
    const trozos = k.split('/');
    const clave = trozos.shift();
    if (!indice.listados.some(function (e) { return e.clave === clave && (e.variante || '') === trozos.join('/'); })) { f.setTrashed(true); delete avance.leidos[k]; delete avance.segundos.lectores[k]; }
  }
}

/* Como escribirJson_ (siempre sobre el mismo fichero), pero sin sangrías: estos ficheros pesan megas. Devuelve el fichero. */
function escribirJsonCompacto_(carpeta, nombre, objeto) {
  const texto = JSON.stringify(objeto);
  const it = carpeta.getFilesByName(nombre);
  if (it.hasNext()) { const f = it.next(); f.setContent(texto); return f; }
  return carpeta.createFile(nombre, texto, 'application/json');
}

/* ==== HechosMontar.gs ==== */
/* El montador: de lo leído a las partes de hecho/<conjunto>/. Una parte se monta entera en memoria y se escribe de una vez, siempre sobre el mismo fichero.
   Si al rehacerla sale lo mismo, el fichero no se toca. */
function montadorDe_(nombre) { return { alumnado: montarAlumnado_ }[nombre]; }
function partesDe_(nombre) { return { alumnado: partesAlumnado_ }[nombre]; }

function rutaDeParte_(conjunto, p) {
  if (p.entera) return 'hecho/' + conjunto + '/' + p.parte + '.json';
  if (p.parte === 'periodo') return 'hecho/' + conjunto + '/' + p.periodo + '/periodo.json';
  if (p.parte === 'historial') return 'hecho/' + conjunto + '/historial.json';
  return 'hecho/' + conjunto + '/' + (p.cursoEscolar ? p.cursoEscolar + (p.parte === 'curso' ? '/curso.json' : '/actuales.json') : 'antiguos.json');
}

/* Qué partes se publican hoy (plan 6.1): la `actuales` del curso de hoy, la del siguiente y la del anterior (en septiembre y octubre, o mientras no haya
   ninguna fila del actual), cada una solo si RegAlum trae alguna fila de ese año; y siempre `antiguos`. */
function partesAlumnado_(resumen) {
  const anos = (resumen && resumen.anos) || [];
  const tiene = function (y) { return anos.indexOf(y) !== -1; };
  const mes = new Date().getMonth(), c = anioInicioActual_();
  const lista = [];
  if (tiene(c - 1) && (mes === 8 || mes === 9 || !tiene(c))) lista.push(c - 1);
  if (tiene(c)) lista.push(c);
  if (tiene(c + 1)) lista.push(c + 1);
  return lista.map(function (y) { return { parte: 'actuales', cursoEscolar: parDeCursos_(y), anio: y }; })
    .concat([{ parte: 'antiguos', cursoEscolar: '', anio: 0 }]);
}

/* Las filas de cada alumno, de la más vieja a la más nueva (a igual año, como vienen en el fichero), una sola vez por tanda. */
function agruparAlumnado_(leido) {
  const filasDe = {}, orden = [];
  leido.filas.forEach(function (f) {
    if (!filasDe[f.id]) { filasDe[f.id] = []; orden.push(f.id); }
    filasDe[f.id].push(f);
  });
  orden.forEach(function (id) { filasDe[id] = filasDe[id].map(function (f, i) { return [f, i]; }).sort(function (a, b) { return (a[0].ano - b[0].ano) || (a[1] - b[1]); }).map(function (x) { return x[0]; }); });
  return { filasDe: filasDe, orden: orden };
}

function ensenanzaDelCursoHecho_(curso) {
  if (!curso) return null;
  if (['1º BACH', '2º BACH'].indexOf(String(curso).trim()) !== -1) return 'Bachillerato';
  const m = String(curso).trim().match(/^([1-4])\s*º?\s*(de\s+)?E\.?\s*S\.?\s*O\.?/i);
  if (m || /^[1-4]\s*º$/.test(String(curso).trim())) return 'ESO';
  return null;
}

/* La ficha de un alumno a partir de sus filas (ya ordenadas), de la que manda y, si los hay, de su fila de matrícula `m` (datosDeMatricula_) y de lo que sale de su
   historia y de sus expedientes `x` = { hist, prim, sec } (HechosHistoria.gs). */
function registroDeAlumnado_(conj, id, filas, fila, matriculado, m, x) {
  const datos = {};
  x = x || {};
  const deHistoria = function (k) {
    return (x.hist && x.hist[k] !== undefined) ? x.hist[k] : ((x.prim && x.prim[k] !== undefined) ? x.prim[k] : ((x.sec && x.sec[k] !== undefined) ? x.sec[k] : ((x.censo && x.censo[k] !== undefined) ? x.censo[k] : undefined)));
  };
  conj.campos.forEach(function (c) {
    let v = null;
    if (c.calculado === 'ensenanza') v = ensenanzaDelCursoHecho_(datos.curso);
    else if (c.calculado === 'tutores') v = fila.t;
    else if (c.calculado === 'trayectoria') v = filas.length ? filas.map(function (f) { return { ano: f.tr[0], curso: f.tr[1], unidad: f.tr[2], estado: f.tr[3] }; }) : null;
    else if (c.calculado === 'materias') v = m && m.materias.length ? m.materias : null;
    else if (c.calculado === 'modalidad') v = m && m.modalidad ? m.modalidad : null;
    else if (c.calculado === 'matriculaNivel') v = m ? m.nivel : null;
    else if (c.calculado === 'matriculaCeldas') v = m && m.celdas.length ? m.celdas : null;
    else if (c.calculado === 'numPendientes') v = x.hist && x.hist.numPendientes !== undefined ? x.hist.numPendientes : (m && m.pend.length ? m.pend.length : null);
    else if (c.calculado === 'pendientes') v = x.hist && x.hist.pendientes !== undefined ? x.hist.pendientes : (m && m.pend.length ? convertirValorHecho_(m.pend.length + ': ' + m.pend.join(', '), 'lista') : null);
    else if (c.historia) v = deHistoria(c.clave);
    else if (c.clave === 'centroProcedencia') v = fila.v.centroProcedencia !== undefined ? fila.v.centroProcedencia : (x.hist && x.hist.centroDe6 ? convertirValorHecho_(x.hist.centroDe6, 'texto') : null);
    else if (m && c.clave === 'curso') v = m.curso;
    else if (m && c.clave === 'unidad' && m.unidad) v = m.unidad;
    else v = fila.v[c.clave] === undefined ? null : fila.v[c.clave];
    if (v !== null && v !== undefined) datos[c.clave] = v;
  });
  return { id: id, matriculado: matriculado, datos: datos };
}

/* La parte `parte` del alumnado. `anios` = los años de las partes `actuales` que se publican hoy. `grupos` = agruparAlumnado_(leido).
   `matriculas` = lo leído de los ficheros de matrícula del curso de la parte (vacío en `antiguos`); `expedientes` = lo leído de los dos tipos de expediente. */
function montarAlumnado_(conj, leido, grupos, parte, anios, matriculas, otros) {
  otros = otros || {};
  const expedientes = { 'expediente-primaria': otros['expediente-primaria'], 'expediente-secundaria': otros['expediente-secundaria'] };
  const sel = [];
  grupos.orden.forEach(function (id) {
    const todas = grupos.filasDe[id];
    if (parte.anio) {
      const hasta = todas.filter(function (f) { return f.ano <= parte.anio; });
      const ultima = hasta[hasta.length - 1];
      if (!ultima || ultima.ano !== parte.anio) return;
      sel.push({ id: id, filas: hasta, fila: ultima, matriculado: ESTADOS_QUE_NO_CUENTAN_.indexOf(normalizarAlumno_(ultima.tr[3])) === -1 });
    } else {
      if (todas.some(function (f) { return anios.indexOf(f.ano) !== -1; })) return;
      sel.push({ id: id, filas: todas, fila: todas[todas.length - 1], matriculado: false });
    }
  });
  const clave = function (s) { return normalizarAlumno_(s.fila.v.alumno); };
  sel.sort(function (a, b) { const x = clave(a), y = clave(b); return x < y ? -1 : (x > y ? 1 : (a.id < b.id ? -1 : 1)); });
  const mat = parte.anio ? (matriculas || []) : [];
  const cruce = mat.length ? cruzarMatricula_(sel.map(function (s) { return { id: s.id, alumno: s.fila.v.alumno || '', unidad: s.fila.v.unidad || '' }; }), mat) : { asign: {}, avisos: [] };
  const mm = {};
  sel.forEach(function (s) { if (cruce.asign[s.id]) mm[s.id] = datosDeMatricula_(cruce.asign[s.id]); });
  /* Los expedientes, solo en una parte que tiene matrícula: se asignan a quien está en ella (o a una fila sin ficha). */
  let asignados = { primaria: {}, secundaria: {}, avisos: [] };
  if (mat.length) {
    const candidatos = sel.filter(function (s) { return mm[s.id]; }).map(function (s) { return { id: s.id, alumno: s.fila.v.alumno || '', curso: mm[s.id].curso }; });
    cruce.avisos.filter(function (a) { return a.tipo === 'matricula-sin-ficha'; }).forEach(function (a) {
      candidatos.push({ id: null, alumno: a.datos.alumno, curso: cursoDeMatricula_(a.datos.nivel, a.datos.unidad), aviso: a });
    });
    asignados = asignarExpedientes_(candidatos, expedientes);
  }
  /* El censo NEAE del curso: se cruza con quien tiene fila de ese año en la ESO y con quien está en la matrícula de Bachillerato. */
  const censo = parte.anio && otros['censo-neae'] ? otros['censo-neae'] : null;
  const hs = {};
  let cruceCenso = null;
  if (censo) {
    const cand = [];
    sel.forEach(function (s) {
      const m = mm[s.id];
      if (m && /^bac/.test(m.nivel)) { cand.push({ id: s.id, alumno: s.fila.v.alumno || '', nivel: m.curso, fecha: '' }); return; }
      hs[s.id] = historialDeAlumno_(s.filas);
      if (hs[s.id]) cand.push({ id: s.id, alumno: s.fila.v.alumno || '', nivel: hs[s.id].niv, fecha: fechaClaveHecho_(s.fila.v.fechaNacimiento) });
    });
    cruce.avisos.filter(function (a) { return a.tipo === 'matricula-sin-ficha' && /^bac/.test(a.datos.nivel); }).forEach(function (a) {
      cand.push({ id: null, alumno: a.datos.alumno, nivel: cursoDeMatricula_(a.datos.nivel, a.datos.unidad), fecha: '', aviso: a });
    });
    cruceCenso = cruzarCenso_(cand, censo.fichas);
    cruceCenso.cand = cand;
    cand.forEach(function (c, i) { if (c.aviso && cruceCenso.asign[i]) c.aviso.datos.censo = clavesDeCenso_(cruceCenso.asign[i]); });
    censo.avisos.forEach(function (d) { cruceCenso.avisos.unshift({ tipo: 'censo-fichero', id: null, datos: { detalle: d } }); });
  }
  const registros = sel.map(function (s) {
    const m = mm[s.id] || null;
    const x = { prim: null, sec: null, hist: null, censo: null };
    if (cruceCenso) {
      const i = cruceCenso.cand.findIndex(function (c) { return c.id === s.id; });
      if (i !== -1) {
        if (cruceCenso.asign[i]) x.censo = clavesDeCenso_(cruceCenso.asign[i]);
        else if (cruceCenso.niveles[cruceCenso.cand[i].nivel] && !cruceCenso.dudosos[i]) x.censo = { censoNeae: false };
      }
    }
    if (parte.anio && m && s.matriculado) {
      if (/^bac/.test(m.nivel)) {
        if (m.celdas.some(function (c) { return c.valor === 'APRO'; })) x.hist = { repiteCurso: true };
      } else {
        const h = hs[s.id] !== undefined ? hs[s.id] : historialDeAlumno_(s.filas);
        if (h) {
          const exp = asignados.primaria[s.id] || null, expSec = asignados.secundaria[s.id] || null;
          x.hist = historiaDeAlumno_(h, m.curso, m.pend, exp, expSec);
          if (exp) x.prim = clavesDePrimaria_(exp, h.anoNac);
          if (expSec) x.sec = clavesDeSecundaria_(expSec);
        }
      }
    }
    /* Sin fila en la matrícula del curso no hay historia: BD Alumnado la saca de su pestaña ALUMNADO, que sale de la matrícula (ParaElGestorDatos.gs, valorCrudo_), así que y solo para quien sigue matriculado: a quien no está en ella o tiene la matrícula anulada o trasladada no se la pone. */
    return registroDeAlumnado_(conj, s.id, s.filas, s.fila, s.matriculado, m, x);
  });
  const avisos = leido.sinId.filter(function (s) { return parte.anio ? s.ano === parte.anio : anios.indexOf(s.ano) === -1; })
    .map(function (s) { return { tipo: 'sin-id', id: null, datos: s.datos }; }).concat(cruce.avisos, asignados.avisos, cruceCenso ? cruceCenso.avisos : []);
  const o = { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: parte.parte, cursoEscolar: parte.cursoEscolar, generado: ahoraMadrid_(), origen: DUENO_CD_ };
  if (parte.anio) o.columnasMatricula = columnasDeMatricula_(mat);
  o.campos = camposPublicos_(conj, !parte.anio); o.registros = registros; o.avisos = avisos;
  return o;
}

/* Lo que hace que dos montajes sean «lo mismo»: todo menos `generado`. */
function contenidoDeParte_(o) { return JSON.stringify({ columnas: o.columnasMatricula, columnasPersonal: o.columnasPersonal, columnasLibros: o.columnasLibros, columnasConsejo: o.columnasConsejo, periodo: o.periodo, periodos: o.periodos, ultimoPeriodo: o.ultimoPeriodo, hoy: o.hoy, listadoDel: o.listadoDel, personalMirado: o.personalMirado, alumnadoMirado: o.alumnadoMirado, funcionesSinGrupo: o.funcionesSinGrupo, entregadoPor: o.entregadoPor, entregado: o.entregado, cargos: o.cargos, ocupadosHoy: o.ocupadosHoy, campos: o.campos, registros: o.registros, avisos: o.avisos }); }

/* Escribe la parte (siempre sobre el mismo fichero de Drive) y devuelve la entrada de `hechos`. Si sale lo mismo que había, solo cambian sus fuentes. */
function escribirParte_(raiz, conj, parte, objeto, previa, fuentes) {
  const ruta = rutaDeParte_(conj.conjunto, parte);
  if (previa) {
    let antes = null;
    try { antes = JSON.parse(ficheroDeEntrada_(previa).getBlob().getDataAsString('UTF-8')); } catch (e) { antes = null; }
    if (antes && contenidoDeParte_(antes) === contenidoDeParte_(objeto)) { previa.fuentes = fuentes; return previa; }
  }
  const texto = JSON.stringify(objeto);
  const bytes = Utilities.newBlob(texto, 'application/json').getBytes();
  const trozos = ruta.split('/');
  const nombre = trozos.pop();
  const carpeta = subcarpetaPorRuta_(raiz, trozos.join('/'));
  let fichero = null;
  if (previa) { try { fichero = ficheroDeEntrada_(previa); } catch (e) { fichero = null; } }
  if (!fichero) { const it = carpeta.getFilesByName(nombre); fichero = it.hasNext() ? it.next() : null; }
  if (fichero) fichero.setContent(texto); else fichero = carpeta.createFile(nombre, texto, 'application/json');
  const entrada = { conjunto: conj.conjunto, parte: parte.parte, cursoEscolar: parte.cursoEscolar, acuerdoHecho: conj.acuerdoHecho, ruta: ruta, idDrive: fichero.getId(),
    hecho: ahoraMadrid_(), huella: huella_(bytes), registros: objeto.registros.length, bytes: bytes.length, alDia: true, fuentes: fuentes };
  if (parte.periodo) entrada.periodo = parte.periodo;
  return entrada;
}

/* ==== HechosEntregas.gs ==== */
/* Lo que entregan las aplicaciones (plan 6.4) y qué se acepta de ello. Se mira al MONTAR la ficha completa, no al guardar: lo ajeno se ignora y se cuenta; nunca tumba la entrega. */
const TIPOS_DE_CAMPO_ = ['texto', 'numero', 'fecha', 'si-no', 'lista', 'tabla'];

/* ¿Este valor es del tipo de su campo? (Lo que no es de su tipo no se escribe.) */
function valorDelTipo_(v, campo) {
  switch (campo.tipo) {
    case 'texto': return typeof v === 'string';
    case 'numero': return typeof v === 'number' && isFinite(v);
    case 'fecha': return typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v);
    case 'si-no': return typeof v === 'boolean';
    case 'lista': return Array.isArray(v) && v.every(function (x) { return typeof x === 'string' || typeof x === 'number'; });
    case 'tabla': return Array.isArray(v) && v.every(function (x) { return x && typeof x === 'object' && !Array.isArray(x); });
  }
  return false;
}

function campoBienDescrito_(c) {
  return !!c && typeof c === 'object' && ['clave', 'etiqueta', 'apartado'].every(function (k) { return typeof c[k] === 'string' && c[k]; }) && TIPOS_DE_CAMPO_.indexOf(c.tipo) !== -1;
}

/* Las entregas vigentes de un conjunto: [{ aplicacion, entrada }] por orden de aplicación. */
function entregasDeConjunto_(indice, conj) {
  return indice.listados.filter(function (e) { return e.clave === 'entrega' && e.ambito === conj.conjunto && conj.entregas.indexOf(e.periodo) !== -1; })
    .map(function (e) { return { aplicacion: e.periodo, entrada: e }; }).sort(function (a, b) { return a.aplicacion < b.aplicacion ? -1 : 1; });
}

/* Los campos de una entrega que se aceptan: bien descritos, del dueño de la entrega, que no estén ya publicados y sin repetir (vale el primero). Suma a `cuentas`. */
function camposDeEntrega_(entrega, publicadas, cuentas) {
  const campos = [], vistos = {};
  (Array.isArray(entrega.campos) ? entrega.campos : []).forEach(function (c) {
    if (!campoBienDescrito_(c) || c.dueno !== entrega.origen || publicadas[c.clave] || vistos[c.clave]) { cuentas.camposIgnorados++; return; }
    const limpio = { clave: c.clave, etiqueta: c.etiqueta, apartado: c.apartado, tipo: c.tipo };
    if (c.tipo === 'tabla' && Array.isArray(c.columnas)) limpio.columnas = c.columnas;
    limpio.dueno = entrega.origen;
    campos.push(limpio); vistos[c.clave] = true; cuentas.camposAceptados++;
  });
  return campos;
}

/* Lo que se acepta de una entrega.
   `publicadas` = las claves que ya publica el Centro de datos o entrega otra aplicación; `ids` = los id de las partes del conjunto; `huellasDeAhora` = las de sus partes.
   Devuelve { campos: [campo aceptado], valores: { id: { clave: valor } }, cuentas }. */
function aceptarEntrega_(entrega, publicadas, ids, huellasDeAhora) {
  const cuentas = { camposAceptados: 0, camposIgnorados: 0, registrosUsados: 0, registrosSinFicha: 0, valoresIgnorados: 0, hechoConViejo: false };
  const campos = camposDeEntrega_(entrega, publicadas, cuentas), porClave = {};
  campos.forEach(function (c) { porClave[c.clave] = c; });
  const valores = {};
  (Array.isArray(entrega.registros) ? entrega.registros : []).forEach(function (r) {
    const id = r && typeof r.id === 'string' ? r.id.trim() : '';
    if (!id || !ids[id]) { cuentas.registrosSinFicha++; return; }
    cuentas.registrosUsados++;
    const datos = r.datos && typeof r.datos === 'object' ? r.datos : {};
    Object.keys(datos).forEach(function (k) {
      const campo = porClave[k];
      if (!campo || datos[k] === null || datos[k] === undefined) return;
      if (!valorDelTipo_(datos[k], campo)) { cuentas.valoresIgnorados++; return; }
      (valores[id] = valores[id] || {})[k] = datos[k];
    });
  });
  const hechoCon = Array.isArray(entrega.hechoCon) ? entrega.hechoCon : [];
  cuentas.hechoConViejo = !hechoCon.some(function (h) { return huellasDeAhora.indexOf(h) !== -1; });
  return { campos: campos, valores: valores, cuentas: cuentas };
}

/* ==== HechosFicha.gs ==== */
/* La ficha completa de un conjunto (plan 6.5): la unión, por id, de todas sus partes y de todas sus entregas. Para el alumnado es ALUMNADO-BD.json (clave `alumnado-bd`, acuerdo 2),
   que hasta el relevo genera BD Alumnado y desde la primera entrega genera el Centro de datos. Siempre sobre el mismo fichero de Drive; no deja nada en anteriores/. */

/* El orden de los datos de ALUMNADO-BD.json (CAMPOS_GESTOR de BD Alumnado, referencia/bd-alumnado/ParaElGestor.gs). */
const ORDEN_FICHA_ = ('apellido1 apellido2 nombre alumno sexo fechaNacimiento documento localidadNacimiento nacionalidad curso unidad tutorUnidad ensenanza estadoMatricula edad materias modalidad ' +
  'opt frAlct mat opc1 opc2 opc3 opc4 religion materiasModalidad optativas comprobacionMatricula numAsignaturas deberiaTener centroProcedencia centrosSecundaria trayectoria trayectoriaTexto ' +
  'cursoAnterior repetiaAnterior repetiaAnteriorCorregido suspensosAnterior repiteCurso repeticionesEso cursosRepetidosEso fuenteEso repeticionesPrimaria cursosRepetidosPrimaria fuentePrimaria ' +
  'repSinLocalizar repeticionesPrimariaCorregido motivoCorreccion repeticiones pilAMano pil noPodraRepetir agotaPermanencias materiasNoSuperadas numPendientes pendientes primariaAnoPrimero ' +
  'primariaAnoSexto primariaPendientes primariaArrastradas primariaRepeticiones secundariaAnos diversificacion neae medidasRecursos jefGrupoOrigen jefRepite jefPil jefConflictivo jefNeae ' +
  'jefDiversificacion telefono telefonoPersonal telefonoUrgencia correo domicilio codigoPostal localidad provincia tutores observaciones').split(' ');
const APARTADOS_FICHA_ = ['Identidad', 'Matrícula', 'Materias', 'Procedencia', 'Historia', 'Apoyos', 'Reparto definitivo', 'Contacto', 'Observaciones'];

/* Las claves que sale de RegAlum: lo único que lleva quien no está matriculado este curso. */
function planFicha_(indice, conj) {
  const hechos = (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto; });
  const actuales = hechos.filter(function (h) { return h.parte === 'actuales'; });
  const base = actuales.filter(function (h) { return h.cursoEscolar === cursoActual_(); })[0] || actuales.filter(function (h) { return h.cursoEscolar === parDeCursos_(anioInicioActual_() - 1); })[0];
  if (!base) return null;
  const otras = hechos.filter(function (h) { return h !== base; }).sort(function (a, b) { return ordenDeCurso_(b.cursoEscolar) - ordenDeCurso_(a.cursoEscolar); });
  return { base: base, partes: [base].concat(otras) };
}

/* El orden final de los campos: el de la lista, y lo que no esté en ella detrás del último de su apartado (primero lo del Centro de datos, luego lo entregado); un apartado nuevo, al final. */
function ordenarCampos_(campos) {
  const porClave = {};
  campos.forEach(function (c) { porClave[c.clave] = c; });
  const salida = [];
  ORDEN_FICHA_.forEach(function (k) { if (porClave[k]) salida.push(porClave[k]); });
  const resto = campos.filter(function (c) { return ORDEN_FICHA_.indexOf(c.clave) === -1; });
  resto.sort(function (a, b) { return (a.dueno === DUENO_CD_ ? 0 : 1) - (b.dueno === DUENO_CD_ ? 0 : 1); });
  resto.forEach(function (c) {
    let ultimo = -1;
    salida.forEach(function (x, i) { if (x.apartado === c.apartado) ultimo = i; });
    if (ultimo === -1) salida.push(c); else salida.splice(ultimo + 1, 0, c);
  });
  return salida;
}

/* Monta la ficha completa y la escribe si ha cambiado. `t` = { conj, plan, huellas, entregas }. */
function montarFichaCompleta_(raiz, t, avance, cache) {
  const t0 = new Date().getTime();
  const conj = t.conj, fc = conj.fichaCompleta, indice = leerIndice_(raiz);
  const objetos = t.plan.partes.map(function (h) { return JSON.parse(bytesATexto_(ficheroDeEntrada_(h).getBlob().getBytes())); });
  const leido = cargarLeido_(raiz, conj.fuentes[0].clave);
  if (!leido) { avance.completa = { huellas: t.huellas, version: fc.version, cuando: ahoraMadrid_(), alumnos: 0, campos: 0, segundos: 0 }; return; }
  if (!cache['grupos:' + conj.conjunto]) cache['grupos:' + conj.conjunto] = agruparAlumnado_(leido);
  const grupos = cache['grupos:' + conj.conjunto];
  /* Quién entra: la parte del curso de la ficha y después las demás, sin repetir id. Quien no es de esa parte con matrícula lleva solo lo de RegAlum. */
  const registros = {}, orden = [], campos = [], vistos = {};
  const soloRegAlum = function (id, parte) {
    const todas = grupos.filasDe[id];
    if (!todas) return null;
    const anio = parte.cursoEscolar ? anioDeCurso_(parte.cursoEscolar) : 0;
    const filas = anio ? todas.filter(function (f) { return f.ano <= anio; }) : todas;
    return filas.length ? registroDeAlumnado_(conj, id, filas, filas[filas.length - 1], false, null, null) : null;
  };
  objetos.forEach(function (o, i) {
    const h = t.plan.partes[i];
    o.campos.forEach(function (c) { if (!vistos[c.clave]) { vistos[c.clave] = true; campos.push({ clave: c.clave, etiqueta: c.etiqueta, apartado: c.apartado, tipo: c.tipo, columnas: c.columnas, dueno: c.dueno }); } });
    o.registros.forEach(function (r) {
      if (registros[r.id]) return;
      const completo = i === 0 && r.matriculado;
      registros[r.id] = completo ? { id: r.id, matriculado: true, datos: Object.assign({}, r.datos) } : (soloRegAlum(r.id, h) || { id: r.id, matriculado: false, datos: Object.assign({}, r.datos) });
      registros[r.id].completo = completo;
      orden.push(r.id);
    });
  });
  campos.forEach(function (c) { if (!c.columnas) delete c.columnas; });
  /* Las entregas. */
  const publicadas = {};
  campos.forEach(function (c) { publicadas[c.clave] = true; });
  const huellasDeAhora = t.plan.partes.map(function (h) { return h.huella; });
  const cuentasPorApp = {};
  t.entregas.forEach(function (e) {
    let entrega = null;
    try { entrega = JSON.parse(bytesATexto_(ficheroDeEntrada_(e.entrada).getBlob().getBytes())); } catch (x) { entrega = null; }
    if (!entrega) return;
    const ac = aceptarEntrega_(entrega, publicadas, registros, huellasDeAhora);
    ac.campos.forEach(function (c) { publicadas[c.clave] = true; campos.push(c); });
    Object.keys(ac.valores).forEach(function (id) { if (registros[id].completo) Object.assign(registros[id].datos, ac.valores[id]); });
    ac.cuentas.cuando = e.entrada.subido;
    cuentasPorApp[e.aplicacion] = ac.cuentas;
  });
  const claveAlumno = function (r) { return normalizarAlumno_(r.datos.alumno); };
  const alumnos = orden.map(function (id) { return { idEscolar: id, matriculado: registros[id].matriculado, datos: registros[id].datos }; });
  alumnos.sort(function (a, b) { const x = claveAlumno(a), y = claveAlumno(b); return x < y ? -1 : (x > y ? 1 : (a.idEscolar < b.idEscolar ? -1 : 1)); });
  const anio = anioDeCurso_(t.plan.base.cursoEscolar);
  const objeto = { acuerdo: fc.acuerdo, generado: ahoraMadrid_(), origen: DUENO_CD_, cursoAcademico: anio + '-' + (anio + 1), campos: ordenarCampos_(campos), alumnos: alumnos };
  escribirFichaCompleta_(raiz, conj, objeto, indice);
  avance.completa = { huellas: t.huellas, version: fc.version, cuando: ahoraMadrid_(), cursoEscolar: t.plan.base.cursoEscolar, alumnos: alumnos.length, campos: objeto.campos.length,
    segundos: Math.round((new Date().getTime() - t0) / 1000) };
  avance.entregas = avance.entregas || {};
  avance.entregas[conj.conjunto] = cuentasPorApp;
  avance.relevo = true;
}

function contenidoDeFicha_(o) { return JSON.stringify({ acuerdo: o.acuerdo, origen: o.origen, cursoAcademico: o.cursoAcademico, campos: o.campos, alumnos: o.alumnos }); }

/* Primero el fichero, el índice al final. Hasta el relevo, el último de BD Alumnado baja a anteriores/ una última vez. */
function escribirFichaCompleta_(raiz, conj, objeto, indice) {
  const fc = conj.fichaCompleta;
  const previa = buscarEnIndice_(indice, fc.clave, '');
  const mia = !!previa && previa.subidoPor === DUENO_CD_;
  if (mia) {
    try {
      const antes = JSON.parse(bytesATexto_(ficheroDeEntrada_(previa).getBlob().getBytes()));
      if (contenidoDeFicha_(antes) === contenidoDeFicha_(objeto)) return;
    } catch (e) { /* hay que rehacerla */ }
  }
  const texto = JSON.stringify(objeto);
  const bytes = Utilities.newBlob(texto, 'application/json').getBytes();
  let fichero = null, anteriores = previa ? previa.anteriores || 0 : 0;
  if (mia) { try { fichero = ficheroDeEntrada_(previa); fichero.setContent(texto); } catch (e) { fichero = null; } }
  if (!fichero) {
    if (previa && !mia) {
      try {
        const viejo = ficheroDeEntrada_(previa);
        viejo.moveTo(subcarpetaPorRuta_(raiz, 'anteriores/' + fc.clave));
        viejo.setName(prefijoFecha_(previa.subido) + ' ' + viejo.getName());
        anteriores++;
      } catch (e) { /* ya no estaba en Drive */ }
    }
    fichero = subcarpetaPorRuta_(raiz, 'listados/' + fc.clave).createFile(fc.fichero, texto, 'application/json');
  }
  const c = entradaCatalogo_(fc.clave);
  const entrada = { clave: fc.clave, variante: '', titulo: c.titulo, fichero: fc.fichero, ruta: 'listados/' + fc.clave + '/' + fc.fichero, idDrive: fichero.getId(), tipo: 'json',
    cursoEscolar: '', ambito: '', periodo: '', alumno: '', subido: objeto.generado, subidoPor: DUENO_CD_, via: 'hecho', bytes: bytes.length, filas: objeto.alumnos.length,
    resumen: numeroLegible_(objeto.alumnos.length) + (objeto.alumnos.length === 1 ? ' alumno' : ' alumnos'), huella: huella_(bytes), caducaDias: c.dias, anteriores: anteriores };
  cambiarIndiceHechos_(raiz, function (ind) {
    const i = ind.listados.map(function (e) { return e.clave === fc.clave && !e.variante; }).indexOf(true);
    if (i === -1) ind.listados.push(entrada); else ind.listados[i] = entrada;
  });
}

/* La tarea de la ficha completa de un conjunto, o null si no toca: hay entregas, hay una parte del curso de la ficha y lo hecho no es lo de ahora. */
function tareaDeFichaCompleta_(indice, avance, conj) {
  if (!conj.fichaCompleta) return null;
  const entregas = entregasDeConjunto_(indice, conj);
  if (!entregas.length) return null;
  const plan = planFicha_(indice, conj);
  if (!plan) return null;
  const huellas = plan.partes.map(function (h) { return h.ruta + ':' + h.huella; }).concat(entregas.map(function (e) { return e.aplicacion + ':' + e.entrada.huella; })).join('|');
  const previa = buscarEnIndice_(indice, conj.fichaCompleta.clave, '');
  const hecha = avance.completa && avance.completa.huellas === huellas && avance.completa.version === conj.fichaCompleta.version && previa && previa.subidoPor === DUENO_CD_;
  return hecha ? null : { que: 'completa', conj: conj, plan: plan, huellas: huellas, entregas: entregas };
}

/* ==== HechosCruce.gs ==== */
/* La matrícula por nivel en la ficha del alumno. El listado de matrícula no trae el Nº de identificación escolar: se cruza por nombre y grupo con la regla de
   BD Alumnado (`buscarPorAlumno_`): el nombre y el grupo pasados por `normalizar`; si no, solo por el nombre, y solo si ese nombre sale UNA vez en todos los ficheros.
   Diferencias a propósito: un nombre repetido en el mismo grupo no se asigna a nadie, y una fila no acaba en dos fichas. */

/* «eso1» → «1º»; «bac1c» → «1º BACH» (o lo que diga el grupo). */
function cursoDeMatricula_(nivel, unidad) {
  if (/^eso/.test(nivel)) return nivel.charAt(3) + 'º';
  const m = String(unidad || '').trim().match(/^([12])\s*º\s*BACH/i);
  return m ? m[1] + 'º BACH' : nivel.charAt(3) + 'º BACH';
}

function esPendienteDeTitulo_(t) {
  return /\(([1-4])º de E\.S\.O\.\)\s*$/.test(t) || t.indexOf('(1º de Bachillerato') > 0 || t.indexOf('(2º de Bachillerato') > 0;
}

/* Lo que una fila de matrícula le da a la ficha: curso, grupo, materias, modalidad, pendientes y todas sus casillas. `o` = { l: lo leído del fichero, f: la fila }. */
function datosDeMatricula_(o) {
  const l = o.l, f = o.f, bac = /^bac/.test(l.nivel);
  const celdas = f.c.map(function (x) { return { columna: l.titulos[x[0]], valor: x[1] }; });
  const pend = [];
  celdas.forEach(function (c) {
    if (c.valor !== 'PEND') return;
    if (bac) { if (esPendienteDeTitulo_(c.columna)) pend.push(siglaBac_(pendienteDeBachillerato_(c.columna) || c.columna) + ' 1º'); return; }
    const m = c.columna.match(/^(.*?)\s*\(([1-4])º de E\.S\.O\.\)$/);
    if (m) pend.push(siglaEso_(m[1].trim()) + ' ' + m[2] + 'º');
  });
  return {
    nivel: l.nivel, curso: cursoDeMatricula_(l.nivel, f.u), unidad: f.u, celdas: celdas, pend: pend,
    materias: celdas.filter(function (c) { return c.valor === 'MATR' || c.valor === 'CONV' || c.valor === 'APRO'; }).map(function (c) { return { materia: c.columna, situacion: c.valor }; }),
    modalidad: bac ? (/c$/.test(l.nivel) ? MODALIDAD_CIENCIAS_ : MODALIDAD_HUMANIDADES_) : ''
  };
}

/* candidatos = [{ id, alumno, unidad }] en el orden en que se asignan; leidos = los ficheros de matrícula del curso.
   Devuelve { asign: { id: { l, f } }, avisos } con los avisos de la lista única de NUCLEO-CLAVES-EN-BRUTO.md. */
function cruzarMatricula_(candidatos, leidos) {
  const filas = [], porClave = {}, porNombre = {};
  leidos.forEach(function (l) {
    l.filas.forEach(function (f) {
      const o = { l: l, f: f, usada: false, repetida: false };
      const n = normalizarAlumno_(f.n), k = n + '|' + normalizarAlumno_(f.u);
      filas.push(o);
      (porClave[k] = porClave[k] || []).push(o);
      (porNombre[n] = porNombre[n] || []).push(o);
    });
  });
  Object.keys(porClave).forEach(function (k) { if (porClave[k].length > 1) porClave[k].forEach(function (o) { o.repetida = true; }); });
  const asign = {};
  candidatos.forEach(function (c) {
    const n = normalizarAlumno_(c.alumno);
    const exacto = porClave[n + '|' + normalizarAlumno_(c.unidad)];
    let o = null;
    if (exacto) { if (exacto.length === 1) o = exacto[0]; }
    else if (porNombre[n] && porNombre[n].length === 1) o = porNombre[n][0];
    if (o && !o.usada) { o.usada = true; asign[c.id] = o; }
  });
  const avisos = [];
  leidos.forEach(function (l) {
    const porNombreDelFichero = /^bac/.test(l.nivel) ? (/c$/.test(l.nivel) ? MODALIDAD_CIENCIAS_ : MODALIDAD_HUMANIDADES_) : '';
    const porMaterias = modalidadPorLasMaterias_(l.titulos);
    if (porNombreDelFichero && porMaterias && porNombreDelFichero !== porMaterias) {
      avisos.push({ tipo: 'matricula-modalidad', id: null, datos: { nivel: l.nivel, fichero: l.fichero, porNombre: porNombreDelFichero, porMaterias: porMaterias } });
    }
  });
  filas.forEach(function (o) {
    if (o.usada) return;
    const d = datosDeMatricula_(o);
    avisos.push({ tipo: o.repetida ? 'matricula-repetida' : 'matricula-sin-ficha', id: null, datos: { nivel: d.nivel, alumno: o.f.n, unidad: o.f.u, celdas: d.celdas } });
  });
  return { asign: asign, avisos: avisos };
}

/* Los títulos de cada listado de matrícula, por nivel, tal cual y en su orden. */
function columnasDeMatricula_(leidos) {
  const o = {};
  leidos.forEach(function (l) { o[l.nivel] = l.titulos; });
  return o;
}

/* A quién se asigna cada expediente (los dos tipos, uno por alumno, con el nombre solo en el nombre del fichero). Se compara el nombre, pasado por `normalizar`, con el
   de los alumnos que están en la matrícula por nivel y con el de las filas de matrícula sin ficha (avisos `matricula-sin-ficha`).
   candidatos = [{ id, alumno, curso, aviso }]  (`aviso` solo en los de matrícula sin ficha); expedientes = { 'expediente-primaria': lo leído, … }.
   Devuelve { primaria: { id: r }, secundaria: { id: r }, avisos }. A un aviso sin ficha le cuelga su expediente en datos.primaria / datos.secundaria. */
function asignarExpedientes_(candidatos, expedientes) {
  const salida = { primaria: {}, secundaria: {}, avisos: [] };
  const porNombre = {};
  candidatos.forEach(function (c) { (porNombre[normalizarAlumno_(c.alumno)] = porNombre[normalizarAlumno_(c.alumno)] || []).push(c); });
  const sinSigla = {};
  [['primaria', 'expediente-primaria'], ['secundaria', 'expediente-secundaria']].forEach(function (par) {
    const leido = expedientes[par[1]], etapa = par[0];
    if (!leido) return;
    Object.keys(leido.ficheros).sort(function (a, b) {
      const x = normalizarAlumno_((leido.ficheros[a].r || leido.ficheros[a]).nombre), y = normalizarAlumno_((leido.ficheros[b].r || leido.ficheros[b]).nombre);
      return x < y ? -1 : (x > y ? 1 : (a < b ? -1 : 1));
    }).forEach(function (k) {
      const f = leido.ficheros[k];
      if (f.ilegible) { salida.avisos.push({ tipo: 'expediente-ilegible', id: null, datos: { etapa: etapa, fichero: f.fichero, detalle: f.detalle } }); return; }
      const r = f.r;
      r.avisos.forEach(function (d) { salida.avisos.push({ tipo: 'expediente-aviso', id: null, datos: { etapa: etapa, alumno: r.nombre, detalle: d } }); });
      (r.sinSigla || []).forEach(function (d) {
        if (sinSigla[d]) return;
        sinSigla[d] = true;
        salida.avisos.push({ tipo: 'expediente-aviso', id: null, datos: { etapa: etapa, alumno: '', detalle: d } });
      });
      const lista = porNombre[normalizarAlumno_(r.nombre)] || [];
      if (lista.length === 1) {
        if (lista[0].aviso) lista[0].aviso.datos[etapa] = etapa === 'primaria' ? clavesDePrimaria_(r) : clavesDeSecundaria_(r);
        else salida[etapa][lista[0].id] = r;
      } else if (lista.length > 1) {
        salida.avisos.push({ tipo: 'expediente-ambiguo', id: null, datos: { etapa: etapa, alumno: r.nombre, cursos: lista.map(function (c) { return c.curso; }) } });
      } else {
        salida.avisos.push({ tipo: 'expediente-sin-alumno', id: null, datos: { etapa: etapa, alumno: r.nombre, fichero: r.fichero } });
      }
    });
  });
  return salida;
}

/* ==== HechosExpedientes.gs ==== */
/* Los lectores de los expedientes de Primaria y de Secundaria (reglas de referencia/bd-alumnado/Primaria.gs y Secundaria.gs). El nombre del alumno no está dentro del fichero:
   lo da la entrada de indice-alumnos.json (`alumnoNombre`, sacado del nombre del fichero). Cada expediente se lee de uno en uno y lo leído se guarda por su huella. */
function lectorDeExpediente_(nombre) { return { expedientePrimaria: leerExpedientePrimaria_, expedienteSecundaria: leerExpedienteSecundaria_ }[nombre]; }

/* Una nota es negativa si es un número menor que 5. Vacía no es un suspenso. */
function notaNegativa_(v) { return esNumeroHecho_(v) && aNumeroHecho_(v) < 5; }

/* «6º de Educ. Prima. - Periodo 1» → «6º» */
function cursoPrimaria_(texto) {
  const m = String(texto || '').trim().match(/^([1-6])\s*º?\s*de\s+Educ/i);
  return m ? m[1] + 'º' : '';
}

/* «Matemáticas (5º de Educ. Prima.)» → { materia, de: '5º' } */
function partirMateriaPrimaria_(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.*?)\s*\(([1-6])\s*º?\s*de\s+Educ\.?\s*Prima\.?\)$/i);
  return m ? { materia: m[1].trim(), de: m[2] + 'º' } : { materia: t, de: '' };
}

/* «Inglés (1º de E.S.O.)» → { materia: 'Inglés', de: '1º' } */
function partirMateriaSec_(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.*?)\s*\(([1-4])\s*º?\s*de\s+E\.?\s*S\.?\s*O\.?\)$/i);
  return m ? { materia: m[1].trim(), de: m[2] + 'º' } : { materia: t, de: '' };
}

function tablaDeExpediente_(bytes) {
  const texto = bytesATexto_(bytes);
  return leerCsv_(texto, detectarSeparador_(texto));
}

function columnasDeExpediente_(tabla) {
  const cab = tabla[0].map(normalizarAlumno_);
  const d = function (t) { return cab.indexOf(normalizarAlumno_(t)); };
  return { curso: d('Curso'), ano: d('Año académico'), estado: d('Estado de matrícula'), centro: d('Centro'), materia: d('Materias'), nota: d('Calificaciones') };
}

const ESTADO_NO_CUENTA_ = function (estado) { return ESTADOS_QUE_NO_CUENTAN_.indexOf(estado) !== -1; };

function leerExpedientePrimaria_(bytes, alumno, fichero) {
  const salida = { nombre: alumno, fichero: fichero, anoPrimero: '', anoSexto: '', centro: '', pendientes: [], arrastradas: [], repeticiones: '', cursosRepetidos: [], completo: false, avisos: [], sinSigla: [] };
  if (!alumno) { salida.avisos.push('El fichero "' + fichero + '" no lleva el nombre del alumno.'); return salida; }
  const tabla = tablaDeExpediente_(bytes);
  if (tabla.length < 2) { salida.avisos.push('El fichero "' + fichero + '" está vacío.'); return salida; }
  const c = columnasDeExpediente_(tabla);
  if (c.curso === -1 || c.materia === -1 || c.nota === -1) { salida.avisos.push('Al fichero "' + fichero + '" le faltan columnas. No lo he usado.'); return salida; }
  const anosPorCurso = {};
  let anoSexto = 0, anoPrimero = 0;
  for (let f = 1; f < tabla.length; f++) {
    const fila = tabla[f];
    const curso = cursoPrimaria_(fila[c.curso]);
    if (!curso) continue;
    if (ESTADO_NO_CUENTA_(c.estado === -1 ? '' : normalizarAlumno_(fila[c.estado]))) continue;
    const ano = c.ano === -1 ? 0 : parseInt(fila[c.ano], 10);
    if (!ano) continue;
    (anosPorCurso[curso] = anosPorCurso[curso] || {})[ano] = true;
    if (curso === '6º' && ano > anoSexto) anoSexto = ano;
    if (curso === '1º' && (!anoPrimero || ano < anoPrimero)) anoPrimero = ano;
  }
  const faltan = [], repetidos = [];
  let repeticiones = 0;
  for (let n = 1; n <= 6; n++) {
    const anos = anosPorCurso[n + 'º'];
    if (!anos) { faltan.push(n + 'º'); continue; }
    const veces = Object.keys(anos).length;
    if (veces > 1) { repeticiones += veces - 1; repetidos.push(n + 'º'); }
  }
  salida.anoPrimero = anoPrimero || '';
  salida.completo = faltan.length === 0;
  salida.cursosRepetidos = repetidos;
  if (salida.completo) salida.repeticiones = repeticiones;
  else salida.avisos.push('El expediente de ' + alumno + ' no trae ' + (faltan.length === 1 ? 'el curso ' : 'los cursos ') + faltan.join(', ') +
    ' de Primaria. No he tocado sus repeticiones: se queda la estimación por edad.' + (repetidos.length ? ' (En lo que sí trae repitió ' + repetidos.join(', ') + '.)' : ''));
  if (!anoSexto) { salida.avisos.push('El expediente de ' + alumno + ' no trae 6º de Primaria. No he escrito sus pendientes.'); return salida; }
  salida.anoSexto = anoSexto;
  const mejores = {};
  for (let f = 1; f < tabla.length; f++) {
    const fila = tabla[f];
    if (cursoPrimaria_(fila[c.curso]) !== '6º') continue;
    if (ESTADO_NO_CUENTA_(c.estado === -1 ? '' : normalizarAlumno_(fila[c.estado]))) continue;
    if (c.ano !== -1 && parseInt(fila[c.ano], 10) !== anoSexto) continue;
    if (c.centro !== -1 && !salida.centro) salida.centro = String(fila[c.centro] || '').replace(/\s+/g, ' ').trim();
    const p = partirMateriaPrimaria_(fila[c.materia]);
    if (!p.materia) continue;
    const clave = normalizarAlumno_(p.materia) + '|' + p.de;
    const nota = fila[c.nota], antes = mejores[clave];
    if (!antes || (esNumeroHecho_(nota) && (!esNumeroHecho_(antes.nota) || aNumeroHecho_(nota) > aNumeroHecho_(antes.nota)))) mejores[clave] = { materia: p.materia, de: p.de, nota: nota };
  }
  const propias = [], arrastradas = [];
  Object.keys(mejores).forEach(function (k) {
    const m = mejores[k];
    if (!notaNegativa_(m.nota)) return;
    const corto = siglaPrimaria_(m.materia, salida.sinSigla);
    if (m.de) arrastradas.push(corto + ' ' + m.de); else propias.push(corto);
  });
  salida.pendientes = propias.sort();
  salida.arrastradas = arrastradas.sort();
  return salida;
}

function leerExpedienteSecundaria_(bytes, alumno, fichero) {
  const salida = { nombre: alumno, fichero: fichero, anos: [], centros: [], repeticiones: '', cursosRepetidos: [], cursoPasado: '', repetiaPasado: '', suspensosPasado: '',
    porAno: {}, notasPorAno: {}, avisos: [], sinSigla: [] };
  if (!alumno) { salida.avisos.push('El fichero "' + fichero + '" no lleva el nombre del alumno.'); return salida; }
  const tabla = tablaDeExpediente_(bytes);
  if (tabla.length < 2) { salida.avisos.push('El fichero "' + fichero + '" está vacío.'); return salida; }
  const c = columnasDeExpediente_(tabla);
  if (c.curso === -1 || c.ano === -1) { salida.avisos.push('Al fichero "' + fichero + '" le faltan columnas. No lo he usado.'); return salida; }
  const anosPorCurso = {}, cursoDelAno = {}, centros = {}, detalle = {};
  let ultimo = 0;
  for (let f = 1; f < tabla.length; f++) {
    const fila = tabla[f];
    const curso = nivelEsoHecho_(String(fila[c.curso] || '').trim());
    if (!curso) continue;
    if (ESTADO_NO_CUENTA_(c.estado === -1 ? '' : normalizarAlumno_(fila[c.estado]))) continue;
    const ano = parseInt(fila[c.ano], 10);
    if (!ano) continue;
    (anosPorCurso[curso] = anosPorCurso[curso] || {})[ano] = true;
    cursoDelAno[ano] = curso;
    if (ano > ultimo) ultimo = ano;
    let centroFila = '';
    if (c.centro !== -1) { centroFila = String(fila[c.centro] || '').replace(/\s+/g, ' ').trim(); if (centroFila) centros[centroFila] = true; }
    if (!detalle[ano]) detalle[ano] = { curso: curso, centro: centroFila, estado: c.estado === -1 ? '' : String(fila[c.estado] || '').trim() };
  }
  if (!ultimo) { salida.avisos.push('El expediente de ' + alumno + ' no trae ningún curso de ESO.'); return salida; }
  let repeticiones = 0;
  const repetidos = [];
  for (let n = 1; n <= 4; n++) {
    const anos = anosPorCurso[n + 'º'];
    if (!anos) continue;
    const lista = Object.keys(anos).sort();
    if (lista.length < 2) continue;
    repeticiones += lista.length - 1;
    repetidos.push(n + 'º (' + lista.map(function (a) { return anoAcademicoHecho_(a); }).join(', ') + ')');
  }
  salida.repeticiones = repeticiones;
  salida.cursosRepetidos = repetidos;
  salida.centros = Object.keys(centros);
  salida.anos = Object.keys(cursoDelAno).sort();
  salida.porAno = detalle;
  const anoPasado = ultimo - 1, cursoPasado = cursoDelAno[anoPasado] || '';
  if (cursoPasado) {
    salida.cursoPasado = cursoPasado;
    salida.repetiaPasado = Object.keys(anosPorCurso[cursoPasado]).some(function (a) { return parseInt(a, 10) < anoPasado; }) ? 'SÍ' : 'NO';
  } else {
    salida.avisos.push('El expediente de ' + alumno + ' no dice en qué curso estuvo el curso ' + anoAcademicoHecho_(anoPasado) + '. No he tocado su curso del año pasado.');
  }
  if (c.materia !== -1 && c.nota !== -1) {
    const mejores = {};
    for (let f = 1; f < tabla.length; f++) {
      const fila = tabla[f];
      const ano = parseInt(fila[c.ano], 10);
      if (!ano || !nivelEsoHecho_(String(fila[c.curso] || '').trim())) continue;
      if (ESTADO_NO_CUENTA_(c.estado === -1 ? '' : normalizarAlumno_(fila[c.estado]))) continue;
      const p = partirMateriaSec_(fila[c.materia]);
      if (!p.materia) continue;
      const clave = normalizarAlumno_(p.materia) + '|' + p.de;
      const nota = fila[c.nota], texto = String(nota === undefined || nota === null ? '' : nota).trim();
      if (texto !== '') {
        const dic = salida.notasPorAno[ano] || (salida.notasPorAno[ano] = {});
        dic[clave] = [p.materia, esNumeroHecho_(texto) ? aNumeroHecho_(texto) : texto, p.de];
      }
      if (!mejores[ano]) mejores[ano] = {};
      const antes = mejores[ano][clave];
      if (antes === undefined || (esNumeroHecho_(nota) && (!esNumeroHecho_(antes) || aNumeroHecho_(nota) > aNumeroHecho_(antes)))) mejores[ano][clave] = nota;
    }
    Object.keys(mejores).forEach(function (ano) {
      const susp = Object.keys(mejores[ano]).filter(function (k) { return esNumeroHecho_(mejores[ano][k]) && aNumeroHecho_(mejores[ano][k]) < 5; }).length;
      if (detalle[ano]) detalle[ano].suspensos = susp;
      if (parseInt(ano, 10) === anoPasado) salida.suspensosPasado = susp;
    });
    Object.keys(salida.notasPorAno).forEach(function (ano) {
      const dic = salida.notasPorAno[ano];
      salida.notasPorAno[ano] = Object.keys(dic).map(function (k) { return dic[k]; });
    });
  }
  return salida;
}

/* Lee los expedientes de un tipo de uno en uno, hasta `limite` (hora absoluta; al menos uno por llamada), y guarda lo leído cada 20 y al cortar.
   Cuando están todos, apunta la huella del tipo en el avance. Un expediente cuya huella no ha cambiado no se vuelve a abrir. */
function leerExpedientes_(raiz, t, avance, limite) {
  const t0 = new Date().getTime();
  const dir = subcarpetaPorRuta_(raiz, '_interno/leido');
  const lista = leerIndiceAlumnos_(raiz).listados.filter(function (e) { return e.clave === t.fuente.clave; });
  let leido = cargarLeido_(raiz, t.k);
  if (!leido || leido.lector !== t.fuente.versionLector) leido = { lector: t.fuente.versionLector, clave: t.fuente.clave, huella: '', ficheros: {} };
  const guardar = function () { escribirJsonCompacto_(dir, nombreDeLeido_(t.k), leido); };
  const vigente = {};
  lista.forEach(function (e) { vigente[e.alumno] = true; });
  Object.keys(leido.ficheros).forEach(function (k) { if (!vigente[k]) delete leido.ficheros[k]; });
  let nuevos = 0;
  for (let i = 0; i < lista.length; i++) {
    const e = lista[i], antes = leido.ficheros[e.alumno];
    if (antes && antes.huella === e.huella) continue;
    if (nuevos > 0 && new Date().getTime() >= limite) break;
    try {
      const bytes = ficheroDeEntrada_(e).getBlob().getBytes();
      leido.ficheros[e.alumno] = { huella: e.huella, r: lectorDeExpediente_(t.fuente.lector)(bytes, e.alumnoNombre, e.fichero) };
    } catch (x) {
      leido.ficheros[e.alumno] = { huella: e.huella, ilegible: true, nombre: e.alumnoNombre, fichero: e.fichero, detalle: String((x && x.message) || x).slice(0, 200) };
    }
    nuevos++;
    if (nuevos % 20 === 0) guardar();
  }
  const completo = lista.every(function (e) { return leido.ficheros[e.alumno] && leido.ficheros[e.alumno].huella === e.huella; });
  leido.huella = completo ? t.entrada.huella : '';
  guardar();
  if (completo) avance.leidos[t.k] = { version: t.fuente.versionLector, huella: leido.huella }; else delete avance.leidos[t.k];
  avance.segundos.lectores[t.k] = (avance.segundos.lectores[t.k] || 0) + Math.round((new Date().getTime() - t0) / 1000);
}

/* ==== HechosHistoria.gs ==== */
/* La historia del alumno en la ficha (reglas de BD Alumnado: `calcularHistorial` y `componerAlumnado` de Codigo.gs, SIN lo que entra por `manuales`, SIN el PIL y SIN las notas):
   curso del año pasado, repeticiones y lo que dicen los expedientes de Primaria y de Secundaria. Todo sin corregir; lo que no se sabe (el «?» de BD Alumnado) no se escribe. */
const EDAD_TEORICA_ = { '1º': 12, '2º': 13, '3º': 14, '4º': 15 };
const NIVELES_ESO_ = ['1º', '2º', '3º', '4º'];
const MAX_REP_PRIMARIA_ = 1;

function esNumeroHecho_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return false;
  return !isNaN(Number(String(v).trim().replace(',', '.')));
}
function aNumeroHecho_(v) { return Number(String(v).trim().replace(',', '.')); }

function nivelEsoHecho_(texto) {
  const m = String(texto || '').trim().match(/^([1-4])\s*º?\s*(de\s+)?E\.?\s*S\.?\s*O\.?/i);
  return m ? m[1] + 'º' : '';
}

/* Ni menos de cero ni más de una repetición en Primaria: solo para los números estimados por edad. */
function topeRepPrimariaHecho_(v) {
  if (v === '' || v === null || v === undefined || !esNumeroHecho_(v)) return v;
  const n = aNumeroHecho_(v);
  return n < 0 ? 0 : (n > MAX_REP_PRIMARIA_ ? MAX_REP_PRIMARIA_ : n);
}

function anoDeNacimientoHecho_(iso) {
  const m = String(iso || '').match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

/* `calcularHistorial` para un alumno: sus filas de RegAlum hasta el año de la parte (ya ordenadas). Null si la fila de ese año no es de un curso de la ESO. */
function historialDeAlumno_(filas) {
  const ultima = filas[filas.length - 1];
  const niv = nivelEsoHecho_(ultima.v.curso);
  if (!niv) return null;
  const porNivel = {};
  filas.forEach(function (f) {
    const n = nivelEsoHecho_(f.v.curso);
    if (!n || ESTADOS_QUE_NO_CUENTAN_.indexOf(normalizarAlumno_(f.tr[3])) !== -1) return;
    (porNivel[n] = porNivel[n] || {})[String(f.ano)] = parseInt(f.v.edad, 10);
  });
  let repESO = 0;
  Object.keys(porNivel).forEach(function (n) { repESO += Object.keys(porNivel[n]).length - 1; });
  const repite = Object.keys(porNivel[niv] || {}).length > 1 ? 'SÍ' : 'NO';
  const repetidos = [];
  NIVELES_ESO_.forEach(function (n) {
    if (!porNivel[n]) return;
    const lista = Object.keys(porNivel[n]).sort();
    if (lista.length >= 2) repetidos.push(n + ' (' + lista.map(function (a) { return anoAcademicoHecho_(a); }).join(', ') + ')');
  });
  const anoAnterior = ultima.ano - 1;
  let cursoPasado = '', repetiaPasado = '';
  Object.keys(porNivel).forEach(function (n) {
    if (porNivel[n][String(anoAnterior)] === undefined) return;
    cursoPasado = n;
    repetiaPasado = Object.keys(porNivel[n]).some(function (a) { return parseInt(a, 10) < anoAnterior; }) ? 'SÍ' : 'NO';
  });
  const edad = parseInt(ultima.v.edad, 10);
  let repPrim = '', fuente = '';
  if (porNivel['1º']) {
    let menor = null;
    Object.keys(porNivel['1º']).forEach(function (a) { const e = porNivel['1º'][a]; if (menor === null || e < menor) menor = e; });
    repPrim = menor - 12; fuente = '1ºESO';
  } else if (!isNaN(edad)) {
    repPrim = edad - EDAD_TEORICA_[niv] - repESO; fuente = 'EDAD';
  }
  return { niv: niv, edad: isNaN(edad) ? '' : edad, repite: repite, repESO: repESO, repPrim: topeRepPrimariaHecho_(repPrim), fuente: fuente, cursosESO: repetidos.join('; '),
    cursoPasado: cursoPasado, repetiaPasado: repetiaPasado, anoNac: anoDeNacimientoHecho_(ultima.v.fechaNacimiento) };
}

/* Las claves de la ficha que salen del expediente de Primaria. `anoNac` solo si se sabe (en un aviso sin ficha no se sabe). */
function clavesDePrimaria_(r, anoNac) {
  const o = { primariaExpediente: true, primariaCompleto: !!r.completo };
  if (anoNac !== undefined) o.primariaInicioNormal = !!(r.completo && r.anoPrimero && anoNac && Number(r.anoPrimero) - anoNac === 6);
  const poner = function (k, v) { if (v !== null && v !== undefined && v !== '') o[k] = v; };
  poner('primariaCentro', convertirValorHecho_(r.centro, 'texto'));
  poner('primariaAnoPrimero', anoAcademicoHecho_(r.anoPrimero));
  poner('primariaAnoSexto', anoAcademicoHecho_(r.anoSexto));
  poner('primariaPendientes', convertirValorHecho_((r.pendientes || []).join(', '), 'lista'));
  poner('primariaArrastradas', convertirValorHecho_((r.arrastradas || []).join(', '), 'lista'));
  o.primariaRepeticiones = r.repeticiones === '' ? 'expediente incompleto' : String(r.repeticiones);
  if (r.repeticiones !== '' && r.repeticiones !== undefined) poner('cursosRepetidosPrimaria', (r.cursosRepetidos || []).join(', '));
  return o;
}

/* Las claves que salen del expediente de Secundaria. */
function clavesDeSecundaria_(r) {
  const o = { secundariaExpediente: true };
  const poner = function (k, v) { if (v !== null && v !== undefined && v !== '') o[k] = v; };
  if (esNumeroHecho_(r.suspensosPasado)) o.secundariaSuspensosAnterior = aNumeroHecho_(r.suspensosPasado);
  const anos = Object.keys(r.porAno || {}).map(Number).sort(function (a, b) { return a - b; });
  if (anos.length) o.secundariaTrayectoria = anos.map(function (a) {
    const x = r.porAno[a];
    return { ano: a, curso: x.curso || null, centro: x.centro || null, estado: x.estado || null, suspensos: x.suspensos === undefined ? null : x.suspensos };
  });
  const notas = [];
  Object.keys(r.notasPorAno || {}).map(Number).sort(function (a, b) { return a - b; }).forEach(function (a) {
    r.notasPorAno[a].forEach(function (n) { notas.push({ ano: a, materia: n[0], nota: n[1], de: n[2] || null }); });
  });
  if (notas.length) o.secundariaNotas = notas;
  poner('secundariaAnos', (r.anos || []).map(function (a) { return anoAcademicoHecho_(a); }).join(', '));
  poner('centrosSecundaria', (r.centros || []).join(' · '));
  return o;
}

/* La historia de un alumno de la ESO (`componerAlumnado` sin lo manual). h = historialDeAlumno_; curso = su curso («1º»…); pendM = sus pendientes de la matrícula;
   exp / expSec = sus expedientes leídos, o null. Devuelve las claves de la ficha que sabe, ya con su tipo. */
function historiaDeAlumno_(h, curso, pendM, exp, expSec) {
  const o = {};
  let repite = h.repite, repESO = h.repESO, repPrim = h.repPrim, fuente = h.fuente, cursoPasado = h.cursoPasado, repetiaPasado = h.repetiaPasado, cursosESO = h.cursosESO;
  if (!cursosESO) cursosESO = (esNumeroHecho_(repESO) && aNumeroHecho_(repESO) > 0) ? '?' : '';
  let fuenteESO = 'HISTÓRICO';
  if (expSec) {
    fuenteESO = 'EXPEDIENTE';
    if (esNumeroHecho_(expSec.repeticiones)) repESO = aNumeroHecho_(expSec.repeticiones);
    cursosESO = (expSec.cursosRepetidos || []).join('; ');
    if (expSec.cursoPasado) {
      cursoPasado = expSec.cursoPasado;
      repetiaPasado = expSec.repetiaPasado || '';
      if (expSec.cursoPasado === curso) repite = 'SÍ';
    }
  }
  repPrim = topeRepPrimariaHecho_(repPrim);
  const conExp = !!(exp && exp.repeticiones !== '' && exp.repeticiones !== undefined);
  if (conExp) { repPrim = exp.repeticiones; fuente = 'EXPEDIENTE'; }
  let sinLocalizar = '';
  const teorica = EDAD_TEORICA_[curso];
  if (repPrim !== '' && teorica && esNumeroHecho_(h.edad) && esNumeroHecho_(repESO)) {
    const desfase = aNumeroHecho_(h.edad) - teorica - aNumeroHecho_(repESO) - Number(repPrim);
    sinLocalizar = desfase > 0 ? desfase : 0;
  }
  if (curso === '1º' && repite !== 'SÍ') {
    cursoPasado = '6º de Primaria';
    repetiaPasado = (exp && exp.completo) ? ((exp.cursosRepetidos || []).indexOf('6º') !== -1 ? 'SÍ' : 'NO') : '?';
  } else if (!cursoPasado) { cursoPasado = '?'; repetiaPasado = '?'; }
  else if (!repetiaPasado) repetiaPasado = '?';
  const cursosPrim = conExp ? (exp.cursosRepetidos || []).join(', ') : (repPrim === 0 ? '' : '?');
  if (cursoPasado !== '?') o.cursoAnterior = cursoPasado;
  if (repetiaPasado === 'SÍ' || repetiaPasado === 'NO') o.repetiaAnteriorBruto = repetiaPasado;
  if (repite === 'SÍ' || repite === 'NO') o.repiteCurso = repite === 'SÍ';
  if (esNumeroHecho_(repESO)) o.repeticionesEso = aNumeroHecho_(repESO);
  if (cursosESO && cursosESO !== '?') o.cursosRepetidosEso = cursosESO;
  o.fuenteEso = fuenteESO;
  if (esNumeroHecho_(repPrim)) o.repeticionesPrimaria = aNumeroHecho_(repPrim);
  if (fuente) o.fuentePrimaria = fuente;
  if (cursosPrim && cursosPrim !== '?') o.cursosRepetidosPrimaria = cursosPrim;
  if (sinLocalizar !== '') o.repSinLocalizarBruto = sinLocalizar;
  if (curso === '1º' && exp && exp.anoSexto) {
    const pend = pendM.concat(exp.pendientes || []);
    if (pend.length) { o.pendientes = convertirValorHecho_(pend.length + ': ' + pend.join(', '), 'lista'); o.numPendientes = pend.length; }
  }
  if (exp && exp.centro) o.centroDe6 = exp.centro;
  return o;
}

/* ==== HechosNeae.gs ==== */
/* El censo NEAE en la ficha (reglas de referencia/bd-alumnado/NEAE.gs). El fichero no trae el nombre del alumno, solo sus iniciales, el curso y la fecha de nacimiento.
   Se publica EN BRUTO, con claves nuevas (`censo…`): `neae` y `medidasRecursos` son de BD Alumnado, que puede corregirlas. Nunca se escribe encima de un alumno del que no se esté seguro. */
const CATEGORIAS_NEAE_ = {
  'necesidades educativas especiales': 'NEE', 'dificultades de aprendizaje': 'DIA', 'altas capacidades intelectuales': 'AACC', 'compensacion educativa': 'COM'
};
const ORDEN_CATEGORIAS_NEAE_ = ['NEE', 'DIA', 'AACC', 'COM'];
const DETALLES_NEAE_ = {
  'dificultades especifica en el aprendizaje de la lectura o dislexia': 'dislexia', 'dificultades especificas en el aprendizaje de la escritura - disgrafia': 'disgrafía',
  'dificultades especificas en el aprendizaje de la escritura - disortografia': 'disortografía', 'dificultades especificas en el aprendizaje del calculo o discalculia': 'discalculia',
  'dificultades de aprendizaje por capacidad intelectual limite': 'capacidad límite', 'dificultades de aprendizaje por retraso en el lenguaje': 'retraso lenguaje',
  'dificultades de aprendizaje derivadas de tdah': 'TDAH', 'tdah: tipo combinado': 'TDAH combinado', 'tdah: predomino del deficit de atencion': 'TDAH atención',
  'tdah: predominio del deficit de atencion': 'TDAH atención', 'tdah: predominio de la impulsividad-hiperactividad': 'TDAH impulsividad',
  'retrasos evolutivos graves o profundos': 'retraso evolutivo', 'trastornos graves del desarrollo del lenguaje': 'trastorno lenguaje',
  'discapacidad intelectual moderada': 'd. intelectual moderada', 'discapacidad intelectual leve': 'd. intelectual leve', 'discapacidad auditiva hipoacusia': 'hipoacusia',
  'baja vision': 'baja visión', 'lesiones del sistema osteoarticular': 'lesión osteoart.', 'enfermedades raras y cronicas': 'enf. rara/crónica', 't.e.l. mixto': 'TEL mixto',
  't.e.l. expresivo': 'TEL expresivo', 't.e.l. semantico-pragmatico': 'TEL sem-prag', 'talento complejo': 'talento complejo', 'talento simple': 'talento simple',
  'sobredotacion intelectual': 'sobredotación'
};
/* tipo M = medida, R = recurso o personal de apoyo */
const MEDIDAS_NEAE_ = {
  'programa especifico (pe).': { sigla: 'PE', tipo: 'M' }, 'programa de refuerzo del aprendizaje para aneae': { sigla: 'PRA', tipo: 'M' },
  'programa de profundizacion para aneae': { sigla: 'PP', tipo: 'M' }, 'adaptacion curricular significativa (acs).': { sigla: 'ACS', tipo: 'M' },
  'adaptacion curricular individualizada (aci)(nee - mod. c/d)': { sigla: 'ACI', tipo: 'M' },
  'adaptacion curricular para alumnado con altas capacidades intelectuales (acai)': { sigla: 'ACAI', tipo: 'M' }, 'adaptacion de acceso (aac)(nee)': { sigla: 'AAC', tipo: 'M' },
  'atencion especifica para alumnado de incorporacion tardia con graves carencias en la comunicacion linguistica (solo com)': { sigla: 'ATE', tipo: 'M' },
  'programa de refuerzo del area de lengua castellana y literatura, en lugar del area segunda lengua extranjera': { sigla: 'RLC', tipo: 'M' },
  'profesorado especialista en pedagogia terapeutica (pt)': { sigla: 'PT', tipo: 'R' }, 'profesorado especialista en audicion y lenguaje (al)': { sigla: 'AL', tipo: 'R' },
  'profesorado de aula temporal de adaptacion linguistica(atal)': { sigla: 'ATAL', tipo: 'R' }, 'profesorado de apoyo a la compensacion educativa': { sigla: 'COMP', tipo: 'R' },
  'profesional tecnico en integracion social_ptis (monitor o monitora de educacion especial)': { sigla: 'PTIS', tipo: 'R' },
  'profesorado del equipo de apoyo a ciegos o discapacitados visuales (once)': { sigla: 'ONCE', tipo: 'R' }, 'interprete de lengua de signos espanola (ilse)': { sigla: 'ILSE', tipo: 'R' },
  'vigilancia': { sigla: 'vigilancia', tipo: 'R' }, 'supervision especializada': { sigla: 'supervisión', tipo: 'R' }, 'asistencia en la higiene y aseo personal': { sigla: 'aseo', tipo: 'R' },
  'asistencia en el control de esfinteres': { sigla: 'aseo', tipo: 'R' }, 'ayuda en la alimentacion': { sigla: 'alimentación', tipo: 'R' }, 'ayuda en el desplazamiento': { sigla: 'desplazamiento', tipo: 'R' },
  'ayudas tecnicas para la comunicacion auditiva': { sigla: 'ayudas auditivas', tipo: 'R' }, 'ayudas opticas, no opticas o electronicas': { sigla: 'ayudas ópticas', tipo: 'R' }
};

function sinTildesHecho_(t) { return String(t === null || t === undefined ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/* Las iniciales como las escribe Séneca: nombre primero, apellidos después, y solo las palabras que empiezan por mayúscula. «Ruiz De la Torre, Mario» → MRDT. */
function inicialesDeHecho_(nombre) {
  const partes = String(nombre || '').split(',');
  const apellidos = partes[0] || '';
  const pila = partes.length > 1 ? partes.slice(1).join(' ') : '';
  let salida = '';
  sinTildesHecho_(pila + ' ' + apellidos).split(/[\s]+/).forEach(function (palabra) {
    const p = palabra.replace(/^[^A-Za-z0-9ÑñÇç]+/, '');
    if (!p) return;
    const c = p.charAt(0);
    if ((c >= 'A' && c <= 'Z') || c === 'Ñ' || c === 'Ç') salida += c;
  });
  return salida;
}

/* «5/9/2012» → «05/09/2012»; una fecha ISO («2012-09-05») también. */
function fechaClaveHecho_(v) {
  const t = String(v === null || v === undefined ? '' : v).trim();
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3];
  const i = t.match(/^(\d{4})-(\d\d)-(\d\d)/);
  return i ? i[3] + '/' + i[2] + '/' + i[1] : t;
}

function trocearNecesidadesHecho_(texto) {
  const t = String(texto || '').replace(/^\s*\[/, '').replace(/\]\s*$/, '');
  if (!t.trim()) return [];
  const rutas = [];
  t.split(/,\s*(?=Necesidades\s+espec)/).forEach(function (trozo) {
    const limpio = trozo.split('|').map(function (x) { return x.trim(); }).filter(String);
    if (limpio.length > 1) rutas.push(limpio);
  });
  return rutas;
}

/* «DIA dislexia, disgrafía · NEE TDAH combinado» */
function resumirNecesidadesHecho_(texto, sinSigla) {
  const porCategoria = {};
  trocearNecesidadesHecho_(texto).forEach(function (ruta) {
    const sigla = CATEGORIAS_NEAE_[normalizarAlumno_(ruta[1])];
    if (!sigla) { sinSigla.push('Categoría NEAE desconocida: ' + ruta[1]); return; }
    if (!porCategoria[sigla]) porCategoria[sigla] = [];
    if (ruta.length < 3) return;
    const ultimo = ruta[ruta.length - 1];
    let corto = DETALLES_NEAE_[normalizarAlumno_(ultimo)];
    if (corto === undefined) { corto = ultimo; sinSigla.push('Detalle NEAE sin abreviar: ' + ultimo); }
    if (porCategoria[sigla].indexOf(corto) === -1) porCategoria[sigla].push(corto);
  });
  return ORDEN_CATEGORIAS_NEAE_.filter(function (s) { return porCategoria[s]; })
    .map(function (s) { return porCategoria[s].length ? s + ' ' + porCategoria[s].join(', ') : s; }).join(' · ');
}

/* «ACS, PE, PRA / PT, AL» */
function resumirMedidasHecho_(texto, sinSigla) {
  const medidas = [], recursos = [];
  String(texto || '').split('<li>').slice(1).forEach(function (trozo) {
    const x = trozo.split('<')[0].trim().replace(/,\s*$/, '').trim();
    if (!x) return;
    const d = MEDIDAS_NEAE_[normalizarAlumno_(x)];
    if (!d) { sinSigla.push('Medida o recurso sin abreviar: ' + x); if (medidas.indexOf(x) === -1) medidas.push(x); return; }
    const lista = d.tipo === 'M' ? medidas : recursos;
    if (lista.indexOf(d.sigla) === -1) lista.push(d.sigla);
  });
  if (!medidas.length && !recursos.length) return '';
  if (!recursos.length) return medidas.join(', ');
  if (!medidas.length) return recursos.join(', ');
  return medidas.join(', ') + ' / ' + recursos.join(', ');
}

/* «1º de Bachillerato (Ciencias y Tecnología)» o «1º BACH A» → «1º BACH» */
function nivelBachilleratoCensoHecho_(texto) {
  const m = String(texto || '').trim().match(/^([12])\s*º?\s*(de\s+)?BACH/i);
  return m ? m[1] + 'º BACH' : '';
}

/* El censo de un curso: { lector, clave, variante, huella, fichas: [{ iniciales, fecha, nivel, neae, medidas }], avisos: [texto] } */
function leerCensoNeae_(bytes, fuente, huella, conj, entrada) {
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, fichas: [], avisos: [] };
  const texto = bytesATexto_(bytes);
  const tabla = leerCsv_(texto, detectarSeparador_(texto));
  if (!tabla.length) return salida;
  const cab = tabla[0].map(normalizarAlumno_);
  const d = function (t) { return cab.indexOf(normalizarAlumno_(t)); };
  const iNom = d('Alumno/a'), iFec = d('Fecha de nacimiento'), iCur = d('Curso'), iNec = d('Necesidades específicas de apoyo educativo');
  let iMed = d('Medidas Específicas y Recursos Recibidos');
  if (iMed === -1) iMed = d('Medidas Específicas y Recursos Necesitados');
  if (iNom === -1 || iCur === -1 || iNec === -1) { salida.avisos.push('Al censo NEAE le faltan columnas. No se ha usado.'); return salida; }
  const sinSigla = [], descartadas = {};
  for (let f = 1; f < tabla.length; f++) {
    const fila = tabla[f];
    const nivel = nivelEsoHecho_(fila[iCur]) || nivelBachilleratoCensoHecho_(fila[iCur]);
    if (!nivel) { const q = String(fila[iCur] || '').trim() || '(sin curso)'; descartadas[q] = (descartadas[q] || 0) + 1; continue; }
    const iniciales = sinTildesHecho_(String(fila[iNom] || '').trim()).toUpperCase();
    if (!iniciales) continue;
    salida.fichas.push({ iniciales: iniciales, fecha: iFec === -1 ? '' : fechaClaveHecho_(fila[iFec]), nivel: nivel,
      neae: resumirNecesidadesHecho_(fila[iNec], sinSigla), medidas: iMed === -1 ? '' : resumirMedidasHecho_(fila[iMed], sinSigla) });
  }
  const fuera = Object.keys(descartadas).sort();
  if (fuera.length) salida.avisos.push('El censo trae ' + fuera.map(function (q) { return q + ': ' + descartadas[q]; }).join(' · ') +
    '. Esas fichas no son ni de ESO ni de Bachillerato, así que no hay ningún alumno de la tabla al que escribírselas. Es normal: son de educación especial o de enseñanzas que este sistema no lleva.');
  const vistos = {};
  sinSigla.forEach(function (x) { if (!vistos[x]) { vistos[x] = true; salida.avisos.push(x); } });
  return salida;
}

/* El cruce (`cruzarNeae_`): por iniciales y nivel; con varios, por la fecha de nacimiento (solo si el candidato la tiene: en Bachillerato no); si no, a nadie.
   candidatos = [{ id, alumno, nivel, fecha, aviso }] (`aviso` en los de matrícula sin ficha, que no tienen registro); fichas = lo leído del censo.
   Devuelve { asign: { id | indice: { ficha, como } }, dudosos: { id: true }, niveles: { nivel: n fichas }, avisos, porIniciales, porFecha }. */
function cruzarCenso_(candidatos, fichas) {
  const porClave = {};
  candidatos.forEach(function (c, i) { c.i = i; (porClave[inicialesDeHecho_(c.alumno) + '|' + c.nivel] = porClave[inicialesDeHecho_(c.alumno) + '|' + c.nivel] || []).push(c); });
  const salida = { asign: {}, dudosos: {}, niveles: {}, avisos: [], porIniciales: 0, porFecha: 0 };
  fichas.forEach(function (f) {
    salida.niveles[f.nivel] = (salida.niveles[f.nivel] || 0) + 1;
    const cand = porClave[f.iniciales + '|' + f.nivel] || [];
    let elegido = null, como = '';
    if (cand.length === 1) { elegido = cand[0]; como = 'iniciales + curso'; salida.porIniciales++; }
    else if (cand.length > 1) {
      const conFecha = cand.filter(function (c) { return f.fecha && c.fecha && c.fecha === f.fecha; });
      if (conFecha.length === 1) { elegido = conFecha[0]; como = 'iniciales + curso + fecha de nacimiento'; salida.porFecha++; }
      else {
        cand.forEach(function (c) { salida.dudosos[c.i] = true; });
        salida.avisos.push({ tipo: 'censo-empate', id: null, datos: { iniciales: f.iniciales, curso: f.nivel, fechaNacimiento: f.fecha || null, candidatos: cand.map(function (c) { return c.alumno; }) } });
      }
    } else salida.avisos.push({ tipo: 'censo-sin-alumno', id: null, datos: { iniciales: f.iniciales, curso: f.nivel } });
    if (!elegido) return;
    if (salida.asign[elegido.i]) { salida.avisos.push({ tipo: 'censo-repetida', id: null, datos: { curso: f.nivel, alumno: elegido.alumno } }); return; }
    salida.asign[elegido.i] = { ficha: f, como: como };
  });
  return salida;
}

/* Las cuatro claves de la ficha para una ficha asignada. */
function clavesDeCenso_(a) {
  const o = { censoNeae: true };
  const n = convertirValorHecho_(a.ficha.neae, 'texto'), m = convertirValorHecho_(a.ficha.medidas, 'texto');
  if (n !== null) o.censoNecesidades = n;
  if (m !== null) o.censoMedidas = m;
  o.censoLocalizado = a.como;
  return o;
}

/* ==== HechosPersonal.gs ==== */
/* El conjunto `personal` (fila 11): una ficha por persona y curso, con lo que trae el listado de Séneca y nada más. Lleva datos de trabajadores (DNI, teléfono, correo):
   lo leído vive en _interno/leido/ y las fichas y los avisos solo en la parte, en Drive. Nunca sale de aquí un nombre, un documento ni un título de columna. */

/* Los listados `personal` con curso, los de todos los cursos guardados, en orden de variante. Cada uno: { fuente, entrada, k }. */
function fuentesPorCursos_(indice, conj) {
  const f = conj.fuentes[0];
  return indice.listados.filter(function (e) { return e.clave === f.clave && !e.porAlumno && cursoValido_(e.cursoEscolar); })
    .sort(function (a, b) { return (a.variante || '') < (b.variante || '') ? -1 : ((a.variante || '') > (b.variante || '') ? 1 : 0); })
    .map(function (e) { return { fuente: f, entrada: e, k: claveLeido_(e.clave, e.variante) }; });
}

/* Una parte por cada curso con algún listado, del más reciente al más viejo. */
function partesPorCursos_(necesarias) {
  const vistos = {};
  necesarias.forEach(function (x) { vistos[x.entrada.cursoEscolar] = true; });
  return Object.keys(vistos).sort(function (a, b) { return ordenDeCurso_(b) - ordenDeCurso_(a); })
    .map(function (c) { return { parte: 'curso', cursoEscolar: c, anio: anioDeCurso_(c) }; });
}

/* «26-27/docentes» → «docentes»; «26-27/no-docentes» → «no-docentes»; «26-27» → «todo». */
function listadoDeVariante_(variante) { return String(variante || '').split('/')[1] || 'todo'; }

/* El lector: guarda los títulos tal como vienen y, de cada fila con nombre, todas sus casillas (sin decidir nada). Un fichero que no sirve no rompe nada: queda dicho en `problema`.
   { lector, clave, variante, huella, titulos, filas: [[casilla…]], sinNombre, problema: '' | 'vacio' | 'ilegible' | 'faltan-columnas' } */
function leerPersonal_(bytes, fuente, huella, conj, entrada) {
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, titulos: [], filas: [], sinNombre: 0, problema: '' };
  let tabla = [];
  try { const texto = bytesATexto_(bytes); tabla = leerCsv_(texto, detectarSeparador_(texto)); } catch (e) { salida.problema = 'ilegible'; return salida; }
  if (tabla.length < 2) { salida.problema = 'vacio'; return salida; }
  salida.titulos = tabla[0].map(function (t) { return String(t).trim(); });
  const tn = salida.titulos.map(normalizarTitulo_);
  const iNombre = tn.indexOf(normalizarTitulo_('Empleado/a'));
  if (iNombre === -1 || tn.indexOf(normalizarTitulo_('DNI/Pasaporte')) === -1 || tn.indexOf(normalizarTitulo_('Puesto')) === -1) { salida.problema = 'faltan-columnas'; return salida; }
  for (let f = 1; f < tabla.length; f++) {
    const celdas = salida.titulos.map(function (t, j) { return String(tabla[f][j] === undefined ? '' : tabla[f][j]).trim(); });
    if (!celdas.some(function (c) { return c; })) continue;
    if (!celdas[iNombre]) { salida.sinNombre++; continue; }
    salida.filas.push(celdas);
  }
  return salida;
}

/* Lo que un fichero deja dicho al leerlo, en una frase llana (sin nombres ni títulos). '' si no hay nada que decir. */
function frasesDeFicheroPersonal_(l) {
  if (l.problema === 'vacio') return ['El listado está vacío.'];
  if (l.problema === 'ilegible') return ['No se ha podido leer el listado.'];
  if (l.problema === 'faltan-columnas') return ['Al listado le falta una columna necesaria y no se ha usado.'];
  return l.sinNombre ? ['Trae ' + l.sinNombre + (l.sinNombre === 1 ? ' fila sin nombre.' : ' filas sin nombre.')] : [];
}

/* «García López, Ana» → { apellidos, nombre }. Solo si hay una sola coma y algo a cada lado. */
function partirEmpleado_(texto) {
  const t = String(texto || '').split(',');
  if (t.length !== 2) return {};
  const a = t[0].replace(/\s+/g, ' ').trim(), n = t[1].replace(/\s+/g, ' ').trim();
  return a && n ? { apellidos: a, nombre: n } : {};
}

/* El documento sin espacios, puntos ni guiones y en mayúsculas: «12.345.678-z» y «12345678Z» son la misma persona. */
function idDePersonal_(documento) { return String(documento || '').toUpperCase().replace(/[\s.\-]/g, ''); }

/* Las filas de un fichero ya leído, con sus datos sueltos interpretados con la tabla de campos. */
function filasDePersonal_(conj, f, n) {
  const l = f.leido, listado = listadoDeVariante_(l.variante || f.entrada.variante);
  const tn = l.titulos.map(normalizarTitulo_);
  const simples = conj.campos.filter(function (c) { return c.col; }).map(function (c) {
    return { clave: c.clave, tipo: c.tipo, idx: c.col.map(function (t) { return tn.indexOf(normalizarTitulo_(t)); }).filter(function (j) { return j !== -1; }) };
  });
  return l.filas.map(function (celdas) {
    const v = {};
    simples.forEach(function (c) {
      for (let k = 0; k < c.idx.length; k++) {
        if (celdas[c.idx[k]]) { const x = convertirValorHecho_(celdas[c.idx[k]], c.tipo); if (x !== null) v[c.clave] = x; return; }
      }
    });
    const cs = [];
    l.titulos.forEach(function (t, j) { if (t && celdas[j]) cs.push({ columna: t, valor: celdas[j] }); });
    return { listado: listado, v: v, celdas: cs, n: n, subido: f.entrada.subido || '' };
  });
}

/* ¿Docente o no docente? Según los listados en que sale; solo en «todo el personal», según su puesto. null si no se sabe o si sale en los dos. */
function tipoDePersonal_(listados, manda, aprendidos) {
  const doc = listados.indexOf('docentes') !== -1, nod = listados.indexOf('no-docentes') !== -1;
  if (doc && nod) return { conflicto: true };
  if (doc) return { tipo: 'docente' };
  if (nod) return { tipo: 'no-docente' };
  const a = ambitoDeUnPuesto_(normalizarTitulo_(manda.v.puesto || ''), aprendidos);
  return a ? { tipo: a === 'docentes' ? 'docente' : 'no-docente' } : {};
}

function registroDePersonal_(conj, id, filas, aprendidos, avisos) {
  let manda = filas[0];
  filas.forEach(function (f) { if (f.subido >= manda.subido) manda = f; });
  const listados = [];
  filas.forEach(function (f) { if (listados.indexOf(f.listado) === -1) listados.push(f.listado); });
  const t = tipoDePersonal_(listados, manda, aprendidos);
  if (t.conflicto) avisos.push({ tipo: 'personal-en-dos-listados', id: id, datos: { empleado: manda.v.empleado || null } });
  const nombres = partirEmpleado_(manda.v.empleado);
  const datos = {};
  conj.campos.forEach(function (c) {
    let v;
    if (c.calculado === 'apellidos') v = nombres.apellidos;
    else if (c.calculado === 'nombre') v = nombres.nombre;
    else if (c.calculado === 'tipoPersonal') v = t.tipo;
    else if (c.calculado === 'listados') v = listados;
    else if (c.calculado === 'celdas') v = manda.celdas.length ? manda.celdas : undefined;
    else if (c.calculado === 'puestos') {
      v = filas.map(function (f) {
        const x = { listado: f.listado };
        ['puesto', 'fechaTomaPosesion', 'fechaCese'].forEach(function (k) { if (f.v[k] !== undefined) x[k] = f.v[k]; });
        return x;
      });
    } else v = manda.v[c.clave];
    if (v !== null && v !== undefined) datos[c.clave] = v;
  });
  return { id: id, datos: datos };
}

/* La parte de un curso. `fuentes` = [{ leido, entrada }] de todos los listados `personal` de ese curso, en orden de variante. Cada registro es { id, datos } (sin `matriculado`). */
function montarPersonal_(conj, parte, fuentes) {
  const avisos = [], columnas = {}, porId = {}, orden = [], aprendidos = aprendido_().valores['personal|puesto'] || {};
  fuentes.forEach(function (f, n) {
    const listado = listadoDeVariante_(f.leido.variante || f.entrada.variante);
    columnas[listado] = f.leido.titulos;
    frasesDeFicheroPersonal_(f.leido).forEach(function (d) { avisos.push({ tipo: 'personal-fichero', id: null, datos: { listado: listado, detalle: d } }); });
    if (f.leido.problema) return;
    filasDePersonal_(conj, f, n).forEach(function (fila) {
      const id = idDePersonal_(fila.v.documento);
      if (!id) {
        const d = { empleado: fila.v.empleado || null, puesto: fila.v.puesto || null, listado: fila.listado };
        avisos.push({ tipo: 'personal-sin-id', id: null, datos: d });
        return;
      }
      if (!porId[id]) { porId[id] = []; orden.push(id); }
      porId[id].push(fila);
    });
  });
  const avisosPersonas = [];
  const registros = orden.map(function (id) { return registroDePersonal_(conj, id, porId[id], aprendidos, avisosPersonas); });
  registros.sort(function (a, b) {
    const x = normalizarAlumno_(a.datos.empleado), y = normalizarAlumno_(b.datos.empleado);
    return x < y ? -1 : (x > y ? 1 : (a.id < b.id ? -1 : 1));
  });
  return { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: parte.parte, cursoEscolar: parte.cursoEscolar, generado: ahoraMadrid_(), origen: DUENO_CD_,
    columnasPersonal: columnas, campos: camposPublicos_(conj, false), registros: registros, avisos: avisos.concat(avisosPersonas) };
}

/* La tarea «montar» de una parte del personal: carga lo leído de los listados de su curso, la monta, la escribe y apunta el índice. */
function montarParteDePersonal_(raiz, t, avance, cache) {
  const t0 = new Date().getTime();
  if (!cache.aprendido) cache.aprendido = cargarAprendido_(raiz);
  const fuentes = [];
  for (let i = 0; i < t.necesarias.length; i++) {
    const x = t.necesarias[i];
    if (x.entrada.cursoEscolar !== t.parte.cursoEscolar) continue;
    const leido = cargarLeido_(raiz, x.k);
    if (!leido || !avance.leidos[x.k] || leido.huella !== avance.leidos[x.k].huella) { delete avance.leidos[x.k]; return; }
    fuentes.push({ leido: leido, entrada: x.entrada });
  }
  const objeto = montarPersonal_(t.conj, t.parte, fuentes);
  cerrarMontaje_(raiz, t, avance, objeto, t0);
}

/* Lo que la página dice del personal: el curso de hoy y, si no tiene parte, el más reciente que la tenga; y cuántos cursos más hay. Solo cifras y cursos. */
function partesPorCursosParaPagina_(partes) {
  const cursos = partes.slice().sort(function (a, b) { return ordenDeCurso_(b.cursoEscolar) - ordenDeCurso_(a.cursoEscolar); });
  const hoy = cursos.filter(function (p) { return p.cursoEscolar === cursoActual_(); })[0] || cursos[0];
  return hoy ? { actuales: [{ cursoEscolar: hoy.cursoEscolar, registros: hoy.registros }], masCursos: cursos.length - 1 } : { actuales: [], masCursos: 0 };
}

/* ==== HechosTutorias.gs ==== */
/* El conjunto `tutorias` (fila 21): quién es tutor de cada grupo, a partir del PDF de la función tutorial de Séneca. Una parte por curso, en hecho/tutorias/<curso>/curso.json.
   Lleva nombres y documentos de trabajadores: lo leído vive en _interno/leido/ y las partes y los avisos solo en Drive. Nunca sale de aquí un nombre, un documento ni un grupo. */

const TUTORIAS_MARGEN_INFERIOR_ = 62;
const TUTORIAS_TITULOS_ = { 'unidad': 'unidad', 'empleado/a': 'empleado', 'd.n.i.': 'documento', 'periodo': 'periodo' };

/* Los textos agrupados por altura (con 1 punto de holgura), de arriba abajo: [{ y, items }]. */
function alturasTutorias_(items) {
  const orden = items.slice().sort(function (a, b) { return b.y - a.y; });
  const grupos = [];
  orden.forEach(function (it) {
    const u = grupos[grupos.length - 1];
    if (u && u.y - it.y <= 1) u.items.push(it); else grupos.push({ y: it.y, items: [it] });
  });
  return grupos;
}

/* Las tablas de una hoja, por su fila de títulos: [{ y, cols: [{ clave, x }] }] de arriba abajo. Las columnas salen de los títulos. */
function tablasDeHojaTutorias_(textos) {
  const tablas = [];
  alturasTutorias_(textos).forEach(function (a) {
    const cols = [];
    a.items.forEach(function (it) { const c = TUTORIAS_TITULOS_[it.t.trim().toLowerCase()]; if (c) cols.push({ clave: c, x: it.x }); });
    const claves = cols.map(function (c) { return c.clave; });
    if (claves.indexOf('empleado') === -1 || claves.indexOf('documento') === -1 || claves.indexOf('periodo') === -1) return;
    tablas.push({ y: a.y, cols: cols.sort(function (p, q) { return p.x - q.x; }) });
  });
  return tablas;
}

/* La columna más cercana por la izquierda del texto o, si no, la más cercana: los textos no empiezan justo donde su título (hasta un par de puntos de diferencia, en uno u otro lado). */
function columnaDeTutorias_(cols, x) {
  let c = null;
  cols.forEach(function (k) { if (!c || Math.abs(k.x - x) < Math.abs(c.x - x)) c = k; });
  return c;
}

function juntarTextos_(items) { return items.map(function (i) { return i.t; }).join(' ').replace(/\s+/g, ' ').trim(); }

/* «01/09/2026 - 31/08/2027» → { desde: '2026-09-01', hasta: '2027-08-31' }; null si no se entiende. */
function periodoDeTutorias_(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(texto || '').trim());
  if (!m) return null;
  const f = function (d, mes, a) {
    const dt = new Date(Date.UTC(+a, +mes - 1, +d));
    return dt.getUTCFullYear() === +a && dt.getUTCMonth() === +mes - 1 && dt.getUTCDate() === +d ? a + '-' + ('0' + mes).slice(-2) + '-' + ('0' + d).slice(-2) : null;
  };
  const desde = f(m[1], m[2], m[3]), hasta = f(m[4], m[5], m[6]);
  return desde && hasta && desde <= hasta ? { desde: desde, hasta: hasta } : null;
}

function lineaDeFilaTutorias_(f) {
  const crudo = f.nombre.join(' ').replace(/\s+/g, ' ').trim();
  const marca = /\(\s*sustituto\/a\s*\)/i;
  const p = periodoDeTutorias_(f.periodo);
  const l = { unidad: f.unidad, empleado: crudo.replace(/\(\s*sustituto\/a\s*\)/ig, '').replace(/\s+/g, ' ').trim(), sustituto: marca.test(crudo), documento: f.documento, periodo: f.periodo };
  if (p) { l.desde = p.desde; l.hasta = p.hasta; }
  return l;
}

/* Un nombre partido por el cambio de página: la última fila de la hoja anterior acaba su nombre en coma (solo los apellidos) y el resto, nombre y a veces «(Sustituto/a)»,
   es el único texto suelto de la columna del nombre justo bajo los títulos de la tabla de arriba de esta hoja, a 13 puntos o menos de su primera fila. */
function esRestoDeNombreTutorias_(it, filas, previo, enlace) {
  if (!enlace || !enlace.ultima || it.col !== 'empleado' || previo || !filas.length) return false;
  const u = enlace.ultima.fila;
  if (u.nombre.length < 1 || !/,\s*$/.test(u.nombre[u.nombre.length - 1]) || enlace.ultima.gastada) return false;
  const y1 = filas[0].y;
  return it.y > y1 && it.y - y1 <= 13;
}

/* Las líneas de una tabla (cuerpo = los textos de debajo de sus títulos). Una fila es cada altura con documento o con algo que parece un periodo; los renglones de más
   de la columna del nombre (a 13 puntos o menos) son del nombre de arriba; lo que queda más de 13 puntos por debajo de la última fila es el pie. Suma a `salida.sobran` lo que no entra. */
function lineasDeTablaTutorias_(cols, cuerpo, salida, sitio, enlace) {
  const dentro = [];
  cuerpo.forEach(function (it) { const c = columnaDeTutorias_(cols, it.x); if (c) dentro.push({ it: it, col: c.clave }); });
  const filas = [], deFila = new Map();
  alturasTutorias_(dentro.map(function (d) { d.it.col = d.col; return d.it; })).forEach(function (a) {
    const doc = a.items.filter(function (i) { return i.col === 'documento'; });
    const per = a.items.filter(function (i) { return i.col === 'periodo' && /\d\s*\/\s*\d/.test(i.t); });
    if (!doc.length && !per.length) return;
    const de = function (k) { return juntarTextos_(a.items.filter(function (i) { return i.col === k; })); };
    const fila = { y: a.y, unidad: de('unidad'), nombre: [de('empleado')], documento: de('documento'), periodo: de('periodo') };
    filas.push(fila);
    a.items.forEach(function (i) { deFila.set(i, fila); });
  });
  const ultimaY = filas.length ? filas[filas.length - 1].y : Infinity;
  let previo = null;
  const sobras = [];
  dentro.map(function (d) { return d.it; }).sort(function (a, b) { return b.y - a.y; }).forEach(function (it) {
    if (deFila.has(it)) { if (it.col === 'empleado') previo = { y: it.y, fila: deFila.get(it) }; return; }
    if (it.col === 'empleado' && previo && previo.y - it.y <= 13) { previo.fila.nombre.push(it.t.trim()); previo.y = it.y; return; }
    if (esRestoDeNombreTutorias_(it, filas, previo, enlace)) {
      const u = enlace.ultima;
      u.fila.nombre.push(it.t.trim());
      u.gastada = true;
      Object.keys(u.linea).forEach(function (k) { delete u.linea[k]; });
      Object.assign(u.linea, lineaDeFilaTutorias_(u.fila));
      return;
    }
    if (it.y < ultimaY - 13) return;
    salida.sobran++;
    sobras.push({ it: it, previoY: previo ? previo.y : null });
  });
  if (sitio) sobras.forEach(function (s) { salida.sobras.push(sobraDeTutorias_(s, cols, dentro, filas, sitio)); });
  const lineas = filas.map(lineaDeFilaTutorias_);
  if (enlace && filas.length) enlace.siguiente = { fila: filas[filas.length - 1], linea: lineas[lineas.length - 1], gastada: false };
  return lineas;
}

/* El día siguiente, en AAAA-MM-DD. */
function diaSiguienteTutorias_(dia) {
  const d = new Date(dia + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/* Los días en que algo cambia (una línea empieza o termina): sin ellos, lo de «hoy» no se mueve. */
function diasDeCambioTutorias_(lineas) {
  const dias = {};
  lineas.forEach(function (l) { if (l.desde) { dias[l.desde] = true; dias[diaSiguienteTutorias_(l.hasta)] = true; } });
  return Object.keys(dias).sort();
}

function hojaFechaGeneracion_(hojas) {
  for (let h = 0; h < hojas.length; h++) {
    for (let i = 0; i < hojas[h].length; i++) {
      if (hojas[h][i].g && /^fecha generaci/i.test(hojas[h][i].t.trim()) && hojas[h][i + 1]) {
        const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(hojas[h][i + 1].t);
        if (m) return m[3] + '-' + m[2] + '-' + m[1];
      }
    }
  }
  return '';
}

/* El lector: el PDF de la función tutorial. { lector, clave, variante, huella, curso, generado, hojas, tablas, lineas: [{ unidad, empleado, sustituto, documento, periodo, desde?, hasta? }],
   sobran, sobras: [lo que sobra, con su sitio: ver HechosTutoriasSobras.gs], cambios: [días], problema }. Un PDF se lee entero o no se lee: si algo no cuadra queda dicho y la parte no lo usa. */
function leerTutorias_(bytes, fuente, huella, conj, entrada) {
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, curso: '', generado: '', hojas: 0, tablas: 0, lineas: [], sobran: 0, sobras: [], cambios: [], problema: '' };
  const pdf = pdfTextos_(bytes);
  if (!pdf.ok) { salida.problema = pdf.motivo; return salida; }
  salida.hojas = pdf.hojas.length;
  const todo = pdf.hojas.map(function (h) { return h.filter(function (t) { return !t.g; }).map(function (t) { return t.t; }).join(' '); }).join(' ');
  const c = /curso\s+escolar\s+(\d{4})\s*\/\s*(\d{4})/i.exec(todo);
  if (c && +c[2] === +c[1] + 1) salida.curso = c[1].slice(-2) + '-' + c[2].slice(-2);
  salida.generado = hojaFechaGeneracion_(pdf.hojas);
  let deLaHojaAnterior = null;
  pdf.hojas.forEach(function (hoja, hojaN) {
    const claros = hoja.filter(function (t) { return !t.g && t.y >= TUTORIAS_MARGEN_INFERIOR_ && t.t.trim() !== ''; });
    const tablas = tablasDeHojaTutorias_(claros);
    let ultimaDeLaHoja = null;
    const cuerpo = claros.filter(function (t) { return !t.neg; });
    tablas.forEach(function (tb, i) {
      const sig = tablas[i + 1];
      const suyos = cuerpo.filter(function (t) { return t.y < tb.y - 0.5 && (!sig || t.y > sig.y + 0.5); });
      const enlace = { ultima: i === 0 ? deLaHojaAnterior : null, siguiente: null };
      lineasDeTablaTutorias_(tb.cols, suyos, salida, { hoja: hojaN + 1, hojas: pdf.hojas.length, tabla: salida.tablas + 1 }, enlace).forEach(function (l) { salida.lineas.push(l); });
      salida.tablas++;
      if (enlace.siguiente) ultimaDeLaHoja = enlace.siguiente;
    });
    deLaHojaAnterior = ultimaDeLaHoja;
  });
  salida.sobran = salida.sobras.length;
  salida.cambios = diasDeCambioTutorias_(salida.lineas);
  return salida;
}

/* ¿Sirve el fichero leído para el curso de su ficha? { usable, frases }: las frases llanas (sin nombres) de lo que deja dicho. */
function estadoDeFicheroTutorias_(l, curso) {
  if (l.problema) return { usable: false, frases: ['No se ha podido leer el listado. ' + l.problema] };
  if (l.curso && l.curso !== curso) return { usable: false, frases: ['El listado dice que es del curso ' + l.curso + ' pero está guardado como del curso ' + curso + ': no se ha usado.'] };
  if (!l.tablas) return { usable: false, frases: ['El listado no trae ninguna tabla de tutores.'] };
  if (l.sobran) return { usable: false, frases: ['El listado trae ' + l.sobran + (l.sobran === 1 ? ' texto' : ' textos') + ' que no se han sabido colocar: no se ha usado.'] };
  const malas = l.lineas.filter(function (x) { return !x.desde; }).length;
  return { usable: true, frases: malas ? ['Trae ' + malas + (malas === 1 ? ' línea sin periodo o con un periodo que no se entiende.' : ' líneas sin periodo o con un periodo que no se entiende.')] : [] };
}

function claveDePersonaTutorias_(l) { return l.documento ? idDePersonal_(l.documento) : 'n:' + normalizarAlumno_(l.empleado); }

/* Quién está en vigor hoy en un grupo y si hay hueco. `lineas` = las del grupo ({ desde?, hasta?, ... }). */
function vigorDeGrupoTutorias_(lineas, hoy) {
  const enVigor = lineas.filter(function (l) { return l.desde && l.desde <= hoy && hoy <= l.hasta; });
  const personas = {};
  enVigor.forEach(function (l) { personas[claveDePersonaTutorias_(l)] = true; });
  const acabo = lineas.some(function (l) { return l.hasta && l.hasta < hoy; }), empieza = lineas.some(function (l) { return l.desde && l.desde > hoy; });
  return { enVigor: enVigor, personas: Object.keys(personas).length, hueco: !enVigor.length && acabo && empieza };
}

function tutorDeTutorias_(l, hoy, enPersonal) {
  const n = partirEmpleado_(l.empleado);
  const x = {};
  if (l.documento) { x.id = idDePersonal_(l.documento); x.documento = l.documento; }
  x.empleado = l.empleado;
  if (n.apellidos) { x.apellidos = n.apellidos; x.nombre = n.nombre; }
  if (l.periodo) x.periodo = l.periodo;
  if (l.desde) { x.desde = l.desde; x.hasta = l.hasta; }
  x.sustituto = !!l.sustituto;
  x.hoy = !!(l.desde && l.desde <= hoy && hoy <= l.hasta);
  if (enPersonal !== null) x.enPersonal = !!(l.documento && enPersonal[idDePersonal_(l.documento)]);
  return x;
}

/* La parte de un curso. `ctx` = { hoy, personal: { id: true } | null, alumnado: { unidad normalizada: { unidad, alumnos } } | null }. */
function montarTutorias_(conj, parte, leido, ctx) {
  const avisos = [], registros = [], sinGrupo = [];
  const est = estadoDeFicheroTutorias_(leido, parte.cursoEscolar);
  est.frases.forEach(function (d) { avisos.push({ tipo: 'tutoria-fichero', id: null, datos: { detalle: d } }); });
  const personal = ctx.personal, alumnado = ctx.alumnado;
  if (est.usable) {
    const grupos = {}, orden = [], faltan = {}, ordenFaltan = [];
    leido.lineas.forEach(function (l) {
      if (!l.documento) avisos.push({ tipo: 'tutoria-sin-id', id: null, datos: { unidad: l.unidad || null, empleado: l.empleado || null, periodo: l.periodo || null } });
      else if (personal && !personal[idDePersonal_(l.documento)] && !faltan[idDePersonal_(l.documento)]) {
        faltan[idDePersonal_(l.documento)] = { empleado: l.empleado, unidad: l.unidad || '' };
        ordenFaltan.push(idDePersonal_(l.documento));
      }
      if (!l.unidad) { sinGrupo.push(l); return; }
      if (!grupos[l.unidad]) { grupos[l.unidad] = []; orden.push(l.unidad); }
      grupos[l.unidad].push(l);
    });
    orden.forEach(function (u) {
      const lineas = grupos[u].map(function (l, i) { return [l, i]; })
        .sort(function (a, b) { const x = a[0].desde || '9999', y = b[0].desde || '9999'; return x < y ? -1 : (x > y ? 1 : a[1] - b[1]); }).map(function (p) { return p[0]; });
      const v = vigorDeGrupoTutorias_(lineas, ctx.hoy);
      const datos = { unidad: u, tutores: lineas.map(function (l) { return tutorDeTutorias_(l, ctx.hoy, personal); }) };
      if (v.personas === 1) {
        datos.tutorHoy = v.enVigor[0].empleado;
        if (v.enVigor[0].documento) datos.tutorHoyId = idDePersonal_(v.enVigor[0].documento);
      }
      if (v.personas > 1) avisos.push({ tipo: 'tutoria-dos-tutores-hoy', id: null, datos: { unidad: u } });
      if (v.hueco) avisos.push({ tipo: 'tutoria-hueco-hoy', id: null, datos: { unidad: u } });
      registros.push({ id: u, datos: datos });
    });
    ordenFaltan.forEach(function (id) { avisos.push({ tipo: 'tutoria-no-esta-en-personal', id: id, datos: faltan[id] }); });
    if (alumnado) {
      const tienen = {};
      orden.forEach(function (u) { tienen[normalizarAlumno_(u)] = true; });
      Object.keys(alumnado).sort().forEach(function (k) { if (!tienen[k]) avisos.push({ tipo: 'tutoria-grupo-sin-tutor', id: null, datos: { unidad: alumnado[k].unidad, alumnos: alumnado[k].alumnos } }); });
    }
  }
  const o = { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: parte.parte, cursoEscolar: parte.cursoEscolar, generado: ahoraMadrid_(), origen: DUENO_CD_, hoy: ctx.hoy };
  if (est.usable && leido.generado) o.listadoDel = leido.generado;
  o.personalMirado = !!personal; o.alumnadoMirado = !!alumnado;
  o.funcionesSinGrupo = sinGrupo.map(function (l) { return tutorDeTutorias_(l, ctx.hoy, personal); });
  o.campos = camposPublicos_(conj, false); o.registros = registros; o.avisos = avisos;
  return o;
}

/* ¿Alguna parte tiene un día de cambio por venir? Mientras sea así queda el testigo en entrada/, para que la vuelta de los 10 minutos siga viniendo aunque nadie suelte nada. */
function hayCambiosPorVenir_(indice, avance) {
  const hoy = hoyMadrid_();
  if (hayCambiosPorVenirConsejo_(avance)) return true;
  return (indice.hechos || []).some(function (h) {
    const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === h.conjunto; })[0];
    const l = conj && conj.conDias && conj.fuentes.length ? avance.leidos[conj.fuentes[0].clave + '/' + h.cursoEscolar] : null;
    return !!l && (l.cambios || []).some(function (d) { return d > hoy; });
  });
}

function hoyMadrid_() { return ahoraMadrid_().slice(0, 10); }

/* El día con que se monta cada parte. En la aplicación de hoy no hay días prestados: es el de hoy. El ensayo de la página nueva (fila 57) presta, por ruta, el `hoy` de la parte equivalente de la aplicación de hoy,
   para que las dos decidan igual quién es el tutor, el miembro o el ocupante de hoy. */
let DIAS_PRESTADOS_ = {};
function prestarDias_(mapa) { DIAS_PRESTADOS_ = mapa || {}; }
function hoyDeParte_(ruta) { return DIAS_PRESTADOS_[ruta] || hoyMadrid_(); }

/* La parte de otro conjunto del mismo curso que figura en el índice, o null. */
function parteVecinaTutorias_(indice, conjunto, curso, parte) {
  return (indice.hechos || []).filter(function (h) { return h.conjunto === conjunto && h.cursoEscolar === curso && h.parte === parte; })[0] || null;
}

function abrirParteVecina_(h, cache) {
  const k = 'parte:' + h.ruta + ':' + h.huella;
  if (!cache[k]) cache[k] = JSON.parse(ficheroDeEntrada_(h).getBlob().getDataAsString('UTF-8'));
  return cache[k];
}

/* Lo que se mira de la parte del personal y de la `actuales` del alumnado de un curso: ids de personas y alumnos matriculados por grupo. Null si no hay parte. */
function vecinasDeTutorias_(indice, curso, cache) {
  const hp = parteVecinaTutorias_(indice, 'personal', curso, 'curso'), ha = parteVecinaTutorias_(indice, 'alumnado', curso, 'actuales');
  let personal = null, alumnado = null;
  if (hp) { personal = {}; abrirParteVecina_(hp, cache).registros.forEach(function (r) { personal[r.id] = true; }); }
  if (ha) {
    alumnado = {};
    abrirParteVecina_(ha, cache).registros.forEach(function (r) {
      const u = r.datos.unidad;
      if (!r.matriculado || !u) return;
      const k = normalizarAlumno_(u);
      if (!alumnado[k]) alumnado[k] = { unidad: u, alumnos: 0 };
      alumnado[k].alumnos++;
    });
  }
  return { personal: personal, alumnado: alumnado };
}

/* Lo que cambia el montaje además de los listados: la huella de las dos partes que mira y cuántos de los días de cambio del listado han pasado ya. */
function claveDeMontajeTutorias_(conj, parte, necesarias, indice, avance, hoy) {
  const hp = parteVecinaTutorias_(indice, 'personal', parte.cursoEscolar, 'curso'), ha = parteVecinaTutorias_(indice, 'alumnado', parte.cursoEscolar, 'actuales');
  const x = necesarias.filter(function (n) { return n.entrada.cursoEscolar === parte.cursoEscolar; })[0];
  const dias = (x && avance.leidos[x.k] && avance.leidos[x.k].cambios) || [];
  return conj.versionMontador + '|' + conj.fuentes[0].versionLector + '|' + (hp ? hp.huella : '') + '|' + (ha ? ha.huella : '') + '|' + dias.filter(function (d) { return d <= hoy; }).length;
}

function montarParteDeTutorias_(raiz, t, avance, cache, indice) {
  const t0 = new Date().getTime();
  const x = t.necesarias.filter(function (n) { return n.entrada.cursoEscolar === t.parte.cursoEscolar; })[0];
  if (!x) return;
  const leido = cargarLeido_(raiz, x.k);
  if (!leido || !avance.leidos[x.k] || leido.huella !== avance.leidos[x.k].huella) { delete avance.leidos[x.k]; return; }
  const v = vecinasDeTutorias_(indice, t.parte.cursoEscolar, cache);
  cerrarMontaje_(raiz, t, avance, montarTutorias_(t.conj, t.parte, leido, { hoy: hoyDeParte_(t.ruta), personal: v.personal, alumnado: v.alumnado }), t0);
}

/* ==== HechosTutoriasSobras.gs ==== */
/* Los textos de un listado de tutorías que no se han sabido colocar (fila 28). Son nombres de trabajadores: viven solo en _interno/leido/ y en lo que se manda a la página.
   Hacia fuera (comprobación `tutorias-sobras`) solo sale su forma, sin letras. */

const TUTORIAS_COLUMNAS_ = ['unidad', 'empleado', 'documento', 'periodo'];
const TUTORIAS_TITULO_COLUMNA_ = { unidad: 'Unidad', empleado: 'Empleado/a', documento: 'D.N.I.', periodo: 'Periodo' };
const TUTORIAS_SOBRAS_POR_CURSO_ = 5;

function redondeoTutorias_(v) { return Math.round(v * 10) / 10; }

/* Un texto de sobra con todo su sitio. `s` = { it, previoY }; `dentro` = [{ it, col }] de la tabla; `filas` = las filas leídas de la tabla; `sitio` = { hoja, hojas, tabla }. */
function sobraDeTutorias_(s, cols, dentro, filas, sitio) {
  const it = s.it;
  const titulo = cols.filter(function (c) { return c.clave === it.col; })[0];
  let encima = null, debajo = null;
  filas.forEach(function (f) {
    if (f.y > it.y && (!encima || f.y < encima.y)) encima = f;
    if (f.y < it.y && (!debajo || f.y > debajo.y)) debajo = f;
  });
  const aSuAltura = TUTORIAS_COLUMNAS_.filter(function (k) {
    return dentro.some(function (d) { return d.it !== it && d.col === k && Math.abs(d.it.y - it.y) <= 1; });
  });
  return {
    hoja: sitio.hoja, hojas: sitio.hojas, tabla: sitio.tabla, columnas: cols.length, columna: it.col,
    t: it.t, x: it.x, y: it.y, desdeLaColumna: titulo ? redondeoTutorias_(it.x - titulo.x) : 0,
    bajoLaAnterior: encima ? redondeoTutorias_(encima.y - it.y) : null, sobreLaSiguiente: debajo ? redondeoTutorias_(it.y - debajo.y) : null,
    bajoElUltimoRenglon: s.previoY === null ? null : redondeoTutorias_(s.previoY - it.y), renglonesDeLaAnterior: encima ? encima.nombre.length - 1 : 0,
    filas: filas.length, aSuAltura: aSuAltura,
    filaAnterior: encima ? { unidad: encima.unidad, empleado: encima.nombre.join(' ').replace(/\s+/g, ' ').trim(), documento: encima.documento, periodo: encima.periodo } : null
  };
}

/* Los cursos de tutorías con textos de sobra, del más reciente al más antiguo: [{ curso, sobran, sobras }]. Solo abre los ficheros leídos que lo apuntan en el avance. */
function sobrasDeTutorias_(raiz, avance) {
  const cursos = Object.keys(avance.leidos).filter(function (k) { return /^tutorias\/\d\d-\d\d$/.test(k) && avance.leidos[k].sobran > 0; })
    .map(function (k) { return k.split('/')[1]; }).sort(function (a, b) { return anioDeCurso_(b) - anioDeCurso_(a); });
  return cursos.map(function (c) {
    const l = cargarLeido_(raiz, 'tutorias/' + c);
    return { curso: c, sobran: l ? l.sobran || 0 : 0, sobras: l ? l.sobras || [] : [] };
  });
}

/* Las líneas que enseña la página (solo ahí): una por texto, hasta 5 por curso. */
function sobrasTutoriasPagina_(raiz) {
  const lineas = [];
  sobrasDeTutorias_(raiz, leerAvance_(raiz)).forEach(function (x) {
    const pre = 'Tutorías del curso ' + x.curso + ': el listado no se usa. ';
    x.sobras.slice(0, TUTORIAS_SOBRAS_POR_CURSO_).forEach(function (s) {
      let sitio = ' · hoja ' + s.hoja + ' de ' + s.hojas + ' · columna «' + (TUTORIAS_TITULO_COLUMNA_[s.columna] || s.columna) + '» · ';
      if (s.filaAnterior) sitio += 'debajo de la fila de «' + [s.filaAnterior.unidad, s.filaAnterior.empleado].filter(function (v) { return v; }).join(' · ') + '»';
      else sitio += 'encima de la primera fila de la tabla';
      lineas.push(pre + 'No sé colocar este texto: «' + s.t + '»' + sitio);
    });
    const mas = x.sobran - Math.min(x.sobras.length, TUTORIAS_SOBRAS_POR_CURSO_);
    if (mas > 0) lineas.push(pre + 'y ' + mas + ' más en este listado');
  });
  return lineas;
}

/* ==== HechosConsejo.gs ==== */
/* El conjunto `consejo-escolar` (fila 22): los miembros del Consejo Escolar, por periodo y en un historial único. Las reglas de lectura son las del Gestor de asuntos.
   Lleva nombres de personas (parte de ellas, menores y familias): lo leído vive en _interno/leido/ y las partes y los avisos solo en Drive. Nunca sale de aquí un nombre, un sector ni un cargo. */

const PARTICULAS_CONSEJO_ = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e'];

/* Los títulos de las cuatro columnas, ya normalizados (sin HTML ni asteriscos), en el orden en que vienen. null si falta alguna.
   Sector y miembro por su título; nombramiento y cese, por contener la palabra. */
function columnasDeConsejo_(tn) {
  const c = { sector: tn.indexOf('sector'), miembro: -1, nombramiento: -1, cese: -1 };
  tn.forEach(function (t, j) {
    if (c.miembro === -1 && ['miembro', 'miembros', 'miembro(s)'].indexOf(t) !== -1) c.miembro = j;
    else if (c.nombramiento === -1 && t.indexOf('nombramiento') !== -1) c.nombramiento = j;
    else if (c.cese === -1 && t.indexOf('cese') !== -1) c.cese = j;
  });
  return Object.keys(c).some(function (k) { return c[k] === -1; }) ? null : c;
}

/* «dd/mm/aaaa» → «AAAA-MM-DD»; null si no es una fecha de verdad. */
function fechaDeConsejo_(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(texto || '').trim());
  if (!m) return null;
  const dt = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  if (dt.getUTCFullYear() !== +m[3] || dt.getUTCMonth() !== +m[2] - 1 || dt.getUTCDate() !== +m[1]) return null;
  return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}

/* El curso de un día AAAA-MM-DD (empieza el 1 de septiembre). */
function cursoDeDiaConsejo_(dia) {
  const a = +dia.slice(0, 4), mes = +dia.slice(5, 7);
  return parDeCursos_(mes >= 9 ? a : a - 1);
}

function periodoValidoConsejo_(p) { return /^\d{4}-\d{4}$/.test(String(p || '')); }

/* El curso de un periodo: el de su primer año. */
function cursoDePeriodoConsejo_(periodo) { return parDeCursos_(+String(periodo).slice(0, 4)); }

/* El lector: guarda los títulos de las cuatro columnas tal como vienen y, de cada fila con miembro, sus cuatro casillas en ese mismo orden. Un fichero que no sirve no rompe nada.
   { lector, clave, variante, huella, columnas: [título…], orden: ['sector'…], filas: [[casilla…]], sinMiembro, fechasRaras, cursosBusqueda: [curso…], problema: '' | 'vacio' | 'ilegible' | 'faltan-columnas' } */
function leerConsejo_(bytes, fuente, huella, conj, entrada) {
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, columnas: [], orden: [], filas: [], sinMiembro: 0, fechasRaras: 0, cursosBusqueda: [], problema: '' };
  let tabla = [];
  try { const texto = bytesATexto_(bytes); tabla = leerCsv_(texto, detectarSeparador_(texto)); } catch (e) { salida.problema = 'ilegible'; return salida; }
  if (tabla.length < 2) { salida.problema = 'vacio'; return salida; }
  const c = columnasDeConsejo_(tabla[0].map(normalizarTitulo_));
  if (!c) { salida.problema = 'faltan-columnas'; return salida; }
  const claves = Object.keys(c).sort(function (a, b) { return c[a] - c[b]; });
  salida.orden = claves;
  salida.columnas = claves.map(function (k) { return String(tabla[0][c[k]]).trim(); });
  const cursos = {};
  if (periodoValidoConsejo_(salida.variante)) cursos[cursoDePeriodoConsejo_(salida.variante)] = true;
  for (let f = 1; f < tabla.length; f++) {
    const celdas = claves.map(function (k) { return String(tabla[f][c[k]] === undefined ? '' : tabla[f][c[k]]).trim(); });
    if (!celdas.some(function (x) { return x; })) continue;
    if (!celdas[claves.indexOf('miembro')]) { salida.sinMiembro++; continue; }
    ['nombramiento', 'cese'].forEach(function (k) {
      const t = celdas[claves.indexOf(k)];
      if (!t) return;
      const d = fechaDeConsejo_(t);
      if (!d) salida.fechasRaras++; else if (k === 'nombramiento') cursos[cursoDeDiaConsejo_(d)] = true;
    });
    salida.filas.push(celdas);
  }
  salida.cursosBusqueda = Object.keys(cursos).sort();
  return salida;
}

/* Lo que un fichero deja dicho al leerlo, en una frase llana (sin nombres ni títulos). */
function frasesDeFicheroConsejo_(l) {
  if (l.problema === 'vacio') return ['El listado está vacío.'];
  if (l.problema === 'ilegible') return ['No se ha podido leer el listado.'];
  if (l.problema === 'faltan-columnas') return ['Al listado le falta una de las cuatro columnas (sector, miembro, nombramiento o cese) y no se ha usado.'];
  const f = [];
  if (l.sinMiembro) f.push('Trae ' + l.sinMiembro + (l.sinMiembro === 1 ? ' fila sin miembro.' : ' filas sin miembro.'));
  if (l.fechasRaras) f.push('Trae ' + l.fechasRaras + (l.fechasRaras === 1 ? ' fecha que no se entiende.' : ' fechas que no se entienden.'));
  return f;
}

/* ¿Tiene letras y todas son mayúsculas? */
function enMayusculasConsejo_(t) { return t !== t.toLowerCase() && t === t.toUpperCase(); }

/* «PÉREZ-GIL DE LA CRUZ» → «Pérez-Gil de la Cruz». */
function tipoTituloConsejo_(t) {
  return t.toLowerCase().split(' ').map(function (w, i) {
    if (i > 0 && PARTICULAS_CONSEJO_.indexOf(w) !== -1) return w;
    return w.split('-').map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join('-');
  }).join(' ');
}

function limpioConsejo_(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }

/* Un texto entero en mayúsculas pasa a tipo título; el resto se deja como viene. */
function nombrePropioConsejo_(t) { t = limpioConsejo_(t); return t && enMayusculasConsejo_(t) ? tipoTituloConsejo_(t) : t; }

/* Quita «(cargo)» del final de un texto: { texto, cargo } (cargo '' si no hay). */
function sacarCargoConsejo_(t) {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(limpioConsejo_(t));
  return m ? { texto: m[1].trim(), cargo: limpioConsejo_(m[2]) } : { texto: limpioConsejo_(t), cargo: '' };
}

/* Apellidos y nombre juntos, sin tildes, en minúsculas, «Mª» como «maria», sin signos, y las palabras ordenadas: dos personas son la misma solo si sale lo mismo. */
function claveNombreConsejo_(texto) {
  const s = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/(^|[^a-z0-9])mª(?![a-z0-9])/g, '$1maria').replace(/[^a-z0-9]+/g, ' ').trim();
  return s ? s.split(' ').sort().join(' ') : '';
}

function sinTildesConsejo_(t) { return limpioConsejo_(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

/* Las cuatro casillas de una fila a un registro. `orden` = el de las columnas del fichero. */
function registroDeConsejo_(orden, celdas, columnas) {
  const v = {};
  orden.forEach(function (k, i) { v[k] = celdas[i]; });
  const delSector = sacarCargoConsejo_(v.sector), delMiembro = sacarCargoConsejo_(v.miembro);
  const cargoCrudo = delSector.cargo || delMiembro.cargo;
  const cargo = cargoCrudo && enMayusculasConsejo_(cargoCrudo) ? cargoCrudo.charAt(0) + cargoCrudo.slice(1).toLowerCase() : cargoCrudo;
  const sector = nombrePropioConsejo_(delSector.texto);
  const coma = delMiembro.texto.indexOf(',');
  const apellidos = nombrePropioConsejo_(coma === -1 ? delMiembro.texto : delMiembro.texto.slice(0, coma));
  const nombre = coma === -1 ? '' : nombrePropioConsejo_(delMiembro.texto.slice(coma + 1));
  const nombramiento = fechaDeConsejo_(v.nombramiento), cese = fechaDeConsejo_(v.cese);
  const claveNombre = claveNombreConsejo_(apellidos + ' ' + nombre);
  const fecha = v.nombramiento ? (nombramiento || 'ilegible') : 'nato';
  const datos = {};
  datos.miembro = nombre ? apellidos + ', ' + nombre : apellidos;
  if (apellidos) datos.apellidos = apellidos;
  if (nombre) datos.nombre = nombre;
  if (claveNombre) datos.claveNombre = claveNombre;
  if (sector) datos.sector = sector;
  if (cargo) datos.cargo = cargo;
  if (nombramiento) datos.nombramiento = nombramiento;
  if (cese) datos.cese = cese;
  if (!v.nombramiento) datos.nato = true;
  return { id: [claveNombre, sinTildesConsejo_(sector), sinTildesConsejo_(cargo), fecha].join('|'), datos: datos, celdas: columnas.map(function (t, i) { return { columna: t, valor: celdas[i] }; }).filter(function (x) { return x.valor; }) };
}

/* La parte de un periodo, sin la unión con las fichas (eso lo hace HechosConsejoUnir.gs con `ctx.buscar`).
   `ctx` = { buscar(donde, curso, claveNombre) → { mirado, ids } , igualQue: periodo con el mismo contenido o '' }. */
function montarConsejoPeriodo_(conj, parte, leido, ctx) {
  const avisos = [], registros = [], porId = {};
  frasesDeFicheroConsejo_(leido).forEach(function (d) { avisos.push({ tipo: 'consejo-fichero', id: null, datos: { detalle: d } }); });
  if (ctx.igualQue) avisos.push({ tipo: 'consejo-fichero', id: null, datos: { detalle: 'El listado tiene el mismo contenido que el del periodo ' + ctx.igualQue + '.' } });
  let repetidas = 0;
  if (!leido.problema) {
    leido.filas.forEach(function (celdas) {
      const r = registroDeConsejo_(leido.orden, celdas, leido.columnas);
      if (porId[r.id]) {
        repetidas++;
        if (r.datos.cese) { porId[r.id].datos.cese = r.datos.cese; porId[r.id].celdas = r.celdas; }
        return;
      }
      porId[r.id] = r; registros.push(r);
    });
  }
  if (repetidas) avisos.push({ tipo: 'consejo-fichero', id: null, datos: { detalle: 'Trae ' + repetidas + (repetidas === 1 ? ' fila repetida.' : ' filas repetidas.') } });
  const finPeriodo = (+parte.periodo.slice(5, 9)) + '-08-31';
  const mirado = { personal: false, alumnado: false };
  const salida = registros.map(function (r) {
    const d = r.datos, busca = buscaSectorConsejo_(d.sector || '');
    if (busca.donde) {
      const curso = d.nombramiento ? cursoDeDiaConsejo_(d.nombramiento) : cursoDePeriodoConsejo_(parte.periodo);
      const x = ctx.buscar(busca.donde, curso, d.claveNombre || '');
      if (x.mirado) {
        mirado[busca.donde] = true;
        if (x.ids.length === 1) { d.fichaConjunto = busca.donde; d.fichaId = x.ids[0]; }
        else if (!x.ids.length) avisos.push({ tipo: 'consejo-sin-ficha', id: null, datos: { miembro: d.miembro, sector: d.sector || null, dondeSeBusco: busca.donde, curso: curso } });
        else avisos.push({ tipo: 'consejo-ficha-dudosa', id: null, datos: { miembro: d.miembro, sector: d.sector || null, coinciden: x.ids.length } });
      }
    }
    if (d.nombramiento && d.nombramiento > finPeriodo) {
      avisos.push({ tipo: 'consejo-fuera-de-periodo', id: null, datos: { miembro: d.miembro, sector: d.sector || null, nombramiento: d.nombramiento, periodo: parte.periodo, detalle: 'posterior' } });
    }
    if (r.celdas.length) d.celdas = r.celdas;
    return { id: r.id, datos: d };
  });
  return { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: 'periodo', periodo: parte.periodo, cursoEscolar: '', generado: ahoraMadrid_(), origen: DUENO_CD_,
    columnasConsejo: leido.columnas, personalMirado: mirado.personal, alumnadoMirado: mirado.alumnado, campos: camposPublicos_(conj, false, 'periodo'), registros: salida, avisos: avisos };
}

/* ==== HechosConsejoUnir.gs ==== */
/* El Consejo Escolar, parte `periodo` (fila 22): de qué listados vive, con qué se une cada miembro y cuándo se rehace. Los nombres de las personas solo pasan por la memoria de una tanda. */

/* Dónde se busca a un miembro según su sector (sin tildes y en minúsculas, vale la primera línea que encaje). `busca` vacío: en ningún sitio.
   Un sector nuevo es una línea más. */
const SECTORES_CONSEJO_ = [
  { contiene: ['madre', 'padre', 'tutor', 'ayuntamiento', 'ampa'], busca: '' },
  { contiene: ['alumn'], busca: 'alumnado' },
  { contiene: ['profesor', 'equipo directivo', 'igualdad', 'personal'], busca: 'personal' }
];

/* { donde: 'personal' | 'alumnado' | '', conocido: ¿lo trae la tabla? } */
function buscaSectorConsejo_(sector) {
  const s = sinTildesConsejo_(sector);
  const linea = SECTORES_CONSEJO_.filter(function (l) { return l.contiene.some(function (x) { return s.indexOf(x) !== -1; }); })[0];
  return linea ? { donde: linea.busca, conocido: true } : { donde: '', conocido: false };
}

/* Los listados del Consejo del índice, con o sin periodo, por periodo. Cada uno: { fuente, entrada, k }. */
function fuentesDeConsejo_(indice, conj) {
  const f = conj.fuentes[0];
  return indice.listados.filter(function (e) { return e.clave === f.clave && !e.porAlumno; })
    .sort(function (a, b) { return (a.variante || '') < (b.variante || '') ? -1 : ((a.variante || '') > (b.variante || '') ? 1 : 0); })
    .map(function (e) { return { fuente: f, entrada: e, k: claveLeido_(e.clave, e.variante) }; });
}

/* Una parte por cada periodo con listado (del más reciente al más viejo) y, si hay alguna, el historial detrás. */
function partesDeConsejo_(necesarias) {
  const vistos = {};
  necesarias.forEach(function (x) { if (periodoValidoConsejo_(x.entrada.variante)) vistos[x.entrada.variante] = true; });
  const periodos = Object.keys(vistos).sort().reverse();
  const partes = periodos.map(function (p) { return { parte: 'periodo', periodo: p, cursoEscolar: '', anio: 0 }; });
  return periodos.length ? partes.concat([{ parte: 'historial', periodo: '', cursoEscolar: '', anio: 0 }]) : [];
}

function fuenteDeParteConsejo_(x, avance) { return { clave: x.entrada.clave, variante: x.entrada.variante || '', huella: (avance.leidos[x.k] || {}).huella || '' }; }

/* Las fuentes de una parte: el listado de su periodo; el historial, todos los del Consejo (también los que no dicen su periodo). */
function fuentesDeParteConsejo_(parte, necesarias, avance) {
  return necesarias.filter(function (x) { return parte.parte === 'historial' || x.entrada.variante === parte.periodo; }).map(function (x) { return fuenteDeParteConsejo_(x, avance); });
}

function partesDelConjunto_(indice, conjunto, tipo) { return (indice.hechos || []).filter(function (h) { return h.conjunto === conjunto && (!tipo || h.parte === tipo); }); }

/* Los días de cambio de las partes de un conjunto (`avance.dias` los guarda por ruta), sin repetir y en orden. */
function diasDeConjunto_(avance, conjunto) {
  const dias = {};
  Object.keys(avance.dias || {}).filter(function (r) { return r.indexOf('hecho/' + conjunto + '/') === 0; }).forEach(function (r) { avance.dias[r].forEach(function (d) { dias[d] = true; }); });
  return Object.keys(dias).sort();
}

function diasDeConsejo_(avance) { return diasDeConjunto_(avance, 'consejo-escolar'); }

/* Lo que cambia el montaje además de los listados. Periodo: el número del montador y del lector, la huella de las partes del personal de los cursos que mira y la de las partes del alumnado.
   Historial: la huella de cada parte `periodo` y cuántos de los días de cambio han pasado ya. */
function claveDeMontajeConsejo_(conj, parte, necesarias, indice, avance, hoy) {
  const base = conj.versionMontador + '|' + conj.fuentes[0].versionLector + '|';
  if (parte.parte === 'historial') {
    return base + partesDelConjunto_(indice, conj.conjunto, 'periodo').map(function (h) { return h.ruta + ':' + h.huella; }).sort().join(',') + '|' + diasDeConsejo_(avance).filter(function (d) { return d <= hoy; }).length;
  }
  const x = necesarias.filter(function (n) { return n.entrada.variante === parte.periodo; })[0];
  const cursos = (x && avance.leidos[x.k] && avance.leidos[x.k].cursosBusqueda) || [];
  const personal = cursos.map(function (c) { const h = parteVecinaTutorias_(indice, 'personal', c, 'curso'); return c + ':' + (h ? h.huella : ''); });
  const alumnado = partesDelConjunto_(indice, 'alumnado').map(function (h) { return h.ruta + ':' + h.huella; }).sort();
  return base + personal.join(',') + '|' + alumnado.join(',');
}

/* Los ids (en su conjunto) de quien tiene esa claveNombre en el personal del curso. { mirado: ¿había parte de personal de ese curso?, ids } */
function buscarPersonalConsejo_(indice, cache, curso, clave) {
  const hp = parteVecinaTutorias_(indice, 'personal', curso, 'curso');
  if (!hp) return { mirado: false, ids: [] };
  const k = 'idxPersonalConsejo:' + hp.ruta + ':' + hp.huella;
  if (!cache[k]) {
    const m = {};
    abrirParteVecina_(hp, cache).registros.forEach(function (r) {
      const d = r.datos, c = claveNombreConsejo_(d.apellidos && d.nombre ? d.apellidos + ' ' + d.nombre : d.empleado);
      if (!c) return;
      m[c] = m[c] || [];
      if (m[c].indexOf(r.id) === -1) m[c].push(r.id);
    });
    cache[k] = m;
  }
  return { mirado: true, ids: cache[k][clave] || [] };
}

/* Igual, en todas las partes del alumnado: cuenta quien tiene una línea de ese curso en su trayectoria, una vez cada alumno. Solo guarda un índice, no la parte entera. */
function buscarAlumnadoConsejo_(indice, cache, curso, clave) {
  const partes = partesDelConjunto_(indice, 'alumnado');
  if (!partes.length) return { mirado: false, ids: [] };
  const ids = [];
  partes.forEach(function (h) {
    const k = 'idxAlumnadoConsejo:' + h.ruta + ':' + h.huella;
    if (!cache[k]) {
      const m = {};
      JSON.parse(ficheroDeEntrada_(h).getBlob().getDataAsString('UTF-8')).registros.forEach(function (r) {
        const d = r.datos, c = claveNombreConsejo_([d.apellido1, d.apellido2, d.nombre].filter(String).join(' '));
        if (!c) return;
        (m[c] = m[c] || []).push([r.id, (d.trayectoria || []).map(function (t) { return t.ano; })]);
      });
      cache[k] = m;
    }
    (cache[k][clave] || []).forEach(function (x) { if (x[1].indexOf(curso) !== -1 && ids.indexOf(x[0]) === -1) ids.push(x[0]); });
  });
  return { mirado: true, ids: ids };
}

/* Los días en que algo cambia en una parte `periodo`: un nombramiento que empieza o un cese que acaba. */
function diasDeParteConsejo_(objeto) {
  const dias = {};
  objeto.registros.forEach(function (r) {
    if (r.datos.nombramiento) dias[r.datos.nombramiento] = true;
    if (r.datos.cese) dias[diaSiguienteTutorias_(r.datos.cese)] = true;
  });
  return Object.keys(dias).sort();
}

/* ¿Queda algún día de cambio por venir en alguna parte (del Consejo o de un conjunto entregado entero)? Mientras sea así queda el testigo en entrada/. */
function hayCambiosPorVenirConsejo_(avance) {
  const hoy = hoyMadrid_();
  return Object.keys(avance.dias || {}).some(function (r) { return avance.dias[r].some(function (d) { return d > hoy; }); });
}

/* La tarea «montar» de una parte del Consejo: la de un periodo o el historial. */
function montarParteDeConsejo_(raiz, t, avance, cache, indice) {
  if (t.parte.parte === 'historial') { montarHistorialConsejo_(raiz, t, avance, cache, indice); return; }
  const t0 = new Date().getTime();
  const x = t.necesarias.filter(function (n) { return n.entrada.variante === t.parte.periodo; })[0];
  if (!x) return;
  const leido = cargarLeido_(raiz, x.k);
  if (!leido || !avance.leidos[x.k] || leido.huella !== avance.leidos[x.k].huella) { delete avance.leidos[x.k]; return; }
  const otro = t.necesarias.filter(function (n) { return n !== x && n.entrada.huella === x.entrada.huella && periodoValidoConsejo_(n.entrada.variante); }).map(function (n) { return n.entrada.variante; }).sort()[0] || '';
  const objeto = montarConsejoPeriodo_(t.conj, t.parte, leido, {
    igualQue: otro,
    buscar: function (donde, curso, clave) { return (donde === 'personal' ? buscarPersonalConsejo_ : buscarAlumnadoConsejo_)(indice, cache, curso, clave); }
  });
  cerrarMontaje_(raiz, t, avance, objeto, t0);
  avance.dias = avance.dias || {};
  avance.dias[t.ruta] = diasDeParteConsejo_(objeto);
}

/* ==== HechosConsejoHistorial.gs ==== */
/* El Consejo Escolar, parte `historial` (fila 22): un registro por nombramiento, juntando todas las partes `periodo`, y quién es miembro hoy. Sale de las partes, no de los ficheros. */

/* ¿Es miembro hoy? Aparece en el listado del último periodo y hoy cae entre su nombramiento y su cese (una fecha que falta no limita). */
function miembroHoyConsejo_(datos, periodos, ultimo, hoy) {
  if (periodos.indexOf(ultimo) === -1) return false;
  if (datos.nombramiento && datos.nombramiento > hoy) return false;
  if (datos.cese && datos.cese < hoy) return false;
  return true;
}

/* `partes` = [{ periodo, obj }] de las partes `periodo`, `sinPeriodo` = cuántos listados del Consejo no dicen su periodo, `hoy` = AAAA-MM-DD. */
function montarConsejoHistorial_(conj, partes, sinPeriodo, hoy) {
  const avisos = [], porId = {}, orden = [];
  const periodos = partes.map(function (p) { return p.periodo; }).sort();
  const ultimo = periodos[periodos.length - 1] || '';
  if (sinPeriodo) avisos.push({ tipo: 'consejo-fichero', id: null, datos: { detalle: sinPeriodo === 1 ? 'Un listado del Consejo Escolar no dice de qué periodo es y no se ha usado.' : sinPeriodo + ' listados del Consejo Escolar no dicen de qué periodo son y no se han usado.' } });
  partes.slice().sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; }).forEach(function (p) {
    p.obj.registros.forEach(function (r) {
      if (!porId[r.id]) { porId[r.id] = []; orden.push(r.id); }
      porId[r.id].push({ periodo: p.periodo, datos: r.datos });
    });
  });
  const registros = orden.map(function (id) {
    const apar = porId[id], ultima = apar[apar.length - 1];
    const d = {};
    Object.keys(ultima.datos).forEach(function (k) { if (k !== 'celdas' && k !== 'cese' && k !== 'fichaConjunto' && k !== 'fichaId') d[k] = ultima.datos[k]; });
    const conCese = apar.filter(function (a) { return a.datos.cese; });
    const ceses = {};
    conCese.forEach(function (a) { ceses[a.datos.cese] = true; });
    if (conCese.length) d.cese = conCese[conCese.length - 1].datos.cese;
    if (Object.keys(ceses).length > 1) {
      avisos.push({ tipo: 'consejo-ceses-distintos', id: null, datos: { miembro: d.miembro, sector: d.sector || null, nombramiento: d.nombramiento || null,
        ceses: conCese.map(function (a) { return { periodo: a.periodo, cese: a.datos.cese }; }) } });
    }
    const fichas = {};
    apar.forEach(function (a) { if (a.datos.fichaId) fichas[a.datos.fichaConjunto + '|' + a.datos.fichaId] = [a.datos.fichaConjunto, a.datos.fichaId]; });
    const claves = Object.keys(fichas);
    if (claves.length === 1) { d.fichaConjunto = fichas[claves[0]][0]; d.fichaId = fichas[claves[0]][1]; }
    else if (claves.length > 1) avisos.push({ tipo: 'consejo-ficha-dudosa', id: null, datos: { miembro: d.miembro, sector: d.sector || null, coinciden: claves.length } });
    d.periodos = apar.map(function (a) { return a.periodo; });
    d.miembroHoy = miembroHoyConsejo_(d, d.periodos, ultimo, hoy);
    if (d.nombramiento && d.nombramiento < d.periodos[0].slice(0, 4) + '-09-01') {
      avisos.push({ tipo: 'consejo-fuera-de-periodo', id: null, datos: { miembro: d.miembro, sector: d.sector || null, nombramiento: d.nombramiento, periodo: d.periodos[0], detalle: 'anterior' } });
    }
    return { id: id, datos: d };
  });
  const clave = function (r) { return (r.datos.nombramiento || r.datos.periodos[0].slice(0, 4) + '-09-01'); };
  registros.sort(function (a, b) {
    const x = clave(a), y = clave(b);
    if (x !== y) return x < y ? -1 : 1;
    const p = normalizarAlumno_(a.datos.apellidos || a.datos.miembro), q = normalizarAlumno_(b.datos.apellidos || b.datos.miembro);
    return p < q ? -1 : (p > q ? 1 : (a.id < b.id ? -1 : 1));
  });
  return { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: 'historial', cursoEscolar: '', generado: ahoraMadrid_(), origen: DUENO_CD_, hoy: hoy, ultimoPeriodo: ultimo, periodos: periodos,
    campos: camposPublicos_(conj, false, 'historial'), registros: registros, avisos: avisos };
}

/* La tarea «montar» del historial: abre las partes `periodo` del índice, lo monta, lo escribe y deja en el avance las cifras de la página. */
function montarHistorialConsejo_(raiz, t, avance, cache, indice) {
  const t0 = new Date().getTime();
  const partes = partesDelConjunto_(indice, t.conj.conjunto, 'periodo').map(function (h) { return { periodo: h.periodo, obj: abrirParteVecina_(h, cache) }; });
  const sinPeriodo = t.necesarias.filter(function (x) { return !periodoValidoConsejo_(x.entrada.variante); }).length;
  const objeto = montarConsejoHistorial_(t.conj, partes, sinPeriodo, hoyDeParte_(t.ruta));
  cerrarMontaje_(raiz, t, avance, objeto, t0);
  avance.consejo = { periodos: objeto.periodos.length, nombramientos: objeto.registros.length, miembrosHoy: objeto.registros.filter(function (r) { return r.datos.miembroHoy; }).length, ultimoPeriodo: objeto.ultimoPeriodo };
}

/* ==== HechosEnteros.gs ==== */
/* Los conjuntos que se entregan enteros (fila 23, empresas): no salen de ningún listado de Séneca sino de la entrega vigente de su dueña, que es siempre la lista entera. Los campos y los registros los dice la
   entrega; aquí no se corrige ni se completa nada. Añadir otro conjunto así es una línea de CONJUNTOS_ con `entregadoPor` (más sus avisos, si son distintos): la fuente, la parte, el estado, la página y las
   comprobaciones de aquí sirven para todos. Pueden llevar datos personales: la entrega leída vive en _interno/leido/ y la parte y los avisos solo en Drive. */

/* La única fuente de estos conjuntos: su entrega. Se lee como un listado más (_interno/leido/entrega~<conjunto>~<aplicación>.json). */
const FUENTE_ENTREGA_ = { clave: 'entrega', lector: 'entrega', versionLector: 1 };

/* ¿Tiene este conjunto algo que le haga existir antes de que haya listados (una entrega, o lo publicado)? Los que van por cursos, por periodos o se entregan enteros salen solo cuando tienen fuentes o partes. */
function sinListadoPropio_(conj) { return !!(conj.porCursos || conj.entregadoPor || conj.deContactos); }

/* El lector: la entrega tal como llegó, ya como objeto. Solo vive en _interno/leido/. { lector, clave, variante, huella, entrega, problema } */
function leerEntrega_(bytes, fuente, huella, conj, entrada) {
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, entrega: null, problema: '' };
  try {
    const o = JSON.parse(bytesATexto_(bytes));
    if (o && typeof o === 'object' && !Array.isArray(o)) salida.entrega = o; else salida.problema = 'ilegible';
  } catch (e) { salida.problema = 'ilegible'; }
  return salida;
}

/* La entrega vigente de su dueña: [{ fuente, entrada, k }] (vacío si no hay). */
function fuentesDeEntero_(indice, conj) {
  return entregasDeConjunto_(indice, conj).filter(function (e) { return e.aplicacion === conj.entregadoPor; })
    .map(function (e) { return { fuente: FUENTE_ENTREGA_, entrada: e.entrada, k: claveLeido_(e.entrada.clave, e.entrada.variante) }; });
}

/* Una sola parte, `todas` (o la palabra que diga `parteNombre`), si hay entrega. `entera` hace que su ruta sea hecho/<conjunto>/<parte>.json. */
function partesDeEntero_(necesarias, conj) { return necesarias.length ? [{ parte: conj.parteNombre || 'todas', cursoEscolar: '', anio: 0, entera: true }] : []; }

/* Lo que cambia el montaje además de la entrega: el número del montador y, si el conjunto mira otros (`mira`) o tiene días de cambio (`conDias`), la huella de todas las partes de esos y cuántos días de cambio han pasado ya. */
function claveDeMontajeEntero_(conj, indice, avance, hoy) {
  let c = conj.versionMontador + '|' + FUENTE_ENTREGA_.versionLector;
  (conj.mira || []).forEach(function (otro) { c += '|' + partesDelConjunto_(indice, otro).map(function (h) { return h.ruta + ':' + h.huella; }).sort().join(','); });
  if (conj.conDias) { c += '|' + diasDeConjunto_(avance, conj.conjunto).filter(function (d) { return d <= hoy; }).length; }
  return c;
}

/* Los pasos propios de después de montar (`pasoPropio` en el registro es una de estas palabras). Cada uno: (conj, objeto, ctx) → { cifras, dias } y cambia `objeto`. */
function pasoPropioDe_(nombre) { return { cargos: pasoDeCargos_ }[nombre]; }

function fuenteDeParteEntero_(necesarias, avance) {
  return necesarias.map(function (x) { return { clave: x.entrada.clave, variante: x.entrada.variante || '', huella: (avance.leidos[x.k] || {}).huella || '' }; });
}

/* Los datos de un registro de la entrega: solo los de campos aceptados y de su tipo; null y vacío no se escriben. Suma a `cuentas.valoresIgnorados` lo que no es de su tipo. */
function valoresDeEntero_(r, porClave, cuentas) {
  const v = {}, datos = r && r.datos && typeof r.datos === 'object' ? r.datos : {};
  Object.keys(datos).forEach(function (k) {
    const campo = porClave[k], x = datos[k];
    if (!campo || x === null || x === undefined || (typeof x === 'string' && !x.trim())) return;
    if (!valorDelTipo_(x, campo)) { cuentas.valoresIgnorados++; return; }
    v[k] = x;
  });
  return v;
}

/* La parte `todas` de un conjunto entregado entero. Devuelve { objeto, cuentas } (las cuentas son las de la línea de `entregas` de estado.json). Una clave de la entrega que se llame como un campo
   propio del Centro de datos (`camposPropios`) se ignora y se cuenta, como cualquier campo ajeno. */
function montarEntero_(conj, leido) {
  const e = leido.entrega || {}, cuentas = { camposAceptados: 0, camposIgnorados: 0, registrosUsados: 0, registrosSinFicha: 0, valoresIgnorados: 0, hechoConViejo: false };
  const propias = {};
  (conj.camposPropios || []).forEach(function (c) { propias[c.clave] = true; });
  const campos = camposDeEntrega_(e, propias, cuentas), porClave = {}, avisos = [], registros = [], vistos = {};
  campos.forEach(function (c) { porClave[c.clave] = c; });
  const aviso = function (tipo, id, datos) { avisos.push({ tipo: conj.conjunto + '-' + tipo, id: id, datos: datos }); };
  (Array.isArray(e.registros) ? e.registros : []).forEach(function (r) {
    const id = r && typeof r.id === 'string' ? r.id : '';
    const datos = valoresDeEntero_(r, porClave, cuentas);
    if (!id.trim()) { cuentas.registrosSinFicha++; aviso('sin-id', null, datos); return; }
    if (vistos[id]) { cuentas.registrosSinFicha++; aviso('id-repetido', id, datos); return; }
    vistos[id] = true; cuentas.registrosUsados++;
    registros.push({ id: id, datos: datos });
  });
  const repetidos = [];
  (conj.unicos || []).forEach(function (k) {
    const visto = {};
    registros.forEach(function (r) {
      const v = r.datos[k];
      if (v === undefined || v === null || !String(v).trim()) return;
      const n = normalizarAlumno_(String(v));
      if (visto[n] !== undefined) repetidos.push({ tipo: conj.conjunto + '-dato-repetido', id: r.id, datos: { clave: k, valor: v, de: visto[n] } }); else visto[n] = r.id;
    });
  });
  const frases = [];
  if (cuentas.camposIgnorados) frases.push('La entrega trae ' + cuentas.camposIgnorados + (cuentas.camposIgnorados === 1 ? ' campo que no se ha usado (mal descrito, de otro dueño o repetido).' : ' campos que no se han usado (mal descritos, de otro dueño o repetidos).'));
  if (cuentas.valoresIgnorados) frases.push('La entrega trae ' + cuentas.valoresIgnorados + (cuentas.valoresIgnorados === 1 ? ' valor que no es del tipo de su campo y no se ha escrito.' : ' valores que no son del tipo de su campo y no se han escrito.'));
  const delFichero = frases.map(function (d) { return { tipo: conj.conjunto + '-entrega', id: null, datos: { detalle: d } }; });
  const objeto = { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: conj.parteNombre || 'todas', cursoEscolar: '', generado: ahoraMadrid_(), origen: DUENO_CD_, entregadoPor: conj.entregadoPor,
    entregado: typeof e.generado === 'string' ? e.generado : '',
    campos: campos.map(function (c) { return Object.assign({}, c, { fuente: 'entrega' }); }), registros: registros, avisos: delFichero.concat(avisos, repetidos) };
  return { objeto: objeto, cuentas: cuentas };
}

/* La cuenta de un conjunto repartida como dice su `desglose` ({ valor: n, …, otros: n }), o null si no tiene. Los registros que no son de ningún trozo van a `otros`. */
function desgloseDeEntero_(conj, registros) {
  if (!conj.desglose) return null;
  const d = {}, k = conj.desglose.clave;
  conj.desglose.trozos.forEach(function (t) { d[t.valor] = 0; });
  d.otros = 0;
  registros.forEach(function (r) { const v = r.datos[k]; if (typeof v === 'string' && v !== 'otros' && d[v] !== undefined) d[v]++; else d.otros++; });
  return d;
}

/* El día de una entrega, «dd/mm/aaaa», para la página. */
function diaLegibleEntero_(generado) {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(generado || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

/* La tarea «montar» de un conjunto entregado entero. */
function montarParteDeEntero_(raiz, t, avance, cache, indice) {
  const t0 = new Date().getTime();
  const x = t.necesarias[0];
  if (!x) return;
  const leido = cargarLeido_(raiz, x.k);
  if (!leido || !avance.leidos[x.k] || leido.huella !== avance.leidos[x.k].huella) { delete avance.leidos[x.k]; return; }
  const m = montarEntero_(t.conj, leido);
  /* El paso propio del conjunto, si lo tiene: une, calcula y añade sus campos a lo que entregó el dueño. */
  const paso = t.conj.pasoPropio ? pasoPropioDe_(t.conj.pasoPropio)(t.conj, m.objeto, { indice: indice, cache: cache, hoy: hoyDeParte_(t.ruta) }) : null;
  if (paso) m.objeto.campos = m.objeto.campos.concat(t.conj.camposPropios);
  cerrarMontaje_(raiz, t, avance, m.objeto, t0);
  m.cuentas.cuando = x.entrada.subido;
  const apuntada = {};
  apuntada[t.conj.entregadoPor] = m.cuentas;
  avance.entregas = avance.entregas || {};
  avance.entregas[t.conj.conjunto] = apuntada;
  avance.entregados = avance.entregados || {};
  avance.entregados[t.conj.conjunto] = diaLegibleEntero_(m.objeto.entregado);
  avance.dias = avance.dias || {}; avance.cifras = avance.cifras || {}; avance.cuentas = avance.cuentas || {};
  if (paso) { avance.dias[t.ruta] = paso.dias || []; avance.cifras[t.ruta] = paso.cifras || {}; }
  if (t.conj.cuentaPor) {
    const distintos = {};
    m.objeto.registros.forEach(function (r) { if (r.datos[t.conj.cuentaPor] !== undefined) distintos[String(r.datos[t.conj.cuentaPor])] = true; });
    avance.cuentas[t.conj.conjunto] = Object.keys(distintos).length;
  }
  const desglose = desgloseDeEntero_(t.conj, m.objeto.registros);
  avance.desgloses = avance.desgloses || {};
  if (desglose) avance.desgloses[t.conj.conjunto] = desglose; else delete avance.desgloses[t.conj.conjunto];
}

/* ==== Ensayo.gs ==== */
/* El ensayo de los datos ya hechos (filas 46 a 51). La página nueva monta en el propio navegador los conjuntos de `ENSAYO_CONJUNTOS_` (hoy la ficha del alumno, el personal, las tutorías, el Consejo Escolar, los libros de texto, las empresas, las Administraciones y los cargos) y deja todo en _interno/ensayo-pagina/ (hecho/, leido/, hechos.json e indice.json con
   solo lo suyo): nunca en hecho/ ni en indice.json, que son de la aplicación de hoy. Un conjunto más es una línea de esa lista (y sus frases en Avisos.gs). Este fichero tiene las dos mitades que corren en los dos sitios:
   - `ensayoPaso_`: un paso del montaje (una lectura o una parte), con los mismos montadores de hoy. Solo lo corre la página, sobre una raíz que ya redirige lo que escribe al ensayo (pagina/ensayo.js).
   - `ensayoVista_`: compara parte a parte con la de hoy, solo cuando las dos salen de los mismos listados, y cuenta las diferencias por parte y por campo. Solo cifras: nunca el dato de una persona. */
const ENSAYO_RUTA_ = '_interno/ensayo-pagina';
const ENSAYO_CONJUNTO_ = 'alumnado';
const ENSAYO_COMPARACION_ = 'comparacion.json';
const ENSAYO_TOPE_MS_ = 3000;
const CONJUNTO_ENSAYO_ = { conjunto: 'ensayo', titulo: 'Ensayo de los datos ya hechos' };
/* Fila 58: mientras la página nueva monta el ensayo, las pantallas enseñan la última comparación guardada de cada conjunto y no calculan ninguna (comparar abre partes enteras y bloquea la página). Solo lo pone la página. */
let ENSAYO_SIN_CALCULAR_ = false;
function ensayoSinCalcular_(si) { ENSAYO_SIN_CALCULAR_ = !!si; }
/* Los conjuntos que ensaya la página. nombre: cómo empieza la línea; cajita: su título; poniendo: «Poniendo al día …»; unidad: lo que cuenta; donde: cómo empieza el sitio de un aviso; fichero: dónde guarda su comparación;
   aviso: la parte del nombre de sus avisos (`ensayo-<aviso>-distinta`); cuentaPartes: 'actuales' suma las partes `actuales`, 'curso' da la cifra del curso de hoy como la cajita de la aplicación de hoy, 'consejo' da los periodos y los nombramientos del historial como ella, 'libros' da los libros y los niveles del curso de hoy (o el más reciente) como ella, 'entero' da la cuenta (y el desglose) del conjunto entregado entero como la cajita de hoy. */
const ENSAYO_CONJUNTOS_ = [
  { conjunto: 'alumnado', nombre: 'Ficha del alumno', cajita: 'Ficha del alumno (ensayo)', poniendo: 'la ficha del alumno', unidad: 'alumnos', donde: 'Alumnado', fichero: ENSAYO_COMPARACION_, aviso: 'ficha', cuentaPartes: 'actuales' },
  { conjunto: 'personal', nombre: 'Personal', cajita: 'Personal (ensayo)', poniendo: 'el personal', unidad: 'personas', donde: 'Personal', fichero: 'comparacion-personal.json', aviso: 'personal', cuentaPartes: 'curso' },
  { conjunto: 'tutorias', nombre: 'Tutorías', cajita: 'Tutorías (ensayo)', poniendo: 'las tutorías', unidad: 'grupos', donde: 'Tutorías', fichero: 'comparacion-tutorias.json', aviso: 'tutorias', cuentaPartes: 'curso' },
  { conjunto: 'consejo-escolar', nombre: 'Consejo Escolar', cajita: 'Consejo Escolar (ensayo)', poniendo: 'el Consejo Escolar', unidad: 'nombramientos', donde: 'Consejo Escolar', fichero: 'comparacion-consejo.json', aviso: 'consejo', cuentaPartes: 'consejo' },
  { conjunto: 'libros', nombre: 'Libros de texto', cajita: 'Libros de texto (ensayo)', poniendo: 'los libros de texto', unidad: 'libros', donde: 'Libros de texto', fichero: 'comparacion-libros.json', aviso: 'libros', cuentaPartes: 'libros' },
  { conjunto: 'empresas', nombre: 'Empresas', cajita: 'Empresas (ensayo)', poniendo: 'las empresas', unidad: 'empresas', donde: 'Empresas', fichero: 'comparacion-empresas.json', aviso: 'empresas', cuentaPartes: 'entero' },
  { conjunto: 'administraciones', nombre: 'Administraciones', cajita: 'Administraciones (ensayo)', poniendo: 'las Administraciones', unidad: 'administraciones', donde: 'Administraciones', fichero: 'comparacion-administraciones.json', aviso: 'administraciones', cuentaPartes: 'entero' },
  { conjunto: 'cargos', nombre: 'Cargos', cajita: 'Cargos (ensayo)', poniendo: 'los cargos', unidad: 'cargos', donde: 'Cargos', fichero: 'comparacion-cargos.json', aviso: 'cargos', cuentaPartes: 'entero' }
];

function ensayoDe_(conjunto) { return ENSAYO_CONJUNTOS_.filter(function (c) { return c.conjunto === (conjunto || ENSAYO_CONJUNTO_); })[0]; }
/* Fila 59: los conjuntos que ya publica la página (Turno.gs) dejan de ensayarse; el resto sigue en ensayo. */
function ensayoActivos_(raiz) { const fuera = turnoPublicados_(raiz); return ENSAYO_CONJUNTOS_.filter(function (c) { return fuera.indexOf(c.conjunto) === -1; }); }
function ensayoNombres_(raiz) { return ensayoActivos_(raiz).map(function (c) { return c.conjunto; }); }

/* Un paso: la primera tarea que falte (leer un listado, montar una parte o quitar una que sobra). Devuelve { quedan, hecha, conjunto, conjuntoHecho, restan } (el conjunto de lo siguiente, el de lo que se acaba de hacer y los que aún tienen algo por montar). */
function ensayoPaso_(raiz, dias) {
  prestarDias_(dias);
  const avance = leerAvance_(raiz);
  quitarLeidoViejo_(raiz, leerIndice_(raiz), avance);
  const indice = leerIndice_(raiz);
  const tareas = tareasDeHechos_(indice, avance, ensayoNombres_(raiz));
  if (!tareas.length) return { quedan: false, hecha: '', conjunto: '', conjuntoHecho: '', restan: [] };
  hacerTareaHechos_(raiz, tareas[0], indice, avance, {}, new Date().getTime() + ENSAYO_TOPE_MS_);
  avance.ultima = ahoraMadrid_();
  escribirAvance_(raiz, avance);
  const quedan = tareasDeHechos_(leerIndice_(raiz), avance, ensayoNombres_(raiz)), restan = [];
  quedan.forEach(function (q) { if (restan.indexOf(q.conj.conjunto) === -1) restan.push(q.conj.conjunto); });
  return { quedan: quedan.length > 0, hecha: tareas[0].que, conjunto: quedan.length ? quedan[0].conj.conjunto : '', conjuntoHecho: tareas[0].conj.conjunto, restan: restan };
}

/* Los días que presta la aplicación de hoy al ensayo (fila 57): por ruta, el `hoy` de cada parte de hoy de un conjunto ensayado que lo guarde, siempre que se compararía con la del ensayo (misma ruta, mismos listados y al día).
   Sin lista de conjuntos: los que guardan `hoy` (tienen `conDias` o paso propio) lo prestan solos. Si la parte del ensayo aún no existe o quedó vieja se rehará con los listados de ahora, que son los de la de hoy. `raiz` es la de verdad. */
function ensayoDiasPrestados_(raiz) {
  const indice = leerIndice_(raiz), dias = {}, nombres = ensayoNombres_(raiz);
  (indice.hechos || []).forEach(function (h) {
    const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === h.conjunto; })[0];
    if (!conj || nombres.indexOf(h.conjunto) === -1 || !(conj.conDias || conj.pasoPropio) || !ensayoAlDia_(h, indice)) return;
    const parte = ensayoJson_(raiz, h.ruta);
    if (parte && typeof parte.hoy === 'string' && parte.hoy) dias[h.ruta] = parte.hoy;
  });
  return dias;
}

/* Lo que falta por montar en el ensayo, sin escribir nada. */
function ensayoQuedan_(raiz, dias) {
  prestarDias_(dias);
  return tareasDeHechos_(leerIndice_(raiz), leerAvance_(raiz), ensayoNombres_(raiz)).length;
}

/* Los conjuntos que todavía tienen algo que montar en el ensayo, en el orden en que se montarán. */
function ensayoPendientes_(raiz, dias) {
  prestarDias_(dias);
  const vistos = {}, lista = [];
  tareasDeHechos_(leerIndice_(raiz), leerAvance_(raiz), ensayoNombres_(raiz)).forEach(function (t) { if (!vistos[t.conj.conjunto]) { vistos[t.conj.conjunto] = true; lista.push(t.conj.conjunto); } });
  return lista;
}

/* El conjunto del que es la próxima tarea del ensayo, o '' si no queda nada. */
function ensayoSiguiente_(raiz, dias) {
  prestarDias_(dias);
  const t = tareasDeHechos_(leerIndice_(raiz), leerAvance_(raiz), ensayoNombres_(raiz));
  return t.length ? t[0].conj.conjunto : '';
}

/*** ---------------- Comparar ---------------- */

/* Un JSON del ensayo, o null si no está o quedó a medias (un fichero vacío: la página se cerró justo al crearlo). */
function ensayoJson_(raiz, ruta) {
  const f = ficheroPorRuta_(raiz, ruta);
  if (!f) return null;
  const texto = f.getBlob().getDataAsString('UTF-8');
  try { return JSON.parse(texto); } catch (e) { return null; }
}

function ensayoEntradas_(indice, conjunto) { return ((indice && indice.hechos) || []).filter(function (h) { return h.conjunto === (conjunto || ENSAYO_CONJUNTO_); }); }

function ensayoDeLaRuta_(ruta) { return ENSAYO_RUTA_ + '/' + ruta; }

function ensayoAlDia_(h, indice) {
  return (h.fuentes || []).length > 0 && h.fuentes.every(function (f) { const e = buscarEnIndice_(indice, f.clave, f.variante); return !!e && e.huella === f.huella; });
}

/* Lo que cambia cuando cambia algo que se compara: las partes de hoy y las del ensayo, con sus huellas y sus fuentes. */
function ensayoFirma_(raiz, conjunto) {
  const indice = leerIndice_(raiz), ens = ensayoJson_(raiz, ensayoDeLaRuta_('indice.json'));
  const f = function (h) { return h.ruta + '|' + h.huella + '|' + JSON.stringify(h.fuentes || []); };
  return JSON.stringify([ensayoEntradas_(indice, conjunto).map(f).sort(), ensayoEntradas_(ens, conjunto).map(f).sort(), !!indice.ocupado]);
}

/* En qué difieren dos partes: por campo, a cuántos registros afecta. Solo nombres de campo del programa y cuentas. */
function ensayoDiferencias_(hoy, ens) {
  const r = { campos: {}, sobran: 0, faltan: 0 };
  const anota = function (k) { r.campos[k] = (r.campos[k] || 0) + 1; };
  if (JSON.stringify(hoy.campos) !== JSON.stringify(ens.campos)) r.campos['(la lista de campos)'] = 1;
  if (JSON.stringify(hoy.columnasMatricula) !== JSON.stringify(ens.columnasMatricula)) r.campos['(las columnas de la matrícula)'] = 1;
  if (JSON.stringify(hoy.columnasLibros) !== JSON.stringify(ens.columnasLibros)) r.campos['(las columnas de los listados de libros)'] = 1;
  if (JSON.stringify(hoy.columnasPersonal) !== JSON.stringify(ens.columnasPersonal)) r.campos['(las columnas de los listados)'] = 1;
  const porId = function (p) { const m = {}; (p.registros || []).forEach(function (x) { m[x.id] = x; }); return m; };
  const a = porId(hoy), b = porId(ens);
  Object.keys(a).forEach(function (id) {
    if (!b[id]) { r.faltan++; return; }
    const x = a[id], y = b[id], datosX = x.datos || {}, datosY = y.datos || {};
    Object.keys(datosX).concat(Object.keys(datosY).filter(function (k) { return !(k in datosX); })).forEach(function (k) { if (JSON.stringify(datosX[k]) !== JSON.stringify(datosY[k])) anota(k); });
    Object.keys(x).concat(Object.keys(y).filter(function (k) { return !(k in x); })).forEach(function (k) { if (k !== 'datos' && k !== 'id' && JSON.stringify(x[k]) !== JSON.stringify(y[k])) anota('(' + k + ')'); });
  });
  Object.keys(b).forEach(function (id) { if (!a[id]) r.sobran++; });
  if (JSON.stringify(hoy.avisos) !== JSON.stringify(ens.avisos)) r.campos['(los avisos del cruce)'] = Math.max(1, Math.abs((hoy.avisos || []).length - (ens.avisos || []).length));
  if (JSON.stringify(hoy.funcionesSinGrupo) !== JSON.stringify(ens.funcionesSinGrupo)) r.campos['(las funciones sin grupo)'] = 1;
  if (hoy.hoy !== ens.hoy) r.campos['(el día de hoy)'] = 1;
  if (hoy.listadoDel !== ens.listadoDel) r.campos['(la fecha del listado)'] = 1;
  if (!Object.keys(r.campos).length && !r.sobran && !r.faltan) r.campos['(el resto de la parte)'] = 1;
  return r;
}

/* Compara de verdad, abriendo las partes de un conjunto. Devuelve la vista: { firma, estado, partes: {...}, cifra, curso, difs: [{ parte, campo, n }], sobran: [{ parte, n }], faltan: [{ parte, n }] }.
   estado: 'sin-ensayo' (la página no ha montado nada), 'esperando' (la aplicación de hoy todavía no ha montado con los mismos ficheros), 'igual' o 'distinta'.
   cifra: lo que cuenta la cajita de hoy (alumnos de las partes `actuales`, o personas del curso de hoy en un conjunto por cursos). */
function ensayoComparar_(raiz, firma, conjunto) {
  const def = ensayoDe_(conjunto);
  const indice = leerIndice_(raiz), ensIdx = ensayoJson_(raiz, ensayoDeLaRuta_('indice.json'));
  const ens = ensayoEntradas_(ensIdx, def.conjunto), hoy = ensayoEntradas_(indice, def.conjunto), iguales = [];
  const v = { firma: firma, estado: 'sin-ensayo', periodos: 0, partes: { comparadas: 0, iguales: 0, distintas: 0, esperando: 0 }, cifra: 0, curso: '', difs: [], sobran: [], faltan: [], niveles: 0 };
  const libros = [];
  if (!ens.length) return v;
  ens.forEach(function (he) {
    const hr = hoy.filter(function (h) { return h.ruta === he.ruta; })[0];
    if (!hr || !mismasFuentes_(hr.fuentes, he.fuentes) || !ensayoAlDia_(hr, indice) || !ensayoAlDia_(he, indice)) { v.partes.esperando++; return; }
    const pHoy = ensayoJson_(raiz, hr.ruta), pEns = ensayoJson_(raiz, ensayoDeLaRuta_(he.ruta));
    if (!pHoy || !pEns) { v.partes.esperando++; return; }
    v.partes.comparadas++;
    const donde = def.donde + ' · ' + (he.parte === 'antiguos' ? 'antiguos' : he.parte === 'historial' ? 'historial' : he.periodo ? 'periodo ' + he.periodo : 'curso ' + he.cursoEscolar);
    if (contenidoDeParte_(pHoy) === contenidoDeParte_(pEns)) {
      v.partes.iguales++; iguales.push(he);
      if (def.cuentaPartes === 'actuales' && he.parte === 'actuales') v.cifra += (pEns.registros || []).length;
      if (def.cuentaPartes === 'libros') libros.push({ cursoEscolar: he.cursoEscolar, k: cifrasDeLibros_(pEns) });
      if (def.cuentaPartes === 'consejo') { if (he.parte === 'periodo') v.periodos++; else if (he.parte === 'historial') v.cifra = (pEns.registros || []).length; }
      return;
    }
    v.partes.distintas++;
    const d = ensayoDiferencias_(pHoy, pEns);
    Object.keys(d.campos).sort().forEach(function (k) { v.difs.push({ parte: donde, campo: k, n: d.campos[k] }); });
    if (d.sobran) v.sobran.push({ parte: donde, n: d.sobran });
    if (d.faltan) v.faltan.push({ parte: donde, n: d.faltan });
  });
  hoy.forEach(function (hr) { if (!ens.some(function (he) { return he.ruta === hr.ruta; })) v.partes.esperando++; });
  v.estado = v.partes.distintas ? 'distinta' : (v.partes.esperando || !v.partes.comparadas ? 'esperando' : 'igual');
  if (def.cuentaPartes === 'curso' && v.estado === 'igual') {
    const hoyCurso = partesPorCursosParaPagina_(iguales).actuales[0];
    if (hoyCurso) { v.cifra = hoyCurso.registros; v.curso = hoyCurso.cursoEscolar; }
  }
  if (def.cuentaPartes === 'libros' && v.estado === 'igual' && libros.length) {
    const cursos = libros.slice().sort(function (a, b) { return ordenDeCurso_(b.cursoEscolar) - ordenDeCurso_(a.cursoEscolar); });
    const p = cursos.filter(function (x) { return x.cursoEscolar === cursoActual_(); })[0] || cursos[0];
    v.cifra = p.k.libros; v.niveles = p.k.niveles; v.curso = p.cursoEscolar;
  }
  if (def.cuentaPartes === 'entero' && v.estado === 'igual' && iguales.length) {
    const c = ensayoCuentaEntero_(def.conjunto, ensayoJson_(raiz, ensayoDeLaRuta_(iguales[0].ruta)));
    v.cifra = c.cifra; v.desglose = c.desglose;
  }
  return v;
}

/* Lo que cuenta la cajita de hoy de un conjunto entregado entero: sus registros (o los valores distintos de `cuentaPor`) y, si lo tiene, el desglose { uno, varios, n }. */
function ensayoCuentaEntero_(conjunto, parte) {
  const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === conjunto; })[0], regs = (parte && parte.registros) || [];
  let cifra = regs.length;
  if (conj.cuentaPor) { const d = {}; regs.forEach(function (r) { if (r.datos[conj.cuentaPor] !== undefined) d[String(r.datos[conj.cuentaPor])] = true; }); cifra = Object.keys(d).length; }
  const cuenta = desgloseDeEntero_(conj, regs);
  return { cifra: cifra, desglose: cuenta ? conj.desglose.trozos.map(function (t) { return { uno: t.uno, varios: t.varios, n: cuenta[t.valor] || 0 }; }) : null };
}

/* La vista de ahora de un conjunto: la que dejó la página si sigue siendo de lo mismo y, si no, se calcula (sin guardar nada). */
function ensayoVista_(raiz, conjunto) {
  const def = ensayoDe_(conjunto);
  let guardada = null;
  try { guardada = ensayoJson_(raiz, ensayoDeLaRuta_(def.fichero)); } catch (e) { if (e && typeof e.cargar === 'function') throw e; guardada = null; }   // la página pide por una excepción lo que le falta por leer: no se traga
  if (ENSAYO_SIN_CALCULAR_) return guardada && guardada.cifra !== undefined ? guardada : { firma: '', estado: 'sin-ensayo', periodos: 0, partes: { comparadas: 0, iguales: 0, distintas: 0, esperando: 0 }, cifra: 0, curso: '', difs: [], sobran: [], faltan: [], niveles: 0 };
  const firma = ensayoFirma_(raiz, def.conjunto);
  if (guardada && guardada.firma === firma && guardada.cifra !== undefined) return guardada;
  return ensayoComparar_(raiz, firma, def.conjunto);
}

/* Lo que hace la página al terminar de montar un conjunto (o todos, sin `conjunto`): guarda su vista junto al ensayo. */
function ensayoGuardarVista_(raiz, conjunto) {
  ensayoActivos_(raiz).filter(function (def) { return !conjunto || def.conjunto === conjunto; }).forEach(function (def) {
    const firma = ensayoFirma_(raiz, def.conjunto);
    let guardada = null;
    try { guardada = ensayoJson_(raiz, ensayoDeLaRuta_(def.fichero)); } catch (e) { guardada = null; }
    if (guardada && guardada.firma === firma && guardada.cifra !== undefined) return;
    const v = ensayoComparar_(raiz, firma, def.conjunto);
    if (v.estado !== 'sin-ensayo') escribirJson_(subcarpetaPorRuta_(raiz, ENSAYO_RUTA_), def.fichero, v);
  });
}

/* La línea de «Datos ya hechos» de la página nueva, para un conjunto. */
function ensayoLinea_(v, trabajando, conjunto) {
  const def = ensayoDe_(conjunto);
  if (trabajando) return def.nombre + ': poniéndose al día en esta página';
  if (v.estado === 'igual' && def.cuentaPartes === 'consejo') return def.nombre + ': igual que la de hoy (' + numeroLegible_(v.periodos) + (v.periodos === 1 ? ' periodo' : ' periodos') + ' · ' + numeroLegible_(v.cifra) + (v.cifra === 1 ? ' nombramiento)' : ' nombramientos)');
  if (v.estado === 'igual' && def.cuentaPartes === 'libros') return def.nombre + ': igual que la de hoy (' + numeroLegible_(v.cifra) + (v.cifra === 1 ? ' libro' : ' libros') + ' en ' + numeroLegible_(v.niveles) + (v.niveles === 1 ? ' nivel' : ' niveles') + ' del curso ' + v.curso + ')';
  if (v.estado === 'igual' && def.cuentaPartes === 'entero') {
    const trozos = (v.desglose || []).map(function (z) { return numeroLegible_(z.n) + ' ' + (z.n === 1 ? z.uno : z.varios); });
    const reparto = v.cifra && trozos.length ? ': ' + (trozos.length > 1 ? trozos.slice(0, -1).join(', ') + ' y ' + trozos[trozos.length - 1] : trozos[0]) : '';
    return def.nombre + ': igual que la de hoy (' + numeroLegible_(v.cifra) + ' ' + def.unidad + reparto + ')';
  }
  if (v.estado === 'igual') return def.nombre + ': igual que la de hoy (' + numeroLegible_(v.cifra) + ' ' + def.unidad + (v.curso ? ' del curso ' + v.curso : '') + ')';
  if (v.estado === 'distinta') { const n = v.difs.length + v.sobran.length + v.faltan.length; return def.nombre + ': distinta de la de hoy (' + n + (n === 1 ? ' diferencia)' : ' diferencias)'); }
  if (v.estado === 'esperando') return def.nombre + ': esperando a la aplicación de hoy para comparar';
  return '';
}

function quienDeMas_(def, deMas) {
  const n = { alumnos: 'Alumnos', personas: 'Personas', grupos: 'Grupos', nombramientos: 'Registros', libros: 'Libros', empresas: 'Empresas', administraciones: 'Administraciones', cargos: 'Registros' }[def.unidad];
  return deMas ? n + ' de más' : n + ' que faltan';
}

/* Los avisos de las diferencias, como los de las partes de hecho/ (solo campo y cuenta). */
function ensayoAvisos_(raiz) {
  const lista = [];
  ensayoActivos_(raiz).forEach(function (def) {
    const v = ensayoVista_(raiz, def.conjunto);
    const poner = function (tipo, parte, datos, quien) {
      const a = { tipo: tipo, id: null, datos: datos }, f = frasePlanaDeAviso_(a);
      lista.push({ huella: huellaDeAviso_('ensayo', parte, a), conjunto: 'ensayo', donde: CONJUNTO_ENSAYO_.titulo + ' · ' + parte, tipo: tipo, quien: quien, que: f.texto, conocida: f.conocida });
    };
    v.difs.forEach(function (d) { poner('ensayo-' + def.aviso + '-distinta', d.parte, { campo: d.campo, n: d.n }, d.campo); });
    v.sobran.forEach(function (d) { poner('ensayo-' + def.aviso + '-sobran', d.parte, { n: d.n }, quienDeMas_(def, true)); });
    v.faltan.forEach(function (d) { poner('ensayo-' + def.aviso + '-faltan', d.parte, { n: d.n }, quienDeMas_(def, false)); });
  });
  return lista;
}

/* Las cifras de una comprobación de ensayo: solo cuentas. */
function ensayoCifras_(v) {
  return { 'partes-comparadas': v.partes.comparadas, 'partes-iguales': v.partes.iguales, 'partes-distintas': v.partes.distintas, 'partes-esperando': v.partes.esperando,
    'campos-con-diferencias': v.difs.length, 'registros-de-mas': v.sobran.reduce(function (n, d) { return n + d.n; }, 0), 'registros-que-faltan': v.faltan.reduce(function (n, d) { return n + d.n; }, 0) };
}

function cmpEnsayoDe_(ctx, conjunto) {
  if (turnoPublicados_(ctx.raiz).indexOf(conjunto) !== -1) return { estado: 'sin datos', cifras: { 'publicado-por-la-pagina': 1 } };   // ya no se ensaya (fila 59; la fila 60 retira lo que sobra)
  const v = ensayoVista_(ctx.raiz, conjunto), cifras = ensayoCifras_(v);
  if (v.estado === 'sin-ensayo') return { estado: 'sin datos', cifras: cifras };
  return { estado: v.estado === 'distinta' ? 'mal' : (v.estado === 'igual' ? 'bien' : 'sin datos'), cifras: cifras };
}

/* La comprobación `ensayo-ficha-igual` (fila 46), `ensayo-personal-igual` (fila 47), `ensayo-tutorias-igual` (fila 48) `ensayo-consejo-igual` (fila 49) `ensayo-libros-igual` (fila 50), `ensayo-empresas-igual`, `ensayo-administraciones-igual` y `ensayo-cargos-igual` (fila 51). */
function cmpEnsayoFichaIgual_(ctx) { return cmpEnsayoDe_(ctx, 'alumnado'); }
function cmpEnsayoPersonalIgual_(ctx) { return cmpEnsayoDe_(ctx, 'personal'); }
function cmpEnsayoTutoriasIgual_(ctx) { return cmpEnsayoDe_(ctx, 'tutorias'); }
function cmpEnsayoConsejoIgual_(ctx) { return cmpEnsayoDe_(ctx, 'consejo-escolar'); }
function cmpEnsayoLibrosIgual_(ctx) { return cmpEnsayoDe_(ctx, 'libros'); }
function cmpEnsayoEmpresasIgual_(ctx) { return cmpEnsayoDe_(ctx, 'empresas'); }
function cmpEnsayoAdministracionesIgual_(ctx) { return cmpEnsayoDe_(ctx, 'administraciones'); }
function cmpEnsayoCargosIgual_(ctx) { return cmpEnsayoDe_(ctx, 'cargos'); }

/* La comprobación `pagina-responde` (fila 58). La página nueva no puede subir comprobaciones: apunta en `medida.json`, dentro del ensayo, lo más lento que tardó en responder mientras el ensayo trabajaba (milisegundos) y esta función solo lo lee.
   `bien` si no pasa de 500 ms o si el ensayo no trabajó (`sin-medida`); `mal` si pasa. Solo cuentas. */
const RESPONDE_TOPE_MS_ = 500;
function cmpPaginaResponde_(ctx) {
  let m = null;
  try { m = ensayoJson_(ctx.raiz, ensayoDeLaRuta_('medida.json')); } catch (e) { m = null; }
  if (!m || typeof m.ms !== 'number') return { estado: 'bien', cifras: { 'sin-medida': 1 } };
  const n = function (x) { return typeof x === 'number' ? x : 0; };
  return { estado: m.ms > RESPONDE_TOPE_MS_ ? 'mal' : 'bien', cifras: { 'sin-medida': 0, ms: m.ms, 'bloqueo-ms': n(m.bloqueoMs), 'espera-ms': n(m.esperaMs), 'paso-ms': n(m.pasoMs), pasos: n(m.pasos) } };
}

/* ==== Turno.gs ==== */
/* El turno de montaje (fila 59). Entre la página nueva y la aplicación de hoy solo monta una a la vez: _interno/turno-montaje.json dice quién y hasta cuándo.
   { quien: 'pagina' | 'aplicacion', pestana, persona, desde, hasta (milisegundos), publicados: [conjuntos que publica la página], caducados, choques, soloAplicacion }.
   Lo escribe solo la página (pagina/publicar.js); la aplicación de hoy lo lee. Con `soloAplicacion: true` (a mano, la marcha atrás) la página deja de publicar y vuelve a ensayar.
   Mientras el turno de la página vale, la aplicación de hoy no monta los conjuntos de `publicados`; si caducó, los monta ella como siempre. Con los mismos .gs sale lo mismo, monte quien monte. */
const TURNO_FICHERO_ = 'turno-montaje.json';
const TURNO_VALIDEZ_MS_ = 10 * 60 * 1000;   // con margen: Drive para ordenador puede tardar minutos en subir lo que escribe la página (no medido con datos reales)
let QUIEN_MONTA_ = 'aplicacion';
function quienMonta_(q) { QUIEN_MONTA_ = q || 'aplicacion'; }
let EXCLUIDOS_MONTAJE_ = [];
function excluirMontaje_(lista) { EXCLUIDOS_MONTAJE_ = lista || []; }

/* El turno guardado ({} si no hay o está a medias). La excepción con la que la página pide leer un fichero no se traga. */
function turnoLeer_(raiz) {
  try {
    const t = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), TURNO_FICHERO_);
    return t && typeof t === 'object' ? t : {};
  } catch (e) { if (e && typeof e.cargar === 'function') throw e; return {}; }
}

function turnoVigente_(t, ahoraMs) { return t.quien === 'pagina' && typeof t.hasta === 'number' && t.hasta > ahoraMs; }

/* Los conjuntos que publica la página (ninguno con la marcha atrás puesta). */
function turnoPublicados_(raiz) {
  const t = turnoLeer_(raiz);
  if (t.soloAplicacion) return [];
  return (t.publicados || []).filter(function (c) { return CONJUNTOS_.some(function (x) { return x.conjunto === c; }); });
}

/* Lo que la aplicación de hoy no monta ahora: lo que publica la página mientras su turno vale. */
function turnoExcluidos_(raiz) {
  const t = turnoLeer_(raiz);
  return !t.soloAplicacion && turnoVigente_(t, new Date().getTime()) ? turnoPublicados_(raiz) : [];
}

/* Quién monta cada conjunto con partes: lo que apuntó el montaje; sin apunte, la aplicación de hoy. */
function quienMontaConjunto_(avance, conjunto) { return (avance.quien || {})[conjunto] || 'aplicacion'; }

/* Los conjuntos del ensayo que ya salen «igual que la de hoy» (su última comparación guardada, de lo de ahora) y aún no se publican. */
function ensayoPublicables_(raiz) {
  const lista = [];
  ensayoActivos_(raiz).forEach(function (def) {
    let g = null;
    try { g = ensayoJson_(raiz, ensayoDeLaRuta_(def.fichero)); } catch (e) { if (e && typeof e.cargar === 'function') throw e; g = null; }
    if (g && g.estado === 'igual' && g.firma === ensayoFirma_(raiz, def.conjunto)) lista.push(def.conjunto);
  });
  return lista;
}

/* Cuántas tareas faltan por hacer en los conjuntos que publica la página, sin escribir nada (con el día de verdad). */
function publicarQuedan_(raiz, conjuntos) {
  prestarDias_({});
  return tareasDeHechos_(leerIndice_(raiz), leerAvance_(raiz), conjuntos).length;
}

/* Desde que un conjunto pasa a publicarlo la página, es suyo aunque no haya nada que rehacer: así queda dicho en el avance. */
function publicarAdoptar_(raiz, conjuntos) {
  const avance = leerAvance_(raiz);
  avance.quien = avance.quien || {};
  conjuntos.forEach(function (c) { avance.quien[c] = 'pagina'; });
  escribirAvance_(raiz, avance);
}

/* Un paso de la publicación: lo mismo que `ensayoPaso_`, pero en la raíz de verdad, con el día de verdad y solo con los conjuntos publicados. Solo lo corre la página.
   Devuelve { quedan, ocupada, restan }. Si una tanda de la aplicación de hoy sigue en marcha, espera. */
function publicarPaso_(raiz, conjuntos) {
  prestarDias_({});
  quienMonta_('pagina');
  try {
    const avance = leerAvance_(raiz);
    if (avance.enMarcha && new Date().getTime() - avance.enMarcha < HECHOS_EXCLUSIVA_MS_) return { quedan: true, ocupada: true, restan: [] };
    quitarLeidoViejo_(raiz, leerIndice_(raiz), avance);
    const indice = leerIndice_(raiz), tareas = tareasDeHechos_(indice, avance, conjuntos);
    if (!tareas.length) return { quedan: false, ocupada: false, restan: [] };
    hacerTareaHechos_(raiz, tareas[0], indice, avance, {}, new Date().getTime() + ENSAYO_TOPE_MS_);
    avance.ultima = ahoraMadrid_();
    escribirAvance_(raiz, avance);
    const quedan = tareasDeHechos_(leerIndice_(raiz), avance, conjuntos), restan = [];
    quedan.forEach(function (q) { if (restan.indexOf(q.conj.conjunto) === -1) restan.push(q.conj.conjunto); });
    if (!quedan.length) escribirEstadoHechos_(raiz);
    return { quedan: quedan.length > 0, ocupada: false, restan: restan, siguiente: quedan.length ? quedan[0].que + ':' + (quedan[0].ruta || quedan[0].k || quedan[0].conj.conjunto) : '' };
  } finally { quienMonta_('aplicacion'); }
}

/* La comprobación `quien-monta` (fila 59): quién montó la última parte de cada conjunto, los turnos vigentes y caducados y los choques (la página vio que otro se llevó su turno). Solo cuentas.
   `mal` si hubo choques; si no, `dato`. */
function cmpQuienMonta_(ctx) {
  const t = turnoLeer_(ctx.raiz), publicados = turnoPublicados_(ctx.raiz), cifras = { 'conjuntos-pagina': 0, 'conjuntos-aplicacion': 0 };
  CONJUNTOS_.forEach(function (conj) {
    if (!(ctx.indice.hechos || []).some(function (h) { return h.conjunto === conj.conjunto; })) return;
    const q = quienMontaConjunto_(ctx.avance, conj.conjunto);
    cifras['conjuntos-' + q]++;
    cifras['pagina-' + conj.conjunto] = q === 'pagina' ? 1 : 0;
  });
  cifras['publicados-por-la-pagina'] = publicados.length;
  cifras['turnos-vigentes'] = turnoVigente_(t, ctx.ahoraMs) ? 1 : 0;
  cifras['turnos-caducados'] = t.caducados || 0;
  cifras.choques = t.choques || 0;
  cifras['solo-aplicacion'] = t.soloAplicacion ? 1 : 0;
  return { estado: cifras.choques > 0 ? 'mal' : 'dato', cifras: cifras };
}

/* ==== HechosCargos.gs ==== */
/* El paso propio de los cargos (fila 25), después de montar la parte que entrega el Gestor: une a cada ocupante con su ficha del personal por el nombre, dice quién ocupa cada cargo hoy y avisa de las fechas que no
   cuadran. No quita ni cambia ningún registro. Son nombres de personas: solo viven en la parte y en los avisos, en Drive. */

/* ¿Ocupa el cargo ese día? Tiene fecha de inicio, no es posterior y, si tiene fecha de fin, el día no es posterior a ella. */
function ocupaElCargo_(d, dia) { return !!(d.desde && d.desde <= dia && (!d.hasta || dia <= d.hasta)); }

function ocupanteDeAviso_(d) { return { persona: d.persona, desde: d.desde || null, hasta: d.hasta || null }; }

/* ¿Comparten algún día dos tramos? Un fin que falta llega hasta siempre; un tramo al revés no cuenta. */
function tramosSePisan_(a, b) { return (!a.hasta || b.desde <= a.hasta) && (!b.hasta || a.desde <= b.hasta); }

/* `objeto` = la parte ya montada. `ctx` = { indice, cache, hoy }. Cambia `objeto` (campos de cada registro, avisos y claves de más de la parte) y devuelve { cifras, dias }. */
function pasoDeCargos_(conj, objeto, ctx) {
  const hoy = ctx.hoy, avisos = objeto.avisos;
  const cursosConPersonal = partesDelConjunto_(ctx.indice, 'personal', 'curso').map(function (h) { return h.cursoEscolar; }).filter(cursoValido_);
  const ocupantes = [], cargos = {}, ocupados = {}, dias = {};
  let mirado = false;
  objeto.registros.forEach(function (r) {
    const d = r.datos;
    if (typeof d.cargo === 'string') cargos[d.cargo] = true;
    if (typeof d.persona !== 'string' || !d.persona.trim()) return;
    ocupantes.push(r);
    const clave = claveNombreConsejo_(d.persona);
    if (clave) d.claveNombre = clave;
    /* Los cursos en que se busca: del de su inicio al de su fin (o al de hoy); sin inicio, desde el más antiguo. Solo los que tienen parte del personal. */
    const desdeOrden = d.desde ? ordenDeCurso_(cursoDeDiaConsejo_(d.desde)) : -Infinity, hastaOrden = ordenDeCurso_(cursoDeDiaConsejo_(d.hasta || hoy));
    const cursos = cursosConPersonal.filter(function (c) { return ordenDeCurso_(c) >= desdeOrden && ordenDeCurso_(c) <= hastaOrden; }).sort(function (a, b) { return ordenDeCurso_(a) - ordenDeCurso_(b); });
    const ids = [];
    cursos.forEach(function (c) {
      const x = buscarPersonalConsejo_(ctx.indice, ctx.cache, c, clave);
      if (x.mirado) mirado = true;
      x.ids.forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
    if (ids.length === 1) { d.fichaConjunto = 'personal'; d.fichaId = ids[0]; }
    else if (cursos.length && !ids.length) avisos.push({ tipo: conj.conjunto + '-sin-ficha', id: r.id, datos: { cargoNombre: d.cargoNombre || null, persona: d.persona, cursos: cursos } });
    else if (ids.length > 1) avisos.push({ tipo: conj.conjunto + '-ficha-dudosa', id: r.id, datos: { cargoNombre: d.cargoNombre || null, persona: d.persona, coinciden: ids.length } });
    d.ocupaHoy = ocupaElCargo_(d, hoy);
    if (d.ocupaHoy && typeof d.cargo === 'string') ocupados[d.cargo] = true;
    if (d.desde) dias[d.desde] = true;
    if (d.hasta) dias[diaSiguienteTutorias_(d.hasta)] = true;
  });
  /* Las fechas: al revés, y dos ocupantes del mismo cargo que se pisan (una vez por pareja, como Cargos.solapes del Gestor). */
  ocupantes.forEach(function (r) {
    const d = r.datos;
    if (d.desde && d.hasta && d.hasta < d.desde) avisos.push({ tipo: conj.conjunto + '-fechas', id: null, datos: { detalle: 'al-reves', cargoNombre: d.cargoNombre || null, ocupantes: [ocupanteDeAviso_(d)] } });
  });
  ocupantes.forEach(function (a, i) {
    ocupantes.slice(i + 1).forEach(function (b) {
      const x = a.datos, y = b.datos;
      if (x.cargo !== y.cargo || !x.desde || !y.desde || (x.hasta && x.hasta < x.desde) || (y.hasta && y.hasta < y.desde) || !tramosSePisan_(x, y)) return;
      avisos.push({ tipo: conj.conjunto + '-fechas', id: null, datos: { detalle: 'se-pisan', cargoNombre: x.cargoNombre || null, ocupantes: [ocupanteDeAviso_(x), ocupanteDeAviso_(y)] } });
    });
  });
  objeto.hoy = hoy; objeto.personalMirado = mirado;
  objeto.cargos = Object.keys(cargos).length; objeto.ocupadosHoy = Object.keys(ocupados).length;
  return { cifras: { cargos: objeto.cargos, ocupadosHoy: objeto.ocupadosHoy }, dias: Object.keys(dias).sort() };
}

/* ==== HechosContactos.gs ==== */
/* El conjunto `contactos` (fila 98): correo del centro, correo personal y móvil de cada docente. Lo que trae Séneca se usa; lo escrito a mano manda. Lo escrito vive en _interno/contactos-a-mano.json y solo lo escribe el
   trabajo de fondo (ContactosCambios.gs). Son datos de personas: ningún valor sale de aquí hacia diagnostico/, comprobaciones, avisos con valor ni documentos; en Drive solo viven en la parte y en el fichero de lo escrito. */
const CAMPOS_DE_CONTACTO_ = ['correoCentro', 'correoPersonal', 'movil'];
const ARCHIVO_CONTACTOS_ = 'contactos-a-mano.json';
const DOMINIOS_DEL_CENTRO_ = ['g.educaand.es', 'juntadeandalucia.es'];
const CONTACTOS_IGNORADOS_MAX_ = 20;
const MOTIVO_MOVIL_ = 'El móvil tiene que tener 9 cifras y empezar por 6 o 7.';
const MOTIVO_CORREO_ = 'El correo tiene que llevar un nombre, una arroba y un dominio con punto, sin espacios.';

/* ---- Reglas de forma (las mismas para Séneca, para esta pantalla y para Ausencias y Guardias) ---- */

/* «+34 612 34 56 78», «0034612345678» y «612.345.678» → «612345678». '' si no son 9 cifras que empiecen por 6 o 7. */
function movilDeContacto_(texto) {
  const t = String(texto === null || texto === undefined ? '' : texto).replace(/[\s.\-()]/g, '').replace(/^(\+34|0034)/, '');
  return /^[67]\d{8}$/.test(t) ? t : '';
}

/* Se guarda en minúsculas. '' si tiene espacios, no tiene una sola arroba o su dominio no tiene punto. */
function correoDeContacto_(texto) {
  const t = String(texto === null || texto === undefined ? '' : texto).trim().toLowerCase();
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(t) ? t : '';
}

/* Un valor escrito para un dato: { ok, valor } (valor '' = borrar) o { ok: false, motivo }. */
function validarContacto_(campo, texto) {
  if (CAMPOS_DE_CONTACTO_.indexOf(campo) === -1) return { ok: false, motivo: 'Ese dato no existe.' };
  const t = String(texto === null || texto === undefined ? '' : texto).trim();
  if (!t) return { ok: true, valor: '' };
  const v = campo === 'movil' ? movilDeContacto_(t) : correoDeContacto_(t);
  return v ? { ok: true, valor: v } : { ok: false, motivo: campo === 'movil' ? MOTIVO_MOVIL_ : MOTIVO_CORREO_ };
}

/* Como se enseña: el móvil «612 345 678»; el correo, tal cual. */
function textoDeContacto_(campo, valor) {
  return campo === 'movil' && /^\d{9}$/.test(String(valor)) ? String(valor).replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') : String(valor || '');
}

/* ---- Lo escrito a mano ---- */

/* { version, personas: { id: { empleado, correoCentro: { valor, quien, app, cuando }, … } }, ignorados: [{ clave, detalle, app, cuando }], ignoradosTotal }. `valor` '' es un borrado. */
function contactosAMano_(raiz) {
  const a = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_CONTACTOS_) || {};
  return { version: a.version || 0, personas: a.personas || {}, ignorados: Array.isArray(a.ignorados) ? a.ignorados : [], ignoradosTotal: a.ignoradosTotal || 0 };
}

function hayContactosAMano_(am) { return Object.keys(am.personas).length > 0 || am.ignorados.length > 0; }

/* ---- De dónde sale la parte ---- */

/* Los listados `personal` del curso de hoy, que son las fuentes de la parte. Cada uno: { fuente, entrada, k }. Si no se han leído todos, el personal aún no está montado: se espera. */
function fuentesDeContactos_(indice) {
  const f = CONJUNTOS_.filter(function (c) { return c.conjunto === 'personal'; })[0].fuentes[0], curso = cursoActual_();
  return indice.listados.filter(function (e) { return e.clave === f.clave && !e.porAlumno && e.cursoEscolar === curso; })
    .sort(function (a, b) { return (a.variante || '') < (b.variante || '') ? -1 : ((a.variante || '') > (b.variante || '') ? 1 : 0); })
    .map(function (e) { return { fuente: f, entrada: e, k: claveLeido_(e.clave, e.variante) }; });
}

/* Una sola parte, `todos`, si hay personal del curso de hoy o algo escrito a mano. `version` es la de lo escrito: entra en la clave de montaje. */
function partesDeContactos_(necesarias, am) {
  return necesarias.length || hayContactosAMano_(am) ? [{ parte: 'todos', cursoEscolar: '', anio: 0, entera: true, version: am.version }] : [];
}

/* Lo que cambia el montaje además de los listados: el número del montador, el curso de hoy, la huella de la parte del personal y la versión de lo escrito. */
function claveDeMontajeContactos_(conj, parte, indice) {
  const hp = parteVecinaTutorias_(indice, 'personal', cursoActual_(), 'curso');
  return conj.versionMontador + '|' + cursoActual_() + '|' + (hp ? hp.huella : '') + '|' + parte.version;
}

function fuentesDeParteContactos_(necesarias) {
  return necesarias.map(function (x) { return { clave: x.entrada.clave, variante: x.entrada.variante || '', huella: x.entrada.huella }; });
}

/* ---- Montar ---- */

/* Lo que trae Séneca de una ficha del personal: correo (del centro o personal, según su dominio) y móvil. Solo si tienen la forma. */
function contactosDeSeneca_(d) {
  const s = {}, correo = correoDeContacto_(d.correo), movil = movilDeContacto_(d.telefono);
  if (correo) s[DOMINIOS_DEL_CENTRO_.indexOf(correo.split('@')[1]) !== -1 ? 'correoCentro' : 'correoPersonal'] = correo;
  if (movil) s.movil = movil;
  return s;
}

/* La parte `todos`. `personal` = la parte del personal del curso de hoy (o null). Un registro por docente de esa parte y por cualquiera con algo escrito a mano. */
function montarContactos_(conj, personal, am) {
  const delPersonal = {}, ids = [];
  (personal ? personal.registros : []).forEach(function (r) {
    delPersonal[r.id] = r;
    if (r.datos.tipoPersonal !== 'no-docente') ids.push(r.id);
  });
  Object.keys(am.personas).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
  const registros = ids.map(function (id) {
    const r = delPersonal[id], mano = am.personas[id] || {}, seneca = r ? contactosDeSeneca_(r.datos) : {};
    const datos = { empleado: (r && r.datos.empleado) || mano.empleado || '' }, origen = {};
    if (!datos.empleado) delete datos.empleado;
    CAMPOS_DE_CONTACTO_.forEach(function (c) {
      const a = mano[c];
      if (a && a.valor) { datos[c] = a.valor; origen[c] = { de: 'a-mano', quien: a.quien, app: a.app, cuando: a.cuando }; }
      else if (seneca[c]) { datos[c] = seneca[c]; origen[c] = a ? { de: 'seneca', borradoPor: { quien: a.quien, app: a.app, cuando: a.cuando } } : { de: 'seneca' }; }
    });
    if (Object.keys(origen).length) datos.origen = origen;
    return { id: id, datos: datos };
  });
  registros.sort(function (a, b) {
    const x = normalizarAlumno_(a.datos.empleado), y = normalizarAlumno_(b.datos.empleado);
    return x < y ? -1 : (x > y ? 1 : (a.id < b.id ? -1 : 1));
  });
  const avisos = am.ignorados.map(function (i) { return { tipo: 'contactos-cambio-ignorado', id: null, datos: { detalle: i.detalle } }; });
  return { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: conj.parteNombre, cursoEscolar: '', generado: ahoraMadrid_(), origen: DUENO_CD_, campos: conj.campos.map(function (c) { return Object.assign({}, c); }), registros: registros, avisos: avisos };
}

/* La tarea «montar»: abre la parte del personal del curso de hoy, mira lo escrito a mano, la monta y apunta las cuentas (solo cifras) para estado.json. */
function montarParteDeContactos_(raiz, t, avance, cache, indice) {
  const t0 = new Date().getTime();
  const hp = parteVecinaTutorias_(indice, 'personal', cursoActual_(), 'curso');
  const am = contactosAMano_(raiz);
  const objeto = montarContactos_(t.conj, hp ? abrirParteVecina_(hp, cache) : null, am);
  cerrarMontaje_(raiz, t, avance, objeto, t0);
  avance.cifras = avance.cifras || {};
  avance.cifras[t.ruta] = {
    contactos: objeto.registros.length,
    contactosAMano: objeto.registros.filter(function (r) { return r.datos.origen && CAMPOS_DE_CONTACTO_.some(function (c) { return r.datos.origen[c] && r.datos.origen[c].de === 'a-mano'; }); }).length,
    contactosCambiosIgnorados: am.ignoradosTotal
  };
}

/* ---- Lo que enseña la pantalla ---- */

function diaHoraDeContacto_(iso) {
  const ms = Date.parse(iso);
  const m = isNaN(ms) ? null : /^\d{4}-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(ahoraMadrid_(new Date(ms)));
  return m ? m[2] + '/' + m[1] + ' ' + m[3] + ':' + m[4] : '';
}

/* «Pepa Ruiz · 28/10 12:40», «Juan Pérez, desde Ausencias · 29/10 10:12» o «Séneca»; '' si la persona no tiene ningún dato. Cuenta el cambio más reciente de los tres datos (un borrado también). */
function ultimoCambioDeContacto_(origen) {
  let mejor = null, hay = false;
  CAMPOS_DE_CONTACTO_.forEach(function (c) {
    const o = origen && origen[c];
    if (!o) return;
    hay = true;
    const x = o.de === 'a-mano' ? o : (o.borradoPor || null);
    if (x && (!mejor || Date.parse(x.cuando) > Date.parse(mejor.cuando))) mejor = x;
  });
  if (!hay) return '';
  if (!mejor) return 'Séneca';
  const de = mejor.app && mejor.app !== DUENO_CD_ ? ', desde ' + (mejor.app === 'ausencias-guardias-ies' ? 'Ausencias' : mejor.app) : '';
  return (mejor.quien || '') + de + ' · ' + diaHoraDeContacto_(mejor.cuando);
}

/* La tabla de la pestaña: una fila por docente del curso de hoy, por orden alfabético, con lo que la pantalla necesita para pintarla (`valores`, de dónde sale cada uno en `origen` y lo que traería Séneca sin lo escrito).
   Quien solo está por tener algo escrito a mano y ya no está en Séneca no sale. */
function contactosParaPagina_(raiz) {
  const indice = leerIndice_(raiz), hp = parteVecinaTutorias_(indice, 'personal', cursoActual_(), 'curso'), hc = partesDelConjunto_(indice, 'contactos', 'todos')[0];
  const res = { curso: cursoActual_(), hay: !!hc, filas: [] };
  if (!hc) return res;
  const docentes = {};
  if (hp) abrirParteVecina_(hp, {}).registros.forEach(function (r) { if (r.datos.tipoPersonal !== 'no-docente') docentes[r.id] = r; });
  abrirParteVecina_(hc, {}).registros.forEach(function (r) {
    if (!docentes[r.id]) return;
    const valores = {};
    CAMPOS_DE_CONTACTO_.forEach(function (c) { if (r.datos[c]) valores[c] = r.datos[c]; });
    res.filas.push({ id: r.id, empleado: r.datos.empleado || '', valores: valores, origen: r.datos.origen || {}, seneca: contactosDeSeneca_(docentes[r.id].datos) });
  });
  return res;
}

/* ==== ContactosCambios.gs ==== */
/* Los cambios de contactos (fila 98). Una aplicación (y la propia página nueva) deja en entrada/ un `CAMBIOS contactos <aplicación>.json` con TODOS sus cambios que aún no ve publicados; el trabajo de fondo lo recoge, aplica cada
   cambio solo si es posterior al guardado («gana el último»), rehace la parte y borra el fichero: lo vigente queda en _interno/contactos-a-mano.json, que solo escribe este código desde la vuelta de fondo.
   Un cambio que no vale (persona que no se reconoce, valor mal formado) se ignora y se cuenta; en los avisos va una frase llana sin ningún valor. */
const NOMBRE_CAMBIOS_CONTACTOS_ = 'CAMBIOS contactos centro-de-datos-ies.json';

/* ['cambios contactos ausencias-guardias-ies.json', 'contactos', 'ausencias-guardias-ies'] o null. */
function cambiosDeEntrada_(nombre) { return /^cambios ([a-z0-9-]+) ([a-z0-9-]+)\.json$/.exec(normalizarNombre_(nombre)); }

/* ¿Puede esa aplicación mandar cambios a ese conjunto? La propia página siempre. */
function aceptaCambios_(conjunto, app) {
  const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === conjunto && c.cambios; })[0];
  return !!conj && (app === DUENO_CD_ || conj.cambios.indexOf(app) !== -1);
}

/* Aplica los cambios de `o` sobre lo escrito a mano. Devuelve { aplicados, ignorados, viejos }. Escribe _interno/contactos-a-mano.json solo si algo cambió. */
function aplicarCambiosDeContactos_(raiz, o, app) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return aplicarCambiosDeContactosInterno_(raiz, o, app); } finally { lock.releaseLock(); }
}

function aplicarCambiosDeContactosInterno_(raiz, o, app) {
  const am = contactosAMano_(raiz), indice = leerIndice_(raiz), hp = parteVecinaTutorias_(indice, 'personal', cursoActual_(), 'curso');
  const conocidos = {}, porNombre = {};
  (hp ? abrirParteVecina_(hp, {}).registros : []).forEach(function (r) {
    conocidos[r.id] = r.datos.empleado || '';
    if (r.datos.tipoPersonal === 'no-docente') return;
    const k = claveNombreConsejo_(r.datos.apellidos && r.datos.nombre ? r.datos.apellidos + ' ' + r.datos.nombre : r.datos.empleado);
    if (k) (porNombre[k] = porNombre[k] || []).push(r.id);
  });
  Object.keys(am.personas).forEach(function (id) { if (conocidos[id] === undefined) conocidos[id] = am.personas[id].empleado || ''; });
  const cuenta = { aplicados: 0, ignorados: 0, viejos: 0 };
  let cambio = false;
  const ignorar = function (c, detalle) {
    const clave = [app, c && c.id, c && c.campo, c && c.cuando, detalle].join('|');
    if (am.ignorados.some(function (i) { return i.clave === clave; })) return;
    am.ignorados.push({ clave: clave, detalle: detalle, app: app, cuando: ahoraMadrid_() });
    am.ignorados = am.ignorados.slice(-CONTACTOS_IGNORADOS_MAX_);
    am.ignoradosTotal++; cuenta.ignorados++; cambio = true;
  };
  o.lista.forEach(function (c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) { ignorar(null, 'Un cambio no estaba bien hecho.'); return; }
    const ms = Date.parse(c.cuando);
    if (CAMPOS_DE_CONTACTO_.indexOf(c.campo) === -1 || typeof c.valor !== 'string' || typeof c.cuando !== 'string' || isNaN(ms)) { ignorar(c, 'Un cambio no estaba bien hecho.'); return; }
    let id = typeof c.id === 'string' ? c.id : '';
    if (conocidos[id] === undefined) {
      const k = claveNombreConsejo_(c.empleado), coinciden = k ? porNombre[k] || [] : [];
      id = coinciden.length === 1 ? coinciden[0] : '';
    }
    if (!id) { ignorar(c, 'Un cambio era de una persona que no se reconoce.'); return; }
    const v = validarContacto_(c.campo, c.valor);
    if (!v.ok) { ignorar(c, c.campo === 'movil' ? 'Un cambio traía un móvil con una forma que no vale.' : 'Un cambio traía un correo con una forma que no vale.'); return; }
    const actual = (am.personas[id] || {})[c.campo];
    if (actual && Date.parse(actual.cuando) >= ms) { cuenta.viejos++; return; }
    const p = am.personas[id] = am.personas[id] || {};
    p.empleado = conocidos[id] || (typeof c.empleado === 'string' ? c.empleado.trim() : '') || p.empleado || '';
    p[c.campo] = { valor: v.valor, quien: typeof c.quien === 'string' && c.quien.trim() ? c.quien : app, app: app, cuando: c.cuando };
    cuenta.aplicados++; cambio = true;
  });
  if (cambio) { am.version++; escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_CONTACTOS_, am); }
  return cuenta;
}

/* Un fichero de entrada/: si es un `CAMBIOS …` de quien puede mandarlo y está bien hecho, se aplica y devuelve { estado: 'aplicado', … }; si no, null (va a «Sin clasificar» como cualquier fichero que no se entiende). */
function recibirCambios_(raiz, nombre, bytes) {
  const m = cambiosDeEntrada_(nombre);
  if (!m || !aceptaCambios_(m[1], m[2])) return null;
  let o = null;
  try { o = JSON.parse(bytesATexto_(bytes)); } catch (e) { return null; }
  if (!o || o.cambios !== 1 || o.conjunto !== m[1] || o.origen !== m[2] || !Array.isArray(o.lista)) return null;
  const cuenta = aplicarCambiosDeContactos_(raiz, o, m[2]);
  apuntarMovimiento_(raiz, { quien: m[2], via: 'entrada', fichero: nombre, que: 'guardado', mensaje: 'Cambios de contactos aplicados: ' + cuenta.aplicados + (cuenta.ignorados ? ' · ignorados: ' + cuenta.ignorados : '') });
  ajustarTestigo_(raiz, true);   // la parte se rehace en la próxima tanda
  return Object.assign({ estado: 'aplicado' }, cuenta);
}

/* Lo que hace la página nueva al guardar una casilla: deja en entrada/ SU `CAMBIOS contactos …` con todos sus cambios aún no vistos publicados (los de este navegador, que trae `c.pendientes`, y los que ya hubiera en el fichero, de otro
   navegador), el último de cada persona y dato. `c` = { id, empleado, campo, valor, quien, pendientes }. Devuelve { estado: 'ok', valor, cuando } o { estado: 'mal', motivo }. */
function guardarCambioDeContacto_(raiz, c) {
  const v = validarContacto_(c.campo, c.valor);
  if (!v.ok) return { estado: 'mal', motivo: v.motivo };
  if (!c.id || typeof c.id !== 'string') return { estado: 'mal', motivo: 'No sé de quién es ese dato.' };
  const cuando = ahoraMadrid_();
  const nuevo = { id: c.id, empleado: String(c.empleado || ''), campo: c.campo, valor: v.valor, quien: String(c.quien || DUENO_CD_), cuando: cuando };
  const entrada = subcarpetaPorRuta_(raiz, 'entrada'), it = entrada.getFilesByName(NOMBRE_CAMBIOS_CONTACTOS_), f = it.hasNext() ? it.next() : null;
  let antes = [];
  if (f) { try { const o = JSON.parse(f.getBlob().getDataAsString('UTF-8')); if (o && Array.isArray(o.lista)) antes = o.lista; } catch (e) { antes = []; } }
  const ultimo = {};
  antes.concat(Array.isArray(c.pendientes) ? c.pendientes : [], [nuevo]).forEach(function (x) {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || CAMPOS_DE_CONTACTO_.indexOf(x.campo) === -1 || isNaN(Date.parse(x.cuando))) return;
    const k = x.id + '|' + x.campo;
    if (!ultimo[k] || Date.parse(x.cuando) >= Date.parse(ultimo[k].cuando)) ultimo[k] = x;
  });
  const texto = JSON.stringify({ cambios: 1, conjunto: 'contactos', origen: DUENO_CD_, generado: cuando, lista: Object.keys(ultimo).map(function (k) { return ultimo[k]; }) });
  if (f) f.setContent(texto); else entrada.createFile(NOMBRE_CAMBIOS_CONTACTOS_, texto, 'application/json');
  return { estado: 'ok', valor: v.valor, cuando: cuando };
}

/* ==== HechosTandas.gs ==== */
/* Las tandas: leen lo que falte, montan lo que no esté al día y escriben, mirando el reloj. El avance vive en _interno/hechos.json y solo lleva palabras y cifras:
   { enMarcha, sinAvance, atascado, firma, leidos: {clave: {version, huella, anos}}, montado: {ruta: clave de montaje}, segundos: {lectores, montadores}, ultima }.
   Tres caminos las lanzan: la página abierta (webHechosSeguir), la recogida de entrada/ (recogerEntrada_) y el testigo que deja en entrada/ si queda trabajo. */
const HECHOS_TOPE_PAGINA_MS_ = 20 * 1000;
const HECHOS_EXCLUSIVA_MS_ = 7 * 60 * 1000;
const HECHOS_SIN_AVANCE_MAX_ = 6;
const NOMBRE_TESTIGO_ = '_pendiente.txt';
const TEXTO_TESTIGO_ = 'Esto no es un listado: lo deja el Centro de datos mientras le queda trabajo con los datos ya hechos. Se quita solo.';

function avanceNuevo_() {
  return { enMarcha: 0, sinAvance: 0, atascado: false, firma: '', leidos: {}, montado: {}, avisos: {}, dias: {}, segundos: { lectores: {}, montadores: {} }, ultima: '' };
}

function leerAvance_(raiz) {
  const a = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'hechos.json');
  return a ? Object.assign(avanceNuevo_(), a) : avanceNuevo_();
}

function escribirAvance_(raiz, avance) { escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), 'hechos.json', avance); }

/* Los listados de los que vive un conjunto ahora mismo: el primero (siempre) y, de cada fuente «por curso», los de los cursos que se publican.
   Cada uno: { fuente, entrada, k } con `k` = cómo se llama lo leído. Null si falta el primero. */
function fuentesNecesarias_(indice, avance, conj) {
  if (conj.entregadoPor) return fuentesDeEntero_(indice, conj);
  if (conj.deContactos) return fuentesDeContactos_(indice);
  if (conj.porPeriodos) return fuentesDeConsejo_(indice, conj);
  if (conj.porCursos) return fuentesPorCursos_(indice, conj);
  const primera = conj.fuentes[0];
  const e0 = buscarEnIndice_(indice, primera.clave, '');
  if (!e0) return null;
  const lista = [{ fuente: primera, entrada: e0, k: primera.clave }];
  const cursos = partesDe_(conj.montador)(avance.leidos[primera.clave]).filter(function (p) { return p.anio; }).map(function (p) { return p.cursoEscolar; });
  conj.fuentes.slice(1).forEach(function (f) {
    if (f.porAlumno) {
      /* Un tipo de ficheros «de un solo alumno»: su entrada de resumen del índice (con la huella de todos sus ficheros). */
      const r = indice.listados.filter(function (e) { return e.clave === f.clave && e.porAlumno; })[0];
      if (r) lista.push({ fuente: f, entrada: r, k: f.clave });
      return;
    }
    indice.listados.filter(function (e) { return e.clave === f.clave && !e.porAlumno && cursos.indexOf(e.cursoEscolar) !== -1; })
      .sort(function (a, b) { return (a.variante || '') < (b.variante || '') ? -1 : 1; })
      .forEach(function (e) { lista.push({ fuente: f, entrada: e, k: claveLeido_(e.clave, e.variante) }); });
  });
  return lista;
}

function leidoAlDia_(avance, x) {
  const l = avance.leidos[x.k];
  return !!l && l.huella === x.entrada.huella && l.version === x.fuente.versionLector;
}

/* Todos los listados que alimentan algún conjunto, para saber si ha cambiado algo. */
function firmaDeFuentes_(indice) {
  const claves = {};
  CONJUNTOS_.forEach(function (conj) { conj.fuentes.forEach(function (f) { claves[f.clave] = true; }); if (conj.entregadoPor) claves[FUENTE_ENTREGA_.clave] = true; });
  return indice.listados.filter(function (e) { return claves[e.clave]; }).map(function (e) { return e.clave + '/' + (e.variante || '') + ':' + e.huella; }).sort().join('|');
}

/* Las fuentes de una parte, con la huella con que se leyó cada una: el primer listado; si la parte es de un curso, los de ese curso; y, si ese curso tiene matrícula,
   las fuentes «solo para las actuales» (los expedientes). */
function fuentesDeParte_(conj, parte, necesarias, avance) {
  if (conj.entregadoPor) return fuenteDeParteEntero_(necesarias, avance);
  if (conj.deContactos) return fuentesDeParteContactos_(necesarias);
  if (conj.porPeriodos) return fuentesDeParteConsejo_(parte, necesarias, avance);
  if (conj.porCursos) {
    return necesarias.filter(function (x) { return x.entrada.cursoEscolar === parte.cursoEscolar; })
      .map(function (x) { return { clave: x.entrada.clave, variante: x.entrada.variante || '', huella: (avance.leidos[x.k] || {}).huella || '' }; });
  }
  const conMatricula = !!parte.anio && necesarias.some(function (x) { return x.fuente.esMatricula && x.entrada.cursoEscolar === parte.cursoEscolar; });
  return necesarias.filter(function (x) {
    if (x.fuente === conj.fuentes[0]) return true;
    if (x.fuente.porCurso) return !!parte.anio && x.entrada.cursoEscolar === parte.cursoEscolar;
    return conMatricula && !!x.fuente.soloActuales;
  }).map(function (x) { return { clave: x.entrada.clave, variante: x.entrada.variante || '', huella: (avance.leidos[x.k] || {}).huella || '' }; });
}

function mismasFuentes_(a, b) { return JSON.stringify(a || []) === JSON.stringify(b || []); }

/* Lo que se monta con las mismas fuentes: el número del montador y, en `antiguos`, qué cursos se publican (cambia con el día). */
function claveDeMontaje_(conj, parte, partes, indice, avance, necesarias) {
  /* Con un día prestado (el ensayo de la página nueva, fila 57) la clave lo lleva al final: si la aplicación de hoy monta con otro día, el ensayo se rehace. Sin día prestado, queda como siempre. */
  const prestado = DIAS_PRESTADOS_[rutaDeParte_(conj.conjunto, parte)], hoy = prestado || hoyMadrid_(), cola = prestado ? '|hoy=' + prestado : '';
  if (conj.entregadoPor) return claveDeMontajeEntero_(conj, indice, avance, hoy) + cola;
  if (conj.deContactos) return claveDeMontajeContactos_(conj, parte, indice);
  if (conj.porPeriodos) return claveDeMontajeConsejo_(conj, parte, necesarias, indice, avance, hoy) + cola;
  if (conj.conDias) return claveDeMontajeTutorias_(conj, parte, necesarias, indice, avance, hoy) + cola;
  if (conj.porCursos) return conj.versionMontador + '|' + conj.fuentes[0].versionLector;
  return conj.versionMontador + '|' + (parte.anio ? '' : partes.map(function (p) { return p.cursoEscolar; }).join(','));
}

/* Todo lo que falta por hacer, sin abrir ningún fichero grande. Cada tarea: { que: 'leer' | 'quitar' | 'montar', conj, ... }. Con `soloConj` (el ensayo de la página nueva, filas 46 y 47; un nombre o una lista): solo esos conjuntos y sin su ficha completa. */
function tareasDeHechos_(indice, avance, soloConj) {
  const tareas = [];
  if (indice.ocupado) return tareas;
  CONJUNTOS_.forEach(function (conj) {
    if (soloConj && [].concat(soloConj).indexOf(conj.conjunto) === -1) return;
    if (!soloConj && EXCLUIDOS_MONTAJE_.indexOf(conj.conjunto) !== -1) return;   // lo está montando la página nueva con su turno vigente (fila 59, Turno.gs)
    const necesarias = fuentesNecesarias_(indice, avance, conj);
    if (!necesarias) return;
    const aMano = conj.deContactos ? contactosAMano_(carpetaDatos_()) : null;   // lo escrito a mano de los contactos (no se lee desde los listados)
    if (sinListadoPropio_(conj) && !necesarias.length && !(indice.hechos || []).some(function (h) { return h.conjunto === conj.conjunto; }) && !(aMano && hayContactosAMano_(aMano))) return;
    const antesDeConj = tareas.length;
    const porLeer = necesarias.filter(function (x) { return !leidoAlDia_(avance, x); });
    if (porLeer.length) { if (!conj.deContactos) porLeer.forEach(function (x) { tareas.push({ que: 'leer', conj: conj, fuente: x.fuente, entrada: x.entrada, k: x.k }); }); return; }   // los contactos esperan a que el personal esté leído
    const partes = conj.deContactos ? partesDeContactos_(necesarias, aMano) : conj.entregadoPor ? partesDeEntero_(necesarias, conj) : conj.porPeriodos ? partesDeConsejo_(necesarias) : conj.porCursos ? partesPorCursos_(necesarias) : partesDe_(conj.montador)(avance.leidos[conj.fuentes[0].clave]);
    const rutas = partes.map(function (p) { return rutaDeParte_(conj.conjunto, p); });
    (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto && rutas.indexOf(h.ruta) === -1; })
      .forEach(function (h) { tareas.push({ que: 'quitar', conj: conj, entrada: h }); });
    partes.forEach(function (p, i) {
      const h = (indice.hechos || []).filter(function (x) { return x.ruta === rutas[i]; })[0];
      const fuentes = fuentesDeParte_(conj, p, necesarias, avance);
      const clave = claveDeMontaje_(conj, p, partes, indice, avance, necesarias);
      if (!h || !mismasFuentes_(h.fuentes, fuentes) || avance.montado[rutas[i]] !== clave) {
        tareas.push({ que: 'montar', conj: conj, parte: p, partes: partes, ruta: rutas[i], previa: h || null, fuentes: fuentes, necesarias: necesarias, clave: clave });
      }
    });
    /* La ficha completa, cuando ya está todo lo demás de este conjunto al día. */
    if (!soloConj && tareas.length === antesDeConj) { const f = tareaDeFichaCompleta_(indice, avance, conj); if (f) tareas.push(f); }
  });
  return tareas;
}

/* ¿Queda algo por leer, quitar o montar? (Las comprobaciones no cuentan.) */
function hechosHayTrabajo_(raiz) {
  excluirMontaje_(turnoExcluidos_(raiz));
  try { return hechosHayTrabajoInterno_(raiz); } finally { excluirMontaje_([]); }
}

function hechosHayTrabajoInterno_(raiz) {
  const indice = leerIndice_(raiz);
  if (indice.ocupado) return false;
  const avance = leerAvance_(raiz);
  if (avance.atascado && avance.firma === firmaDeFuentes_(indice)) return false;
  return tareasDeHechos_(indice, avance).length > 0;
}

function testigoDe_(raiz) {
  const it = subcarpetaPorRuta_(raiz, 'entrada').getFilesByName(NOMBRE_TESTIGO_);
  return it.hasNext() ? it.next() : null;
}

function ajustarTestigo_(raiz, queda) {
  const t = testigoDe_(raiz);
  if (queda && !t) subcarpetaPorRuta_(raiz, 'entrada').createFile(NOMBRE_TESTIGO_, TEXTO_TESTIGO_, 'text/plain');
  else if (!queda && t) t.setTrashed(true);
}

/* Cambia el índice con el cerrojo puesto (solo para escribir). */
function cambiarIndiceHechos_(raiz, cambio) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const indice = leerIndice_(raiz);
    cambio(indice);
    escribirIndice_(raiz, indice);
  } finally { lock.releaseLock(); }
}

/* Una tanda de como mucho `topeMs` (la primera tarea se hace siempre). Devuelve { quedan, ocupada }. Nunca dos a la vez. */
function hechosTanda_(raiz, topeMs) {
  excluirMontaje_(turnoExcluidos_(raiz));
  try { return hechosTandaInterna_(raiz, topeMs); } finally { excluirMontaje_([]); }
}

function hechosTandaInterna_(raiz, topeMs) {
  const inicio = new Date().getTime();
  const lock = LockService.getScriptLock();
  let avance;
  try { rellenarIds_(raiz); } catch (e) { /* las tandas abren por ruta si falta el id */ }
  lock.waitLock(30000);
  try {
    avance = leerAvance_(raiz);
    if (avance.enMarcha && inicio - avance.enMarcha < HECHOS_EXCLUSIVA_MS_) return { quedan: true, ocupada: true };
    if (leerIndice_(raiz).ocupado) return { quedan: false };
    avance.enMarcha = inicio;
    escribirAvance_(raiz, avance);
  } finally { lock.releaseLock(); }
  let avanzo = false, fallo = null, habiaTrabajo = false;
  try {
    if (avance.atascado && avance.firma !== firmaDeFuentes_(leerIndice_(raiz))) { avance.atascado = false; avance.sinAvance = 0; }
    quitarLeidoViejo_(raiz, leerIndice_(raiz), avance);
    habiaTrabajo = tareasDeHechos_(leerIndice_(raiz), avance).length > 0;
    if (habiaTrabajo) { escribirAvance_(raiz, avance); escribirEstadoHechos_(raiz); }
    let hechas = 0;
    const cache = {};
    while (true) {
      const indice = leerIndice_(raiz);
      const tareas = tareasDeHechos_(indice, avance);
      if (!tareas.length || hechas >= 200 || (hechas > 0 && new Date().getTime() - inicio >= topeMs)) break;
      /* Montar la ficha completa pide tiempo: si ya se ha trabajado en esta tanda y queda menos de un minuto, espera a la siguiente. */
      if (tareas[0].que === 'completa' && hechas > 0 && inicio + topeMs - new Date().getTime() < 60000) break;
      hacerTareaHechos_(raiz, tareas[0], indice, avance, cache, inicio + topeMs);
      hechas++; avanzo = true;
      escribirAvance_(raiz, avance);
    }
  } catch (e) { fallo = e; }
  const indice = leerIndice_(raiz);
  let quedan = tareasDeHechos_(indice, avance).length > 0;
  if (fallo || (quedan && !avanzo)) avance.sinAvance++; else avance.sinAvance = 0;
  if (quedan && avance.sinAvance >= HECHOS_SIN_AVANCE_MAX_) { avance.atascado = true; avance.firma = firmaDeFuentes_(indice); quedan = false; }
  else if (!quedan) avance.atascado = false;
  avance.enMarcha = 0;
  avance.ultima = ahoraMadrid_();
  avance.segundos.tandaMax = Math.max(avance.segundos.tandaMax || 0, Math.round((new Date().getTime() - inicio) / 1000));
  escribirAvance_(raiz, avance);
  try { if (habiaTrabajo) escribirEstadoHechos_(raiz); } catch (e) { /* el estado es informativo: se reintenta en la próxima tanda */ }
  ajustarTestigo_(raiz, quedan || hayCambiosPorVenir_(indice, avance));
  /* Con todo al día, y con el tiempo que sobre, las comprobaciones (si no se ha hecho nada más en esta tanda, al menos una). */
  if (!quedan) {
    try { pasadaComprobaciones_(raiz, inicio + topeMs, !avanzo); } catch (e) { /* las comprobaciones nunca rompen una tanda */ }
  }
  if (fallo) throw fallo;
  return { quedan: quedan || hayComprobacionesDebidas_(raiz) };
}

/* Quien monta una parte (fila 59) queda apuntado por conjunto en el avance: `avance.quien[conjunto]` es 'pagina' o 'aplicacion'. */
function hacerTareaHechos_(raiz, t, indice, avance, cache, limite) {
  hacerTareaHechosInterna_(raiz, t, indice, avance, cache, limite);
  if (t.que === 'montar') { avance.quien = avance.quien || {}; avance.quien[t.conj.conjunto] = QUIEN_MONTA_; }
}

function hacerTareaHechosInterna_(raiz, t, indice, avance, cache, limite) {
  const conj = t.conj;
  if (t.que === 'leer') { if (t.fuente.porAlumno) leerExpedientes_(raiz, t, avance, limite); else leerUnaFuente_(raiz, t, avance); return; }
  if (t.que === 'completa') { montarFichaCompleta_(raiz, t, avance, cache); return; }
  if (t.que === 'quitar') {
    cambiarIndiceHechos_(raiz, function (ind) { ind.hechos = (ind.hechos || []).filter(function (h) { return h.ruta !== t.entrada.ruta; }); });
    try { ficheroDeEntrada_(t.entrada).setTrashed(true); } catch (e) { /* ya no estaba */ }
    delete avance.montado[t.entrada.ruta]; delete avance.avisos[t.entrada.ruta];
    if (avance.cifras) delete avance.cifras[t.entrada.ruta];
    if (avance.dias) delete avance.dias[t.entrada.ruta];
    if (avance.libros) delete avance.libros[t.entrada.ruta];
    if (t.entrada.parte === 'historial') delete avance.consejo;
    if (conj.entregadoPor) { if (avance.entregas) delete avance.entregas[conj.conjunto]; if (avance.entregados) delete avance.entregados[conj.conjunto]; if (avance.desgloses) delete avance.desgloses[conj.conjunto]; if (avance.cuentas) delete avance.cuentas[conj.conjunto]; if (avance.cifras) delete avance.cifras[t.entrada.ruta]; }
    return;
  }
  /* montar */
  if (conj.entregadoPor) { montarParteDeEntero_(raiz, t, avance, cache, indice); return; }
  if (conj.deContactos) { montarParteDeContactos_(raiz, t, avance, cache, indice); return; }
  if (conj.porCursos) { ({ tutorias: montarParteDeTutorias_, 'consejo-escolar': montarParteDeConsejo_, libros: montarParteDeLibros_ }[conj.conjunto] || montarParteDePersonal_)(raiz, t, avance, cache, indice); return; }
  const t0 = new Date().getTime();
  const cargar = function (k) {
    if (cache[k]) return cache[k];
    const leido = cargarLeido_(raiz, k);
    if (!leido || !avance.leidos[k] || leido.huella !== avance.leidos[k].huella) { delete avance.leidos[k]; return null; }
    return (cache[k] = leido);
  };
  const primero = cargar(conj.fuentes[0].clave);
  const matriculas = t.necesarias.filter(function (x) { return x.fuente.esMatricula && t.parte.anio && x.entrada.cursoEscolar === t.parte.cursoEscolar; })
    .map(function (x) { return cargar(x.k); });
  /* Las demás fuentes de la parte: el censo (si hay uno de su curso) y los expedientes (si la parte tiene matrícula). */
  const otros = {};
  t.necesarias.forEach(function (x) {
    if (x.fuente === conj.fuentes[0] || x.fuente.esMatricula || !t.parte.anio) return;
    if (x.fuente.porAlumno ? !matriculas.length : x.entrada.cursoEscolar !== t.parte.cursoEscolar) return;
    otros[x.fuente.clave] = cargar(x.k);
  });
  if (!primero || matriculas.some(function (m) { return !m; }) || Object.keys(otros).some(function (k) { return !otros[k]; })) return;
  if (!cache['grupos:' + conj.conjunto]) cache['grupos:' + conj.conjunto] = agruparAlumnado_(primero);
  const anios = t.partes.filter(function (p) { return p.anio; }).map(function (p) { return p.anio; });
  const objeto = montadorDe_(conj.montador)(conj, primero, cache['grupos:' + conj.conjunto], t.parte, anios, matriculas, otros);
  cerrarMontaje_(raiz, t, avance, objeto, t0);
}

/* Lo último de montar una parte, sea de quien sea: escribirla, apuntarla en el índice (al final) y dejar dicho en el avance qué se hizo. */
function cerrarMontaje_(raiz, t, avance, objeto, t0) {
  const entrada = escribirParte_(raiz, t.conj, t.parte, objeto, t.previa, t.fuentes);
  cambiarIndiceHechos_(raiz, function (ind) {
    ind.hechos = ind.hechos || [];
    const i = ind.hechos.map(function (h) { return h.ruta; }).indexOf(entrada.ruta);
    if (i === -1) ind.hechos.push(entrada); else ind.hechos[i] = entrada;
  });
  avance.montado[t.ruta] = t.clave;
  avance.avisos[t.ruta] = contarAvisos_(objeto.avisos);
  avance.segundos.montadores[t.ruta] = Math.round((new Date().getTime() - t0) / 1000);
}

/* Lo que llama la página, ya pintada, una vez tras otra mientras quede trabajo. */
function webHechosSeguir(ctx) {
  const raiz = carpetaDatos_();
  const r = hechosTanda_(raiz, HECHOS_TOPE_PAGINA_MS_);
  const hechos = resumenHechosPagina_(raiz);
  const aviso = ctx.esDueno ? hechos.claveAviso : null;
  delete hechos.claveAviso;
  let sobras = [];
  try { sobras = sobrasTutoriasPagina_(raiz); } catch (e) { sobras = []; }
  return r.ocupada ? { quedan: true, ocupada: true, hechos: hechos, avisoClave: aviso, sobrasTutorias: sobras } : { quedan: r.quedan, hechos: hechos, avisoClave: aviso, sobrasTutorias: sobras };
}

/* ==== HechosEstado.gs ==== */
/* Cómo va lo de los datos ya hechos: hecho/estado.json (para las demás aplicaciones y sus comprobaciones) y lo que necesita la línea de la página.
   Solo cifras y palabras fijas: nunca un nombre, un número de identificación ni el nombre de un fichero. */
const CONTADORES_AVISO_ = {
  'sin-id': 'sinId', 'matricula-sin-ficha': 'sinFicha', 'matricula-repetida': 'matriculaRepetida', 'matricula-modalidad': 'matriculaModalidad',
  'expediente-sin-alumno': 'expedienteSinAlumno', 'expediente-ambiguo': 'expedienteAmbiguo', 'expediente-repetido': 'expedienteRepetido',
  'expediente-ilegible': 'expedienteIlegible', 'expediente-aviso': 'expedienteAviso', 'censo-sin-alumno': 'censoSinAlumno',
  'censo-empate': 'censoEmpate', 'censo-repetida': 'censoRepetida', 'censo-fichero': 'censoFichero',
  'personal-sin-id': 'personalSinId', 'personal-en-dos-listados': 'personalEnDosListados', 'personal-fichero': 'personalFichero',
  'tutoria-fichero': 'tutoriaFichero', 'tutoria-sin-id': 'tutoriaSinId', 'tutoria-no-esta-en-personal': 'tutoriaNoEstaEnPersonal',
  'tutoria-grupo-sin-tutor': 'tutoriaGrupoSinTutor', 'tutoria-hueco-hoy': 'tutoriaHuecoHoy', 'tutoria-dos-tutores-hoy': 'tutoriaDosTutoresHoy',
  'consejo-fichero': 'consejoFichero', 'consejo-sin-ficha': 'consejoSinFicha', 'consejo-ficha-dudosa': 'consejoFichaDudosa',
  'consejo-fuera-de-periodo': 'consejoFueraDePeriodo', 'consejo-ceses-distintos': 'consejoCesesDistintos',
  'libros-fichero': 'librosFichero', 'libros-repetido': 'librosRepetido', 'libros-dato': 'librosDato',
  'contactos-cambio-ignorado': 'contactosCambioIgnorado'
};

/* Tipo de aviso → contador: los de la tabla y, de cada conjunto que se entrega entero, los tres suyos (`<conjunto>-sin-id`, `<conjunto>-id-repetido`, `<conjunto>-entrega`) y, si tiene `unicos`, `<conjunto>-dato-repetido` y, si tiene `avisosPropios`, los que diga (`<conjunto>-<aviso>`). */
function contadoresDeAviso_() {
  const c = Object.assign({}, CONTADORES_AVISO_);
  CONJUNTOS_.filter(function (x) { return x.entregadoPor; }).forEach(function (x) {
    ['sin-id', 'id-repetido', 'entrega'].concat(x.unicos ? ['dato-repetido'] : [], x.avisosPropios || []).forEach(function (t) { const tipo = x.conjunto + '-' + t; c[tipo] = tipo.replace(/-(\w)/g, function (m, a) { return a.toUpperCase(); }); });
  });
  return c;
}

/* Los cuarenta contadores (siempre, aunque valgan cero) y `otros`. */
function contarAvisos_(avisos) {
  const c = {}, tabla = contadoresDeAviso_();
  Object.keys(tabla).forEach(function (t) { c[tabla[t]] = 0; });
  c.otros = 0;
  (avisos || []).forEach(function (a) { const k = tabla[a.tipo] || 'otros'; c[k]++; });
  return c;
}

function sumaAvisos_(c) { return Object.keys(c || {}).reduce(function (n, k) { return n + (c[k] || 0); }, 0); }

/* Listados de un conjunto que todavía no están leídos con la huella y el lector de hoy. */
function fuentesPorLeer_(conj, indice, avance) {
  const n = fuentesNecesarias_(indice, avance, conj);
  return n ? n.filter(function (x) { return !leidoAlDia_(avance, x); }).length : 0;
}

/* Por cada fuente del conjunto: cuántos ficheros se han leído y cuántos segundos llevó. */
function lectoresDeEstado_(conj, avance) {
  if (conj.entregadoPor) {
    const ks = Object.keys(avance.leidos).filter(function (k) { return k.indexOf(FUENTE_ENTREGA_.clave + '/' + conj.conjunto + '/') === 0; });
    return [{ clave: FUENTE_ENTREGA_.clave, ficheros: ks.length, segundos: ks.reduce(function (n, k) { return n + ((avance.segundos.lectores || {})[k] || 0); }, 0) }];
  }
  return conj.fuentes.map(function (f) {
    const ks = Object.keys(avance.leidos).filter(function (k) { return k === f.clave || k.indexOf(f.clave + '/') === 0; });
    return { clave: f.clave, ficheros: ks.length, segundos: ks.reduce(function (n, k) { return n + ((avance.segundos.lectores || {})[k] || 0); }, 0) };
  });
}

/* Lo apuntado de las entregas de un conjunto, por aplicación: { aplicación: cuentas }. Antes del CD v26 el del alumnado vivía dentro de `avance.completa`: se sigue leyendo de allí si no está en su sitio. */
function entregasApuntadas_(avance, conj) {
  const propias = (avance.entregas || {})[conj.conjunto];
  if (propias) return propias;
  return conj.fichaCompleta ? (avance.completa || {}).entregas || {} : {};
}

/* Lo que se recibió de cada aplicación (solo si está en el registro): cuándo y las cuentas de lo que se aceptó y se ignoró. */
function entregasDeEstado_(avance) {
  const lista = [];
  CONJUNTOS_.forEach(function (conj) {
    const ent = entregasApuntadas_(avance, conj);
    Object.keys(ent).filter(function (app) { return conj.entregas.indexOf(app) !== -1; }).sort().forEach(function (app) {
      const c = ent[app];
      lista.push({ conjunto: conj.conjunto, aplicacion: app, cuando: c.cuando, camposAceptados: c.camposAceptados, camposIgnorados: c.camposIgnorados, registrosUsados: c.registrosUsados,
        registrosSinFicha: c.registrosSinFicha, valoresIgnorados: c.valoresIgnorados, hechoConViejo: !!c.hechoConViejo });
    });
  });
  return lista;
}

function fichaCompletaDeEstado_(avance) {
  const c = avance.completa;
  return c ? { cuando: c.cuando, cursoEscolar: c.cursoEscolar || '', alumnos: c.alumnos, campos: c.campos, segundos: c.segundos, relevo: !!avance.relevo } : { relevo: !!avance.relevo };
}

function estadoHechos_(indice, avance, tareas, comp) {
  const atascado = !!avance.atascado && avance.firma === firmaDeFuentes_(indice);
  return {
    version: VERSION_CD, cuando: ahoraMadrid_(),
    conjuntos: CONJUNTOS_.filter(function (conj) { return !sinListadoPropio_(conj) || (fuentesNecesarias_(indice, avance, conj).length > 0 || (indice.hechos || []).some(function (h) { return h.conjunto === conj.conjunto; })); }).map(function (conj) {
      const hay = tareas.some(function (t) { return t.conj === conj; });
      const salida = {
        conjunto: conj.conjunto, pendiente: hay && !atascado, atascado: atascado, porLeer: fuentesPorLeer_(conj, indice, avance), tandasSinAvanzar: avance.sinAvance || 0,
        lectores: lectoresDeEstado_(conj, avance),
        partes: (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto; }).map(function (h) {
          const p = { parte: h.parte, cursoEscolar: h.cursoEscolar, registros: h.registros, segundos: (avance.segundos.montadores || {})[h.ruta] || 0,
            alDia: h.alDia, hecho: h.hecho, avisos: Object.assign(contarAvisos_([]), (avance.avisos || {})[h.ruta] || {}) };
          if (h.periodo) p.periodo = h.periodo;
          if ((avance.cifras || {})[h.ruta]) Object.assign(p, avance.cifras[h.ruta]);
          return p;
        })
      };
      if (conj.desglose && (avance.desgloses || {})[conj.conjunto]) salida.desglose = avance.desgloses[conj.conjunto];
      return salida;
    }),
    comprobaciones: resumenDeComprob_(comp), subida: { estado: comp.subida.estado, dia: comp.subida.dia }, entregas: entregasDeEstado_(avance), fichaCompleta: fichaCompletaDeEstado_(avance)
  };
}

/* Se escribe siempre sobre el mismo fichero, y solo si ha cambiado algo aparte de la hora. */
function escribirEstadoHechos_(raiz) {
  const indice = leerIndice_(raiz), avance = leerAvance_(raiz);
  const comp = leerComprob_(raiz);
  const estado = estadoHechos_(indice, avance, tareasDeHechos_(indice, avance), comp);
  const carpeta = subcarpetaPorRuta_(raiz, 'hecho');
  const sinHora = function (o) { return JSON.stringify(Object.assign({}, o, { cuando: '' })); };
  let antes = null;
  try { antes = leerJson_(carpeta, 'estado.json'); } catch (e) { antes = null; }
  if (antes && sinHora(antes) === sinHora(estado)) return;
  escribirJson_(carpeta, 'estado.json', estado);
}

/* Lo único que la página sabe de los datos ya hechos: cifras, fechas y sí o no. Ningún dato de una parte. */
function resumenHechosPagina_(raiz) {
  const indice = leerIndice_(raiz), avance = leerAvance_(raiz);
  const tareas = tareasDeHechos_(indice, avance);
  const atascado = !!avance.atascado && avance.firma === firmaDeFuentes_(indice);
  const revisados = revisadosPorConjunto_(leerVistos_(raiz));
  const conjuntos = CONJUNTOS_.map(function (conj) {
    const partes = (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto; });
    const antiguos = partes.filter(function (p) { return p.parte === 'antiguos'; })[0];
    const hay = tareas.some(function (t) { return t.conj === conj; });
    const recientes = partes.map(function (p) { return p.hecho; }).sort().pop();
    const porCursos = conj.porPeriodos || conj.entregadoPor ? { actuales: [], masCursos: 0 } : conj.porCursos ? partesPorCursosParaPagina_(partes) : null;
    const salida = {
      etiqueta: conj.titulo, cuenta: conj.cuenta, hayFuentes: sinListadoPropio_(conj) ? (fuentesNecesarias_(indice, avance, conj) || []).length > 0 : !!buscarEnIndice_(indice, conj.fuentes[0].clave, ''),
      actuales: porCursos ? porCursos.actuales : partes.filter(function (p) { return p.parte === 'actuales'; }).sort(function (a, b) { return anioDeCurso_(a.cursoEscolar) - anioDeCurso_(b.cursoEscolar); })
        .map(function (p) { return { cursoEscolar: p.cursoEscolar, registros: p.registros }; }),
      masCursos: porCursos ? porCursos.masCursos : 0, sufijoAvisos: conj.sufijoAvisos || '',
      antiguos: antiguos ? antiguos.registros : null, fecha: recientes ? fechaLegible_(recientes) : '',
      alDia: partes.length > 0 && !hay && partes.every(function (p) { return p.alDia; }),
      trabajando: hay && !atascado, atascado: atascado && hay, porLeer: fuentesPorLeer_(conj, indice, avance), totalFicheros: (fuentesNecesarias_(indice, avance, conj) || []).length,
      avisos: Math.max(0, partes.reduce(function (n, p) { return n + sumaAvisos_((avance.avisos || {})[p.ruta]); }, 0) - (revisados[conj.conjunto] || 0)), conjunto: conj.conjunto,
      entrega: entregaParaPagina_(conj, avance), monta: partes.length ? quienMontaConjunto_(avance, conj.conjunto) : ''
    };
    if (conj.porPeriodos) salida.consejo = resumenConsejoParaPagina_(partes, avance);
    if (conj.deContactos && partes.length) salida.contactos = { registros: partes[0].registros, aMano: ((avance.cifras || {})[partes[0].ruta] || {}).contactosAMano || 0 };
    if (conj.conjunto === 'libros') salida.libros = resumenLibrosParaPagina_(partes, avance);
    if (conj.entregadoPor) salida.entero = { registros: (avance.cuentas || {})[conj.conjunto] !== undefined && partes.length ? avance.cuentas[conj.conjunto] : (partes.length ? partes[0].registros : null), quien: conj.quienEntrega || conj.aplicaciones[conj.entregadoPor] || conj.entregadoPor, fecha: (avance.entregados || {})[conj.conjunto] || '', entregadas: conj.entregadas || 'entregadas' };
    if (conj.entregadoPor && conj.desglose) salida.entero.desglose = desglosePaginaEntero_(conj, avance);
    return salida;
  });
  const comp = leerComprob_(raiz);
  return { conjuntos: conjuntos, comprobado: textoComprobado_(comp), claveAviso: avisoDeClave_(comp),
    quedan: !indice.ocupado && ((tareas.length > 0 && !atascado) || comprobacionesDebidas_(comp, new Date().getTime(), indice).length > 0) };
}

/* «BD Alumnado» y el día de su última entrega, o null. Solo nombres del registro. */
function entregaParaPagina_(conj, avance) {
  if (conj.entregadoPor) return null;
  const ent = entregasApuntadas_(avance, conj);
  const apps = Object.keys(ent).filter(function (a) { return conj.entregas.indexOf(a) !== -1; }).sort(function (a, b) { return ent[a].cuando < ent[b].cuando ? 1 : -1; });
  return apps.length ? { nombre: conj.aplicaciones[apps[0]] || apps[0], fecha: fechaLegible_(ent[apps[0]].cuando).split(' ')[0] } : null;
}

/* Lo que la página dice del Consejo Escolar: cuántos periodos, cuántos nombramientos, cuántos miembros hoy y el último periodo. Solo cifras y periodos. */
function resumenConsejoParaPagina_(partes, avance) {
  const hist = partes.filter(function (p) { return p.parte === 'historial'; })[0];
  const c = { periodos: partes.filter(function (p) { return p.parte === 'periodo'; }).length };
  if (hist) {
    c.nombramientos = hist.registros;
    c.miembrosHoy = (avance.consejo || {}).miembrosHoy || 0;
    c.ultimoPeriodo = (avance.consejo || {}).ultimoPeriodo || '';
  }
  return c;
}

/* El desglose de la cuenta para la página: [{ uno, varios, n }] en el orden del registro, o null si el conjunto no tiene. Solo palabras del registro y cifras. */
function desglosePaginaEntero_(conj, avance) {
  const d = (avance.desgloses || {})[conj.conjunto];
  return conj.desglose && d ? conj.desglose.trozos.map(function (t) { return { uno: t.uno, varios: t.varios, n: d[t.valor] || 0 }; }) : null;
}

/* ==== Avisos.gs ==== */
/* La pestaña «Avisos» (fila 32): una línea por aviso de las partes de hecho/, en palabras llanas, y las marcas «Ya lo he visto», comunes a quienes entran, en _interno/avisos-vistos.json.
   Los avisos llevan datos personales: solo van a la página; nunca a estado.json, a comprobaciones/ ni a GitHub. Las marcas no cambian ni quitan ningún aviso: solo se esconden en pantalla. */
const ARCHIVO_VISTOS_ = 'avisos-vistos.json';

/* Los avisos de listados cuyo fichero falta (Reparar.gs) no son de un conjunto de datos ya hechos: tienen el suyo. */
const CONJUNTO_LISTADOS_ = { conjunto: 'listados', titulo: 'Listados' };

/* A quién se refiere un aviso: el primer dato de esta lista que traiga. */
const CLAVES_DE_QUIEN_ = ['alumno', 'empleado', 'miembro', 'persona', 'unidad', 'cargoNombre', 'iniciales', 'razonSocial', 'nombre', 'listado', 'fichero'];

/* Una frase por tipo de aviso (o por final de tipo, para los conjuntos que se entregan enteros). `{x}` se cambia por el dato `x` del aviso. */
const FRASES_AVISO_ = {
  'sin-id': 'Una fila del listado no trae número de identificación escolar y no ha entrado en ninguna ficha.',
  'matricula-sin-ficha': 'Una fila de la matrícula de {nivel} no se ha podido unir a ningún alumno.',
  'matricula-repetida': 'Una fila de la matrícula de {nivel} está repetida y solo se ha usado una vez.',
  'matricula-modalidad': 'El listado de matrícula de {nivel} no dice con claridad de qué modalidad es.',
  'expediente-sin-alumno': 'El expediente de {etapa} no se ha podido unir a ningún alumno.',
  'expediente-ambiguo': 'El expediente de {etapa} podría ser de más de un alumno y no se ha unido a ninguno.',
  'expediente-repetido': 'Hay dos expedientes de {etapa} para el mismo alumno.',
  'expediente-ilegible': 'No se ha podido leer un expediente de {etapa}. {detalle}',
  'expediente-aviso': '{detalle}',
  'censo-sin-alumno': 'Una ficha del censo NEAE no se ha podido unir a ningún alumno.',
  'censo-empate': 'Una ficha del censo NEAE podría ser de varios alumnos y no se ha unido a ninguno.',
  'censo-repetida': 'Una ficha del censo NEAE ya estaba unida a ese alumno y esta se ha dejado fuera.',
  'censo-fichero': '{detalle}',
  'personal-sin-id': 'Una fila del listado de personal no trae documento y no ha entrado en ninguna ficha.',
  'personal-en-dos-listados': 'La persona sale a la vez como docente y como no docente; se ha usado un solo listado.',
  'personal-fichero': '{detalle}',
  'tutoria-fichero': '{detalle}',
  'tutoria-sin-id': 'Una línea de la función tutorial no trae documento y no se ha unido a ninguna persona.',
  'tutoria-no-esta-en-personal': 'Es tutor o tutora en el listado, pero no sale en el personal de ese curso.',
  'tutoria-grupo-sin-tutor': 'Este grupo tiene alumnos y no sale con ningún tutor en el listado.',
  'tutoria-hueco-hoy': 'Hoy este grupo no tiene tutor: hubo uno antes y habrá otro después.',
  'tutoria-dos-tutores-hoy': 'Hoy este grupo tiene dos tutores a la vez.',
  'ids-sin-fichero': 'El listado {listado} figura en el índice sin número de Drive y su fichero no está en su carpeta: vuelve a soltarlo.',
  'listado-sin-fichero': 'Falta el fichero de {listado} de {fecha}: vuelve a soltarlo.',
  'libros-fichero': '{detalle}',
  'contactos-cambio-ignorado': 'Un cambio de contactos no se ha aplicado. {detalle}',
  'libros-repetido': 'La asignatura {materia} de {nivel} sale dos veces con el mismo libro; se ha usado la última fila.',
  'libros-dato': 'En la asignatura {materia} de {nivel}, la casilla «{columna}» no se entiende y no se ha usado.',
  'consejo-fichero': '{detalle}',
  'consejo-sin-ficha': 'No se ha encontrado a este miembro entre el personal ni entre el alumnado.',
  'consejo-ficha-dudosa': 'Este miembro podría ser de varias fichas y no se ha unido a ninguna.',
  'consejo-fuera-de-periodo': 'La fecha de nombramiento no cuadra con el periodo del listado.',
  'consejo-ceses-distintos': 'El mismo nombramiento trae fechas de cese distintas según el periodo.',
  /* Conjuntos que se entregan enteros: lo que llevan todos. */
  '-sin-id': 'Un registro de la entrega no trae identificador y no ha entrado.',
  '-id-repetido': 'Un registro de la entrega repite el identificador de otro y no ha entrado.',
  '-entrega': '{detalle}',
  '-dato-repetido': 'Este registro repite un dato que ya traía otro; ha entrado igual.',
  '-sin-ficha': 'Este ocupante no se ha encontrado en la ficha del personal.',
  '-ficha-dudosa': 'Este ocupante podría ser de varias fichas del personal y no se ha unido a ninguna.',
  '-fechas': 'Las fechas de este cargo no cuadran: {detalle}',
  /* El ensayo de la ficha del alumno en la página nueva (fila 46, Ensayo.gs). */
  'ensayo-ficha-distinta': 'En «{campo}» la ficha montada en la página nueva no sale igual que la de hoy ({n} alumnos).',
  'ensayo-ficha-sobran': '{n} alumnos salen en la ficha montada en la página nueva y no en la de hoy.',
  'ensayo-ficha-faltan': '{n} alumnos salen en la ficha de hoy y no en la montada en la página nueva.',
  /* El ensayo del personal (fila 47). */
  'ensayo-personal-distinta': 'En «{campo}» el personal montado en la página nueva no sale igual que el de hoy ({n} personas).',
  'ensayo-personal-sobran': '{n} personas salen en el personal montado en la página nueva y no en el de hoy.',
  'ensayo-personal-faltan': '{n} personas salen en el personal de hoy y no en el montado en la página nueva.',
  /* El ensayo de las tutorías (fila 48). */
  'ensayo-tutorias-distinta': 'En «{campo}» las tutorías montadas en la página nueva no salen igual que las de hoy ({n} grupos).',
  'ensayo-tutorias-sobran': '{n} grupos salen en las tutorías montadas en la página nueva y no en las de hoy.',
  'ensayo-tutorias-faltan': '{n} grupos salen en las tutorías de hoy y no en las montadas en la página nueva.',
  /* El ensayo del Consejo Escolar (fila 49). */
  'ensayo-consejo-distinta': 'En «{campo}» el Consejo Escolar montado en la página nueva no sale igual que el de hoy ({n} registros).',
  'ensayo-consejo-sobran': '{n} registros salen en el Consejo Escolar montado en la página nueva y no en el de hoy.',
  'ensayo-consejo-faltan': '{n} registros salen en el Consejo Escolar de hoy y no en el montado en la página nueva.',
  /* El ensayo de los libros de texto (fila 50). */
  'ensayo-libros-distinta': 'En «{campo}» los libros de texto montados en la página nueva no salen igual que los de hoy ({n} libros).',
  'ensayo-libros-sobran': '{n} libros salen en los libros de texto montados en la página nueva y no en los de hoy.',
  'ensayo-libros-faltan': '{n} libros salen en los libros de texto de hoy y no en los montados en la página nueva.',
  /* El ensayo de las empresas, las Administraciones y los cargos (fila 51). */
  'ensayo-empresas-distinta': 'En «{campo}» las empresas montadas en la página nueva no salen igual que las de hoy ({n} registros).',
  'ensayo-empresas-sobran': '{n} registros salen en las empresas montadas en la página nueva y no en las de hoy.',
  'ensayo-empresas-faltan': '{n} registros salen en las empresas de hoy y no en las montadas en la página nueva.',
  'ensayo-administraciones-distinta': 'En «{campo}» las Administraciones montadas en la página nueva no salen igual que las de hoy ({n} registros).',
  'ensayo-administraciones-sobran': '{n} registros salen en las Administraciones montadas en la página nueva y no en las de hoy.',
  'ensayo-administraciones-faltan': '{n} registros salen en las Administraciones de hoy y no en las montadas en la página nueva.',
  'ensayo-cargos-distinta': 'En «{campo}» los cargos montados en la página nueva no salen igual que los de hoy ({n} registros).',
  'ensayo-cargos-sobran': '{n} registros salen en los cargos montados en la página nueva y no en los de hoy.',
  'ensayo-cargos-faltan': '{n} registros salen en los cargos de hoy y no en los montados en la página nueva.'
};

/* El texto de un aviso de fechas de cargos: sus dos casos tienen su palabra. */
const DETALLES_AVISO_ = { 'al-reves': 'termina antes de empezar.', 'se-pisan': 'dos personas lo ocupan los mismos días.', posterior: 'es posterior al periodo.', anterior: 'es anterior al periodo.' };

function frasePlanaDeAviso_(a) {
  const tipo = String(a.tipo || '');
  const sufijo = tipo.replace(/^[a-z0-9]+(?=-(sin-id|id-repetido|entrega|dato-repetido|sin-ficha|ficha-dudosa|fechas)$)/, '');
  const clave = FRASES_AVISO_[tipo] ? tipo : (sufijo !== tipo && FRASES_AVISO_[sufijo] ? sufijo : '');
  if (!clave) return { texto: 'Los datos traen una cosa que esta pantalla todavía no sabe explicar.', conocida: false };
  const d = a.datos || {};
  const texto = FRASES_AVISO_[clave].replace(/\{(\w+)\}/g, function (m, k) {
    const v = d[k];
    if (v === undefined || v === null || v === '') return k === 'nivel' || k === 'etapa' ? 'su nivel' : '';
    return DETALLES_AVISO_[v] || (Array.isArray(v) ? v.join(', ') : String(v));
  }).replace(/\s+/g, ' ').trim();
  return { texto: texto, conocida: true };
}

/* A quién se refiere: un nombre de los datos o, si no lo hay, el primer texto que traigan o el identificador. */
function quienDeAviso_(a) {
  const d = a.datos || {};
  for (let i = 0; i < CLAVES_DE_QUIEN_.length; i++) {
    const v = d[CLAVES_DE_QUIEN_[i]];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const ocupantes = Array.isArray(d.ocupantes) ? d.ocupantes.map(function (o) { return o && o.persona; }).filter(Boolean) : [];
  if (ocupantes.length) return ocupantes.join(' y ');
  const primero = Object.keys(d).map(function (k) { return d[k]; }).filter(function (v) { return typeof v === 'string' && v.trim(); })[0];
  return primero ? primero.trim() : (a.id ? String(a.id) : '—');
}

/* La huella de un aviso: cambia si cambia su tipo, su id, sus datos, su conjunto o su parte. Corta, para que el fichero de marcas no crezca. */
function huellaDeAviso_(conjunto, ruta, a) {
  const s = [conjunto, ruta, a.tipo, a.id === null || a.id === undefined ? '' : a.id, JSON.stringify(a.datos === undefined ? null : a.datos)].join('\u0001');
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

/* Dónde está una parte: «Tutorías · curso 25-26». */
function dondeDeParte_(conj, h) {
  const trozo = h.periodo ? 'periodo ' + h.periodo : (h.parte === 'historial' ? 'historial' : (h.cursoEscolar ? 'curso ' + h.cursoEscolar : (h.parte === 'antiguos' ? 'antiguos' : '')));
  return conj.titulo + (trozo ? ' · ' + trozo : '');
}

function leerParteDeHecho_(raiz, ruta) {
  const trozos = String(ruta).split('/'), nombre = trozos.pop();
  return leerJson_(subcarpetaPorRuta_(raiz, trozos.join('/')), nombre);
}

/* Todos los avisos de las partes que dicen tener alguno: [{ huella, conjunto, donde, tipo, quien, que, conocida }] en el orden del registro. `incompleto` si no se pudo leer alguna parte. */
function leerAvisosDeHechos_(raiz) {
  const indice = leerIndice_(raiz), avance = leerAvance_(raiz);
  const lista = [];
  let incompleto = false;
  CONJUNTOS_.forEach(function (conj) {
    (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto && sumaAvisos_((avance.avisos || {})[h.ruta]) > 0; }).forEach(function (h) {
      let parte = null;
      try { parte = leerParteDeHecho_(raiz, h.ruta); } catch (e) { parte = null; }
      if (!parte || !Array.isArray(parte.avisos)) { incompleto = true; return; }
      const donde = dondeDeParte_(conj, h);
      parte.avisos.forEach(function (a) {
        const f = frasePlanaDeAviso_(a);
        lista.push({ huella: huellaDeAviso_(conj.conjunto, h.ruta, a), conjunto: conj.conjunto, donde: donde, tipo: a.tipo, quien: quienDeAviso_(a), que: f.texto, conocida: f.conocida });
      });
    });
  });
  avisosDeFicherosQueFaltan_(indice).concat(avisosDeIdsSinFichero_(raiz), ensayoAvisos_(raiz)).forEach(function (a) { lista.push(a); });
  return { avisos: lista, incompleto: incompleto, indice: indice, avance: avance };
}

function leerVistos_(raiz) {
  let v = null;
  try { v = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_VISTOS_); } catch (e) { v = null; }
  if (!v || typeof v.vistos !== 'object' || !v.vistos) v = { version: 1, vistos: {}, huerfanasBorradas: 0 };
  v.huerfanasBorradas = v.huerfanasBorradas || 0;
  return v;
}

/* Cuántos avisos tiene marcados cada conjunto, sin abrir ninguna parte: para restarlos de las cajitas. */
function revisadosPorConjunto_(vistos) {
  const n = {};
  Object.keys(vistos.vistos).forEach(function (h) { const c = vistos.vistos[h].conjunto; n[c] = (n[c] || 0) + 1; });
  return n;
}

/* Lo que pide la pestaña al abrirse: todos los avisos, cada uno pendiente o revisado, y las cuentas por conjunto. Las marcas de avisos que ya no existen se borran, pero solo con todo al día y todas las partes leídas. */
function webAvisos(ctx) {
  const raiz = carpetaDatos_();
  const r = leerAvisosDeHechos_(raiz);
  const vistos = leerVistos_(raiz);
  const presentes = {};
  r.avisos.forEach(function (a) { presentes[a.huella] = true; });
  const alDia = !r.incompleto && !r.indice.ocupado && tareasDeHechos_(r.indice, r.avance).length === 0;
  const huerfanas = Object.keys(vistos.vistos).filter(function (h) { return !presentes[h]; });
  if (alDia && huerfanas.length) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const v = leerVistos_(raiz);
      let n = 0;
      Object.keys(v.vistos).forEach(function (h) { if (!presentes[h]) { delete v.vistos[h]; n++; } });
      if (n) { v.huerfanasBorradas += n; escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_VISTOS_, v); }
      Object.keys(vistos.vistos).forEach(function (h) { if (!presentes[h]) delete vistos.vistos[h]; });
    } finally {
      lock.releaseLock();
    }
  }
  const cuentas = {};
  CONJUNTOS_.concat([CONJUNTO_LISTADOS_, CONJUNTO_ENSAYO_]).forEach(function (c) { cuentas[c.conjunto] = { conjunto: c.conjunto, titulo: c.titulo, pendientes: 0, revisados: 0 }; });
  const avisos = r.avisos.map(function (a) {
    const v = vistos.vistos[a.huella];
    cuentas[a.conjunto][v ? 'revisados' : 'pendientes']++;
    const o = { huella: a.huella, conjunto: a.conjunto, donde: a.donde, quien: a.quien, que: a.que };
    if (v) { o.vistoPor = v.quien || ''; o.vistoCuando = v.cuando || ''; }
    return o;
  });
  if (ctx.esDueno) {
    const comp = leerComprob_(raiz), clave = avisoDeClave_(comp);
    avisosDeDiagnostico_(comp).reverse().forEach(function (a) { avisos.unshift({ huella: 'diag-' + a.bloque.slice(0, 11), conjunto: 'diagnostico', donde: 'Diagnóstico', quien: 'Diagnóstico sin nombres', que: a.frase, diagnostico: true }); });
    if (clave) avisos.unshift({ huella: 'clave', conjunto: 'clave', donde: 'Clave de GitHub', quien: 'Clave de GitHub', que: clave.frase, clave: { caso: clave.caso, tipo: clave.tipo } });
  }
  return { avisos: avisos, conjuntos: CONJUNTOS_.concat([CONJUNTO_LISTADOS_, CONJUNTO_ENSAYO_]).map(function (c) { return cuentas[c.conjunto]; }).filter(function (c) { return c.pendientes + c.revisados > 0; }), incompleto: r.incompleto };
}

/* «Ya lo he visto» (visto = true) o «Volver a pendientes» (false). Solo escribe lo que cambia. */
function webAvisoVisto(huella, conjunto, visto, ctx) {
  if (!/^[0-9a-z]{2,16}$/.test(String(huella))) throw new Error('Ese aviso no existe.');
  if (!CONJUNTOS_.concat([CONJUNTO_LISTADOS_, CONJUNTO_ENSAYO_]).some(function (c) { return c.conjunto === conjunto; })) throw new Error('Ese aviso no existe.');
  const raiz = carpetaDatos_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const v = leerVistos_(raiz);
    if (visto === true) {
      if (!v.vistos[huella]) v.vistos[huella] = { conjunto: conjunto, quien: ctx.correo || '', cuando: ahoraMadrid_() };
      else return { ok: true, quien: v.vistos[huella].quien, cuando: v.vistos[huella].cuando };
    } else {
      if (!v.vistos[huella]) return { ok: true };
      delete v.vistos[huella];
    }
    escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_VISTOS_, v);
    return visto === true ? { ok: true, quien: v.vistos[huella].quien, cuando: v.vistos[huella].cuando } : { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* Solo lee. Solo cifras: cuántos avisos hay, cuántos esperan, cuántos están revisados, cuántas marcas huérfanas se han borrado y cuántos avisos no tienen frase propia. */
function cmpAvisosPantalla_(ctx) {
  if (!(ctx.indice.hechos || []).length) return { estado: 'sin datos', cifras: { 'avisos-en-los-datos': 0 } };
  const r = leerAvisosDeHechos_(ctx.raiz), vistos = leerVistos_(ctx.raiz);
  const revisados = r.avisos.filter(function (a) { return vistos.vistos[a.huella]; }).length;
  const sinFrase = r.avisos.filter(function (a) { return !a.conocida; }).length;
  const cifras = { 'avisos-en-los-datos': r.avisos.length, pendientes: r.avisos.length - revisados, revisados: revisados, 'marcas-huerfanas-borradas': vistos.huerfanasBorradas,
    'sin-frase-llana': sinFrase, 'partes-sin-leer': r.incompleto ? 1 : 0 };
  return { estado: sinFrase || r.incompleto ? 'mal' : 'bien', cifras: cifras };
}

/* ==== ComprobPuerta.gs ==== */
/* La única puerta de lo que va a hecho/estado.json y a GitHub (comprobaciones/ultima.json). Más estrecha que la de BD Alumnado: aquí no viaja ningún texto sacado
   de un fichero. Pasan: números, sí o no, palabras de una lista cerrada del programa, fechas con hora, días y cursos escolares. Lo demás se cuenta en `otros`. */
const COMPROB_ESTADOS_ = ['bien', 'mal', 'dato', 'sin datos', 'sin tiempo', 'error'];
const COMPROB_SUBIDA_ = ['bien', 'sin-permiso', 'caducada', 'sin-red', 'todavia-no'];
const COMPROB_ERRORES_ = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError'];

/* Las palabras que pueden viajar: estados, id del catálogo de comprobaciones, claves de CATALOGO_ (no las de tipos creados a mano), nombres de conjunto y de parte,
   contadores de avisos, nombres de función del catálogo, tipos de error y estados de la subida. */
function cmpPalabras_() {
  const p = {};
  const meter = function (lista) { lista.forEach(function (x) { p[x] = true; }); };
  meter(COMPROB_ESTADOS_); meter(COMPROB_SUBIDA_); meter(COMPROB_ERRORES_);
  meter(COMPROBACIONES_.map(function (c) { return c.id; })); meter(COMPROBACIONES_.map(function (c) { return c.funcion; }));
  meter(CATALOGO_.map(function (c) { return c.clave; }));
  meter(CONJUNTOS_.map(function (c) { return c.conjunto; })); meter(['actuales', 'antiguos', 'curso', 'periodo', 'historial', 'todas']);
  meter(Object.keys(contadoresDeAviso_()).map(function (t) { return contadoresDeAviso_()[t]; })); meter(['otros']); meter(['ok', 'caduca-pronto', 'caducada', 'sin-escribir', 'clasica', 'nueva', 'sin-caducidad']); meter(['unidad', 'empleado', 'documento', 'periodo']);
  return p;
}

function cmpNombreValido_(n) { return /^[a-z][a-z0-9-]{0,39}$/.test(String(n)) && !/\d{4}/.test(String(n)); }

function cmpValorPasa_(v, palabras) {
  if (typeof v === 'boolean') return true;
  if (typeof v === 'number') return isFinite(v);
  if (typeof v !== 'string') return false;
  return !!palabras[v] || /^CD v\d+$/.test(v) || /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(v) || /^\d{4}-\d\d-\d\d$/.test(v) || /^\d\d-\d\d$/.test(v);
}

/* resultado = { id, estado, cifras: {nombre: valor} } → lo mismo, solo con lo que puede viajar, y `otros` con lo que se ha quedado fuera. */
function cmpPuerta_(r) {
  const palabras = cmpPalabras_();
  let otros = 0;
  const cifras = {};
  Object.keys(r.cifras || {}).forEach(function (k) {
    if (cmpNombreValido_(k) && cmpValorPasa_(r.cifras[k], palabras)) cifras[k] = r.cifras[k]; else otros++;
  });
  return { id: palabras[r.id] ? r.id : 'desconocida', estado: COMPROB_ESTADOS_.indexOf(r.estado) !== -1 ? r.estado : 'error', cifras: cifras, otros: otros };
}

/* ==== ComprobCatalogo.gs ==== */
/* El catálogo de comprobaciones: una tabla de datos. Cada una tiene un `id` fijo (no se renombra nunca), la fila de la que sale, una frase llana y una función que SOLO LEE.
   Una función recibe el contexto de la pasada ({ raiz, indice, avance, comp, ahoraMs, cache }) y devuelve { estado, cifras }.
   Toda fila nueva añade aquí las comprobaciones de lo que construye. */
const COMPROBACIONES_ = [
  { id: 'indice-y-carpetas', fila: 14, que: 'Cada entrada del índice tiene su fichero en Drive y cada fichero de listados/ tiene su entrada', funcion: 'cmpIndiceYCarpetas_' },
  { id: 'hechos-partes', fila: 14, que: 'Cada parte de los datos ya hechos existe y es la que dice el índice', funcion: 'cmpHechosPartes_' },
  { id: 'hechos-id-unico', fila: 14, que: 'Ningún alumno vacío ni repetido dentro de una parte, y los antiguos no están entre los actuales', funcion: 'cmpHechosIdUnico_' },
  { id: 'hechos-campos', fila: 14, que: 'Cada campo está bien descrito y ningún alumno trae un dato que no esté descrito', funcion: 'cmpHechosCampos_' },
  { id: 'hechos-avisos', fila: 14, que: 'Cada aviso es de un tipo conocido y las cuentas de estado.json son las de cada parte', funcion: 'cmpHechosAvisos_' },
  { id: 'hechos-fuentes', fila: 14, que: 'Lo que está al día se hizo con los listados de ahora', funcion: 'cmpHechosFuentes_' },
  { id: 'tandas', fila: 14, que: 'Las tandas no están atascadas ni llevan más de un día sin poner una parte al día', funcion: 'cmpTandas_' },
  { id: 'entrada-sin-recoger', fila: 14, que: 'Lo que se deja en entrada/ se recoge en menos de media hora', funcion: 'cmpEntradaSinRecoger_' },
  { id: 'tiempos', fila: 14, que: 'Cuánto tarda cada lector y cada montador', funcion: 'cmpTiempos_' },
  { id: 'sin-clasificar', fila: 14, que: 'Cuántos ficheros esperan en «Sin clasificar» y qué les falta', funcion: 'cmpSinClasificar_' },
  { id: 'matricula-cruce', fila: 15, que: 'Cuántas filas trae la matrícula de cada nivel y cuántas se han emparejado con un alumno', funcion: 'cmpMatriculaCruce_' },
  { id: 'matricula-una-ficha', fila: 15, que: 'Ninguna fila de matrícula está en dos fichas y ninguna ficha tiene dos filas', funcion: 'cmpMatriculaUnaFicha_' },
  { id: 'expedientes-cruce', fila: 16, que: 'Cuántos expedientes hay de cada tipo y a cuántos alumnos se han asignado', funcion: 'cmpExpedientesCruce_' },
  { id: 'historia-sin-negativos', fila: 16, que: 'Ninguna cuenta de repeticiones es negativa y ninguna repetición estimada de Primaria pasa de una', funcion: 'cmpHistoriaSinNegativos_' },
  { id: 'censo-cruce', fila: 17, que: 'Cuántas fichas trae el censo NEAE, cuántas se han asignado y si trae cada nivel', funcion: 'cmpCensoCruce_' },
  { id: 'censo-una-ficha', fila: 17, que: 'Ningún alumno tiene dos fichas del censo y ninguna ficha está en dos alumnos', funcion: 'cmpCensoUnaFicha_' },
  { id: 'entregas', fila: 18, que: 'Cuánto hace de la última entrega de las aplicaciones y qué se aceptó de ella', funcion: 'cmpEntregas_' },
  { id: 'ficha-completa', fila: 18, que: 'La ficha completa existe, es del acuerdo 2 y no repite a nadie; antes del relevo no se genera', funcion: 'cmpFichaCompleta_' },
  { id: 'admision-por-nivel', fila: 19, que: 'Cuántas entradas hay de admisión, planificación y matrícula provisional por curso, y cuántos ficheros esperan por no saberse su nivel', funcion: 'cmpAdmisionPorNivel_' },
  { id: 'personal-cruce', fila: 11, que: 'Cuántos listados, filas y personas hay en el personal, cuántos son docentes y cuántos no, y qué columnas no se conocen', funcion: 'cmpPersonalCruce_' },
  { id: 'personal-una-ficha', fila: 11, que: 'Cada fila con nombre de los listados del personal está en una sola ficha o en un solo aviso', funcion: 'cmpPersonalUnaFicha_' },
  { id: 'libros-lectura', fila: 37, que: 'Cuántos niveles, filas y libros hay en los libros de texto de cada curso, y que cada fila leída está en un registro o es una repetida', funcion: 'cmpLibrosLectura_' },
  { id: 'libros-una-ficha', fila: 37, que: 'Ningún libro de texto vacío ni repetido dentro de una parte', funcion: 'cmpLibrosUnaFicha_' },
  { id: 'tutorias-cruce', fila: 21, que: 'Cuántos ficheros, líneas, grupos y personas hay en las tutorías, cuántos grupos tienen tutor hoy y cuántos no cuadran con el personal o con el alumnado', funcion: 'cmpTutoriasCruce_' },
  { id: 'tutorias-lectura', fila: 21, que: 'En cada listado de la función tutorial no sobra ningún texto de sus tablas y cada línea leída está una sola vez en la parte', funcion: 'cmpTutoriasLectura_' },
  { id: 'tutorias-sobras', fila: 28, que: 'La forma, sin sus letras, de los textos de un listado de tutorías que no se han sabido colocar', funcion: 'cmpTutoriasSobras_' },
  { id: 'tutorias-hoy', fila: 21, que: 'En la parte del curso de hoy, el tutor de hoy, las marcas de hoy y los avisos de hoy son los que dan las fechas', funcion: 'cmpTutoriasHoy_' },
  { id: 'consejo-cruce', fila: 22, que: 'Cuántos periodos, listados, nombramientos y personas hay en el Consejo Escolar, cuántos miembros hay hoy y cuántos se han unido al personal o al alumnado', funcion: 'cmpConsejoCruce_' },
  { id: 'consejo-una-ficha', fila: 22, que: 'Cada fila con miembro de cada listado del Consejo está en un solo registro de su periodo, y cada registro de un periodo está en un solo nombramiento del historial', funcion: 'cmpConsejoUnaFicha_' },
  { id: 'consejo-hoy', fila: 22, que: 'En el historial del Consejo, quién es miembro hoy es lo que dan el último periodo y las fechas', funcion: 'cmpConsejoHoy_' },
  { id: 'empresas-cruce', fila: 23, que: 'Cuántos registros trae la entrega de empresas y cuántos hay en la parte, cuántos no llevan NIF, id o están repetidos, y qué campos y valores se han ignorado', funcion: 'cmpEmpresasCruce_' },
  { id: 'empresas-una-ficha', fila: 23, que: 'Cada registro de la entrega de empresas está en la parte o en un aviso (y solo en uno), ningún id se repite en la parte y su fuente es la entrega vigente', funcion: 'cmpEmpresasUnaFicha_' },
  { id: 'administraciones-cruce', fila: 24, que: 'Cuántos registros trae la entrega de Administraciones y cuántos hay en la parte, el desglose, los datos repetidos, los que no llevan id o repiten id, y cuántos registros y filas trae cada tabla', funcion: 'cmpAdministracionesCruce_' },
  { id: 'administraciones-una-ficha', fila: 24, que: 'Cada registro de la entrega de Administraciones está en la parte o en un aviso (y solo en uno), ningún id se repite en la parte y su fuente es la entrega vigente', funcion: 'cmpAdministracionesUnaFicha_' },
  { id: 'cargos-cruce', fila: 25, que: 'Cuántos registros trae la entrega de cargos y cuántos hay en la parte, cuántos cargos y ocupantes, quién ocupa hoy, cuántos se han unido al personal y qué fechas no cuadran', funcion: 'cmpCargosCruce_' },
  { id: 'cargos-una-ficha', fila: 25, que: 'Cada registro de la entrega de cargos está en la parte o en un aviso (y solo en uno), ningún id se repite en la parte y su fuente es la entrega vigente', funcion: 'cmpCargosUnaFicha_' },
  { id: 'cargos-hoy', fila: 25, que: 'En los cargos, quién ocupa hoy es lo que dan las fechas y cada ficha del personal a la que se unió un ocupante existe', funcion: 'cmpCargosHoy_' },
  { id: 'contactos-cruce', fila: 98, que: 'Cuántos docentes trae el personal de hoy y cuántos registros hay en los contactos, cuántos tienen cada dato y cuántos están escritos a mano, y cuántos cambios se han ignorado (solo cuentas, nunca un valor)', funcion: 'cmpContactosCruce_' },
  { id: 'contactos-una-ficha', fila: 98, que: 'En los contactos no hay ningún id repetido, todo docente del personal de hoy tiene su registro, cada dato tiene la forma de las reglas y su origen, y la fuente de la parte es la de ahora', funcion: 'cmpContactosUnaFicha_' },
  { id: 'ficha-igual-que-bd', fila: 26, que: 'Cuántos alumnos y cuántas claves de la ficha de aquí difieren de ALUMNADO-BD.json de BD Alumnado, y si los dos lados se hicieron con los mismos ficheros', funcion: 'cmpFichaIgualQueBd_' },
  { id: 'ficha-igual-claves', fila: 26, que: 'En qué claves y de qué forma difiere la ficha de aquí de ALUMNADO-BD.json: solo cuentas, nunca un valor', funcion: 'cmpFichaIgualClaves_' },
  { id: 'soporte-boton-unico', fila: 20, que: 'El botón único de soporte carga en la página', funcion: 'cmpSoporteBotonUnico_' },
  { id: 'soporte-envio', fila: 30, que: 'El último envío de un aviso desde el botón de soporte de esta página salió bien o mal, con cuántos van de cada', funcion: 'cmpSoporteEnvio_' },
  { id: 'listados-sin-solapes', fila: 31, que: 'La tabla de Listados de la página: cuántas filas y cuántas cajitas tiene y si algún elemento se solapa con otro o se sale por la derecha', funcion: 'cmpListadosSinSolapes_' },
  { id: 'consultar-pantalla', fila: 99, que: 'La pestaña Consultar de la página: si cargó con su primera consulta, cuántas columnas y líneas sacó y si la página se sale por la derecha', funcion: 'cmpConsultarPantalla_' },
  { id: 'avisos-pantalla', fila: 32, que: 'La pestaña Avisos: cuántos avisos hay en los datos, cuántos esperan, cuántos están revisados, cuántas marcas huérfanas se han borrado y cuántos avisos no tienen frase llana', funcion: 'cmpAvisosPantalla_' },
  { id: 'clave-github', fila: 33, que: 'La clave de GitHub: si escribe, de qué tipo es y cuántos días faltan para que caduque (solo cifras y estados, nunca la clave)', funcion: 'cmpClaveGithub_' },
  { id: 'antigua-sin-pantalla', fila: 66, que: 'La aplicación de Google sin pantalla sigue trabajando sola: cuántas cosas de fondo se hicieron en las últimas 24 horas, si el disparador de 10 minutos existe y cuántas horas pasaron entre dos vueltas', funcion: 'cmpAntiguaSinPantalla_' },
  { id: 'diagnostico-limpio', fila: 35, que: 'El diagnóstico sin nombres que sube la aplicación no lleva nada personal: ni nombres, ni identificadores, ni correos, ni teléfonos, ni DNI/NIE (solo cuentas por clase)', funcion: 'cmpDiagnosticoLimpio_' },
  { id: 'diagnostico-envio', fila: 35, que: 'Si el diagnóstico sin nombres se ha subido, cuántos ficheros, registros y bytes lleva y cuánto hace del último intento', funcion: 'cmpDiagnosticoEnvio_' },
  { id: 'subidas-temporales', fila: 36, que: 'Cuántas carpetas de subidas a medias llevan más de una hora abandonadas en _interno/subiendo', funcion: 'cmpSubidasTemporales_' },
  { id: 'recibidos-pendientes', fila: 45, que: 'Cuántos ficheros soltados en la página nueva llevan más de media hora en el diario _interno/recibidos sin colocar', funcion: 'cmpRecibidosPendientes_' },
  { id: 'ensayo-ficha-igual', fila: 46, que: 'La ficha del alumno que monta la página nueva en el navegador sale igual que la de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoFichaIgual_' },
  { id: 'ensayo-personal-igual', fila: 47, que: 'El personal que monta la página nueva en el navegador sale igual que el de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoPersonalIgual_' },
  { id: 'ensayo-tutorias-igual', fila: 48, que: 'Las tutorías que monta la página nueva en el navegador (leyendo el PDF allí) salen iguales que las de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoTutoriasIgual_' },
  { id: 'ensayo-consejo-igual', fila: 49, que: 'El Consejo Escolar que monta la página nueva en el navegador (periodos e historial) sale igual que el de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoConsejoIgual_' },
  { id: 'ensayo-libros-igual', fila: 50, que: 'Los libros de texto que monta la página nueva en el navegador salen iguales que los de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoLibrosIgual_' },
  { id: 'ensayo-empresas-igual', fila: 51, que: 'Las empresas que monta la página nueva en el navegador salen iguales que las de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoEmpresasIgual_' },
  { id: 'ensayo-administraciones-igual', fila: 51, que: 'Las Administraciones que monta la página nueva en el navegador salen iguales que las de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoAdministracionesIgual_' },
  { id: 'ensayo-cargos-igual', fila: 51, que: 'Los cargos que monta la página nueva en el navegador salen iguales que los de hoy: cuántas partes se han comparado, cuántas son iguales o distintas, cuántas esperan a la aplicación de hoy y en cuántos campos hay diferencias (solo cuentas)', funcion: 'cmpEnsayoCargosIgual_' },
  { id: 'quien-monta', fila: 59, que: 'Quién montó la última parte de cada conjunto (la página nueva o la aplicación de hoy), qué conjuntos publica la página, turnos de montaje vigentes y caducados y choques (mal si la página vio que otro se llevaba su turno; solo cuentas)', funcion: 'cmpQuienMonta_' },
  { id: 'pagina-responde', fila: 58, que: 'La página nueva responde al momento mientras el ensayo trabaja: lo más lento que tardó en responder, en milisegundos (bien si no pasa de 500); sin medida si el ensayo no trabajó', funcion: 'cmpPaginaResponde_' },
  { id: 'ids-rellenos', fila: 44, que: 'Cuántas entradas del índice llegaron sin número de Drive, cuántas se han rellenado y cuántas siguen sin su fichero', funcion: 'cmpIdsRellenos_' },
  { id: 'listados', fila: 14, que: 'Cuántas entradas tiene cada listado y cuántas se han quedado viejas', funcion: 'cmpListados_' }
];

function cmpFuncion_(nombre) {
  return { cmpEnsayoFichaIgual_: cmpEnsayoFichaIgual_, cmpEnsayoPersonalIgual_: cmpEnsayoPersonalIgual_, cmpEnsayoTutoriasIgual_: cmpEnsayoTutoriasIgual_, cmpEnsayoConsejoIgual_: cmpEnsayoConsejoIgual_, cmpEnsayoLibrosIgual_: cmpEnsayoLibrosIgual_, cmpEnsayoEmpresasIgual_: cmpEnsayoEmpresasIgual_, cmpEnsayoAdministracionesIgual_: cmpEnsayoAdministracionesIgual_, cmpEnsayoCargosIgual_: cmpEnsayoCargosIgual_, cmpPaginaResponde_: cmpPaginaResponde_, cmpQuienMonta_: cmpQuienMonta_, cmpIdsRellenos_: cmpIdsRellenos_, cmpLibrosLectura_: cmpLibrosLectura_, cmpLibrosUnaFicha_: cmpLibrosUnaFicha_, cmpSubidasTemporales_: cmpSubidasTemporales_, cmpRecibidosPendientes_: cmpRecibidosPendientes_, cmpDiagnosticoLimpio_: cmpDiagnosticoLimpio_, cmpDiagnosticoEnvio_: cmpDiagnosticoEnvio_, cmpClaveGithub_: cmpClaveGithub_, cmpAntiguaSinPantalla_: cmpAntiguaSinPantalla_, cmpAvisosPantalla_: cmpAvisosPantalla_, cmpSoporteEnvio_: cmpSoporteEnvio_, cmpIndiceYCarpetas_: cmpIndiceYCarpetas_, cmpHechosPartes_: cmpHechosPartes_, cmpHechosIdUnico_: cmpHechosIdUnico_, cmpHechosCampos_: cmpHechosCampos_,
    cmpConsultarPantalla_: cmpConsultarPantalla_, cmpHechosAvisos_: cmpHechosAvisos_, cmpHechosFuentes_: cmpHechosFuentes_, cmpTandas_: cmpTandas_, cmpEntradaSinRecoger_: cmpEntradaSinRecoger_,
    cmpTiempos_: cmpTiempos_, cmpMatriculaCruce_: cmpMatriculaCruce_, cmpMatriculaUnaFicha_: cmpMatriculaUnaFicha_, cmpExpedientesCruce_: cmpExpedientesCruce_, cmpHistoriaSinNegativos_: cmpHistoriaSinNegativos_, cmpCensoCruce_: cmpCensoCruce_, cmpEntregas_: cmpEntregas_, cmpFichaCompleta_: cmpFichaCompleta_, cmpCensoUnaFicha_: cmpCensoUnaFicha_, cmpSinClasificar_: cmpSinClasificar_, cmpListados_: cmpListados_, cmpAdmisionPorNivel_: cmpAdmisionPorNivel_, cmpPersonalCruce_: cmpPersonalCruce_, cmpPersonalUnaFicha_: cmpPersonalUnaFicha_, cmpTutoriasCruce_: cmpTutoriasCruce_, cmpTutoriasLectura_: cmpTutoriasLectura_, cmpTutoriasHoy_: cmpTutoriasHoy_, cmpTutoriasSobras_: cmpTutoriasSobras_, cmpConsejoCruce_: cmpConsejoCruce_, cmpConsejoUnaFicha_: cmpConsejoUnaFicha_, cmpConsejoHoy_: cmpConsejoHoy_, cmpEmpresasCruce_: cmpEmpresasCruce_, cmpEmpresasUnaFicha_: cmpEmpresasUnaFicha_, cmpAdministracionesCruce_: cmpAdministracionesCruce_, cmpAdministracionesUnaFicha_: cmpAdministracionesUnaFicha_, cmpCargosCruce_: cmpCargosCruce_, cmpCargosUnaFicha_: cmpCargosUnaFicha_, cmpCargosHoy_: cmpCargosHoy_, cmpContactosCruce_: cmpContactosCruce_, cmpContactosUnaFicha_: cmpContactosUnaFicha_, cmpFichaIgualQueBd_: cmpFichaIgualQueBd_, cmpFichaIgualClaves_: cmpFichaIgualClaves_, cmpSoporteBotonUnico_: cmpSoporteBotonUnico_, cmpListadosSinSolapes_: cmpListadosSinSolapes_ }[nombre];
}

/* Los ids de todos los ficheros (no borrados) de una carpeta y de sus hijas. */
function cmpIdsDeFicheros_(carpeta, ids) {
  const f = carpeta.getFiles();
  while (f.hasNext()) ids.push(f.next().getId());
  const c = carpeta.getFolders();
  while (c.hasNext()) cmpIdsDeFicheros_(c.next(), ids);
  return ids;
}

function cmpIndiceYCarpetas_(ctx) {
  /* Una sola pasada por las carpetas (sin abrir cada fichero por su id: con muchos ficheros agotaba el tiempo). Lo que está en la papelera no sale en la pasada.
     Una entrada a la que le falta el fichero y ya tiene su aviso en «Avisos» (`faltaFichero`, Reparar.gs) se cuenta aparte y no pone la comprobación en `mal`. */
  const entradas = ctx.indice.listados.filter(function (e) { return !e.porAlumno; });
  const enDrive = cmpIdsDeFicheros_(subcarpetaPorRuta_(ctx.raiz, 'listados'), []);
  const estan = {};
  enDrive.forEach(function (id) { estan[id] = true; });
  const sinId = { n: 0 };
  const idDe = function (e) { return cmpIdDeEntrada_(ctx.raiz, e, sinId); };
  const sinFichero = entradas.filter(function (e) { return !estan[idDe(e)]; });
  const faltan = sinFichero.filter(function (e) { return !e.faltaFichero; }).length;
  const conAviso = sinFichero.length - faltan;
  const conocidos = {};
  entradas.forEach(function (e) { conocidos[idDe(e)] = true; });
  const sobran = enDrive.filter(function (id) { return !conocidos[id]; }).length;
  const ia = leerIndiceAlumnos_(ctx.raiz).listados;
  const enAlumnos = cmpIdsDeFicheros_(subcarpetaPorRuta_(ctx.raiz, 'alumnos'), []);
  const estanA = {};
  enAlumnos.forEach(function (id) { estanA[id] = true; });
  const faltanA = ia.filter(function (e) { return !estanA[idDe(e)]; }).length;
  const conocidosA = {};
  ia.forEach(function (e) { conocidosA[idDe(e)] = true; });
  const sobranA = enAlumnos.filter(function (id) { return !conocidosA[id]; }).length;
  const cifras = { entradas: entradas.length, ficheros: enDrive.length, faltan: faltan, 'faltan-con-aviso': conAviso, sobran: sobran, 'alumnos-entradas': ia.length, 'alumnos-ficheros': enAlumnos.length, 'alumnos-faltan': faltanA, 'alumnos-sobran': sobranA, 'sin-id': sinId.n };
  const rep = leerReparar_(ctx.raiz);   // lo que arregló la última pasada de Reparar.gs
  if (rep) { cifras['reparados-movidos'] = rep.movidos; cifras['reparados-papelera'] = rep.papelera; cifras['reparados-con-anterior'] = rep.anterior; cifras['reparados-sin-anterior'] = rep.sinAnterior; }
  return { estado: faltan + sobran + faltanA + sobranA ? 'mal' : 'bien',
    faltantes: sinFichero.filter(function (e) { return !e.faltaFichero; }).map(function (e) { return e.idDrive || e.ruta; }), cifras: cifras };
}

/* Una parte abierta, una sola vez por pasada: { bytes, huella, obj } o null si no se puede abrir. */
function cmpAbrirParte_(ctx, h) {
  if (ctx.cache[h.ruta] !== undefined) return ctx.cache[h.ruta];
  let r = null;
  try {
    const bytes = ficheroDeEntrada_(h).getBlob().getBytes();
    r = { bytes: bytes.length, huella: huella_(bytes), obj: JSON.parse(bytesATexto_(bytes)) };
  } catch (e) { r = null; }
  ctx.cache[h.ruta] = r;
  return r;
}

function cmpHechosPartes_(ctx) {
  const hechos = ctx.indice.hechos || [];
  if (!hechos.length) return { estado: 'sin datos', cifras: { partes: 0 } };
  let mal = 0, sinFichero = 0;
  hechos.forEach(function (h) {
    const p = cmpAbrirParte_(ctx, h);
    if (!p) { sinFichero++; return; }
    if (p.huella !== h.huella || p.bytes !== h.bytes || p.obj.registros.length !== h.registros || p.obj.cursoEscolar !== h.cursoEscolar) mal++;
  });
  const anos = ((ctx.avance.leidos.alumnado || {}).anos) || [];
  const falta = anos.indexOf(anioInicioActual_()) !== -1 && !hechos.some(function (h) { return h.parte === 'actuales' && h.cursoEscolar === cursoActual_(); }) ? 1 : 0;
  return { estado: mal + sinFichero + falta ? 'mal' : 'bien', cifras: { partes: hechos.length, 'no-coinciden': mal, 'sin-fichero': sinFichero, 'falta-la-actual': falta } };
}

function cmpHechosIdUnico_(ctx) {
  const hechos = ctx.indice.hechos || [];
  if (!hechos.length) return { estado: 'sin datos', cifras: { partes: 0 } };
  let malos = 0, antiguosEnActuales = 0;
  const enActuales = {};
  const abiertas = hechos.map(function (h) { return { h: h, p: cmpAbrirParte_(ctx, h) }; }).filter(function (x) { return x.p; });
  abiertas.forEach(function (x) {
    const vistos = {};
    x.p.obj.registros.forEach(function (r) {
      if (!r.id || vistos[r.id]) malos++;
      vistos[r.id] = true;
      if (x.h.parte === 'actuales') enActuales[r.id] = true;
    });
  });
  abiertas.filter(function (x) { return x.h.parte === 'antiguos'; }).forEach(function (x) {
    x.p.obj.registros.forEach(function (r) { if (enActuales[r.id]) antiguosEnActuales++; });
  });
  return { estado: malos + antiguosEnActuales ? 'mal' : 'bien', cifras: { partes: abiertas.length, 'vacios-o-repetidos': malos, 'antiguos-en-actuales': antiguosEnActuales } };
}

function cmpHechosCampos_(ctx) {
  const hechos = ctx.indice.hechos || [];
  if (!hechos.length) return { estado: 'sin datos', cifras: { partes: 0 } };
  let sinDescribir = 0, extra = 0;
  hechos.forEach(function (h) {
    const p = cmpAbrirParte_(ctx, h);
    if (!p) return;
    const claves = {};
    p.obj.campos.forEach(function (c) {
      claves[c.clave] = true;
      if (['clave', 'etiqueta', 'apartado', 'tipo', 'dueno', 'fuente'].some(function (k) { return !c[k]; })) sinDescribir++;
    });
    const sinCampo = (CONJUNTOS_.filter(function (c) { return c.conjunto === h.conjunto; })[0] || {}).datosSinCampo || [];   // p. ej. `origen` de los contactos: no es un dato para enseñar
    p.obj.registros.forEach(function (r) { Object.keys(r.datos).forEach(function (k) { if (!claves[k] && sinCampo.indexOf(k) === -1) extra++; }); });
  });
  return { estado: sinDescribir + extra ? 'mal' : 'bien', cifras: { 'campos-sin-describir': sinDescribir, 'datos-sin-campo': extra } };
}

function cmpHechosAvisos_(ctx) {
  const hechos = ctx.indice.hechos || [];
  if (!hechos.length) return { estado: 'sin datos', cifras: { partes: 0 } };
  let desconocidos = 0, distintas = 0;
  const contadores = contadoresDeAviso_();
  const estado = leerJson_(subcarpetaPorRuta_(ctx.raiz, 'hecho'), 'estado.json');
  const delEstado = {};
  ((estado && estado.conjuntos) || []).forEach(function (c) { c.partes.forEach(function (p) { delEstado[c.conjunto + '/' + p.parte + '/' + p.cursoEscolar + '/' + (p.periodo || '')] = p.avisos; }); });
  hechos.forEach(function (h) {
    const p = cmpAbrirParte_(ctx, h);
    if (!p) return;
    p.obj.avisos.forEach(function (a) { if (!contadores[a.tipo]) desconocidos++; });
    const dicho = delEstado[h.conjunto + '/' + h.parte + '/' + h.cursoEscolar + '/' + (h.periodo || '')];
    if (!dicho || JSON.stringify(dicho) !== JSON.stringify(contarAvisos_(p.obj.avisos))) distintas++;
  });
  return { estado: desconocidos + distintas ? 'mal' : 'bien', cifras: { 'tipos-desconocidos': desconocidos, 'cuentas-distintas': distintas } };
}

function cmpHechosFuentes_(ctx) {
  const alDia = (ctx.indice.hechos || []).filter(function (h) { return h.alDia; });
  if (!alDia.length) return { estado: 'sin datos', cifras: { 'al-dia': 0 } };
  const mal = alDia.filter(function (h) {
    return h.fuentes.some(function (f) { const e = buscarEnIndice_(ctx.indice, f.clave, f.variante); return !e || e.huella !== f.huella; });
  }).length;
  return { estado: mal ? 'mal' : 'bien', cifras: { 'al-dia': alDia.length, distintas: mal } };
}

function cmpTandas_(ctx) {
  const dia = 24 * 3600 * 1000;
  const viejas = (ctx.indice.hechos || []).filter(function (h) { return !h.alDia && ctx.ahoraMs - new Date(h.hecho).getTime() > dia; }).length;
  const atascado = !!ctx.avance.atascado;
  const desde = ctx.avance.ultima ? Math.round((ctx.ahoraMs - new Date(ctx.avance.ultima).getTime()) / 60000) : -1;
  return { estado: atascado || viejas ? 'mal' : 'bien', cifras: { atascado: atascado, 'sin-avanzar': ctx.avance.sinAvance || 0, 'minutos-desde-la-ultima': desde, 'partes-de-mas-de-un-dia': viejas } };
}

function cmpEntradaSinRecoger_(ctx) {
  const it = subcarpetaPorRuta_(ctx.raiz, 'entrada').getFiles();
  let n = 0, masViejo = 0;
  while (it.hasNext()) {
    const f = it.next();
    if (esTemporalDeEntrada_(f.getName())) continue;
    n++;
    masViejo = Math.max(masViejo, Math.round((ctx.ahoraMs - f.getDateCreated().getTime()) / 60000));
  }
  const disparador = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'recogerEntradaProgramada'; });
  return { estado: masViejo > 30 ? 'mal' : 'bien', cifras: { ficheros: n, 'minutos-del-mas-viejo': masViejo, disparador: disparador } };
}

function cmpTiempos_(ctx) {
  const mayor = function (o) { return Object.keys(o || {}).reduce(function (m, k) { return Math.max(m, o[k] || 0); }, 0); };
  return { estado: 'dato', cifras: { 'lector-mas-lento-s': mayor(ctx.avance.segundos.lectores), 'montador-mas-lento-s': mayor(ctx.avance.segundos.montadores), 'tanda-mas-larga-s': ctx.avance.segundos.tandaMax || 0 } };
}

function cmpSinClasificar_(ctx) {
  const lista = leerPendientes_(ctx.raiz).pendientes;
  const cifras = { esperan: lista.length, 'sin-saber-que-son': lista.filter(function (p) { return !p.clave; }).length };
  ['cursoEscolar', 'ambito', 'periodo', 'alumno'].forEach(function (campo) {
    cifras['falta-' + campo.toLowerCase()] = lista.filter(function (p) { return (p.falta || []).indexOf(campo) !== -1; }).length;
  });
  return { estado: 'dato', cifras: cifras };
}

function cmpListados_(ctx) {
  const cifras = {};
  let otrosTipos = 0;
  ctx.indice.listados.forEach(function (e) {
    const c = CATALOGO_.filter(function (x) { return x.clave === e.clave; })[0];
    if (!c) { otrosTipos++; return; }
    const entradas = e.porAlumno ? (e.alumnos || 0) : 1;
    const viejo = !e.porAlumno && (ctx.ahoraMs - new Date(e.subido).getTime()) / 86400000 > (e.caducaDias || c.dias);
    cifras[c.clave + '-entradas'] = (cifras[c.clave + '-entradas'] || 0) + entradas;
    cifras[c.clave + '-viejas'] = (cifras[c.clave + '-viejas'] || 0) + (viejo ? 1 : 0);
  });
  cifras['de-tipos-creados-a-mano'] = otrosTipos;
  return { estado: 'dato', cifras: cifras };
}

/* Lo que cuentan las dos comprobaciones de la matrícula: la parte `actuales` del curso de hoy y lo leído de sus ficheros de matrícula. null si no hay con qué. */
function cmpDatosMatricula_(ctx) {
  const h = (ctx.indice.hechos || []).filter(function (x) { return x.parte === 'actuales' && x.cursoEscolar === cursoActual_(); })[0];
  const claves = Object.keys(ctx.avance.leidos).filter(function (k) { return k.indexOf('matricula/' + cursoActual_() + '/') === 0; });
  if (!h || !claves.length) return null;
  const p = cmpAbrirParte_(ctx, h);
  if (!p) return null;
  const filas = {}, casan = {}, sin = {};
  claves.forEach(function (k) { const l = cargarLeido_(ctx.raiz, k); if (l) filas[l.nivel] = (filas[l.nivel] || 0) + l.filas.length; });
  p.obj.registros.forEach(function (r) { const n = r.datos.matriculaNivel; if (n) casan[n] = (casan[n] || 0) + 1; });
  p.obj.avisos.forEach(function (a) { if (a.tipo === 'matricula-sin-ficha' || a.tipo === 'matricula-repetida') sin[a.datos.nivel] = (sin[a.datos.nivel] || 0) + 1; });
  return { filas: filas, casan: casan, sin: sin, registros: p.obj.registros.length };
}

function cmpMatriculaCruce_(ctx) {
  const d = cmpDatosMatricula_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { niveles: 0 } };
  const cifras = {};
  Object.keys(d.filas).forEach(function (n) { cifras[n + '-filas'] = d.filas[n]; cifras[n + '-casan'] = d.casan[n] || 0; });
  cifras['actuales-sin-matricula'] = d.registros - Object.keys(d.casan).reduce(function (n, k) { return n + d.casan[k]; }, 0);
  cifras['niveles-sin-fichero'] = NIVELES_.filter(function (n) { return d.filas[n.valor] === undefined; }).length;
  return { estado: 'dato', cifras: cifras };
}

function cmpMatriculaUnaFicha_(ctx) {
  const d = cmpDatosMatricula_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { niveles: 0 } };
  const mal = Object.keys(d.filas).filter(function (n) { return d.filas[n] !== (d.casan[n] || 0) + (d.sin[n] || 0); }).length;
  return { estado: mal ? 'mal' : 'bien', cifras: { niveles: Object.keys(d.filas).length, 'niveles-que-no-cuadran': mal } };
}

/* La parte `actuales` del curso de hoy, abierta. Null si no hay. */
function cmpParteActual_(ctx) {
  const h = (ctx.indice.hechos || []).filter(function (x) { return x.parte === 'actuales' && x.cursoEscolar === cursoActual_(); })[0];
  return h ? cmpAbrirParte_(ctx, h) : null;
}

function cmpExpedientesCruce_(ctx) {
  const p = cmpParteActual_(ctx);
  const tipos = [['primaria', 'expediente-primaria'], ['secundaria', 'expediente-secundaria']];
  const hay = tipos.some(function (t) { return ctx.indice.listados.some(function (e) { return e.clave === t[1] && e.porAlumno; }); });
  if (!p || !hay) return { estado: 'sin datos', cifras: { tipos: 0 } };
  const cifras = {};
  const ind = leerIndiceAlumnos_(ctx.raiz).listados;
  tipos.forEach(function (t) {
    const leido = cargarLeido_(ctx.raiz, t[1]) || { ficheros: {} };
    const suyos = ind.filter(function (e) { return e.clave === t[1]; });
    cifras[t[0] + '-ficheros'] = suyos.length;
    cifras[t[0] + '-asignados'] = p.obj.registros.filter(function (r) { return r.datos[t[0] + 'Expediente']; }).length;
    cifras[t[0] + '-en-aviso'] = p.obj.avisos.filter(function (a) { return a.tipo === 'matricula-sin-ficha' && a.datos[t[0]]; }).length;
    cifras[t[0] + '-por-leer'] = suyos.filter(function (e) { return !(leido.ficheros[e.alumno] && leido.ficheros[e.alumno].huella === e.huella); }).length;
  });
  return { estado: 'dato', cifras: cifras };
}

function cmpHistoriaSinNegativos_(ctx) {
  const p = cmpParteActual_(ctx);
  if (!p) return { estado: 'sin datos', cifras: { partes: 0 } };
  let negativas = 0, pasadas = 0;
  p.obj.registros.forEach(function (r) {
    const d = r.datos;
    if (d.repeticionesEso < 0 || d.repSinLocalizarBruto < 0 || d.repeticionesPrimaria < 0) negativas++;
    if (d.repeticionesPrimaria > 1 && d.fuentePrimaria !== 'EXPEDIENTE') pasadas++;
  });
  return { estado: negativas + pasadas ? 'mal' : 'bien', cifras: { negativas: negativas, 'estimadas-de-mas-de-una': pasadas } };
}

/* La parte `actuales` de hoy y el censo leído de su curso. Null si falta alguno. */
function cmpDatosCenso_(ctx) {
  const p = cmpParteActual_(ctx);
  const k = Object.keys(ctx.avance.leidos).filter(function (x) { return x.indexOf('censo-neae/' + cursoActual_()) === 0; })[0];
  const leido = k ? cargarLeido_(ctx.raiz, k) : null;
  return p && leido ? { p: p, fichas: leido.fichas } : null;
}

function cmpCensoCruce_(ctx) {
  const d = cmpDatosCenso_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { fichas: 0 } };
  const regs = d.p.obj.registros.filter(function (r) { return r.datos.censoNeae === true; });
  const cifras = { fichas: d.fichas.length,
    'por-iniciales': regs.filter(function (r) { return r.datos.censoLocalizado === 'iniciales + curso'; }).length,
    'por-fecha': regs.filter(function (r) { return r.datos.censoLocalizado !== 'iniciales + curso'; }).length,
    'en-aviso': d.p.obj.avisos.filter(function (a) { return a.tipo === 'matricula-sin-ficha' && a.datos.censo; }).length };
  [['1º', 'eso1'], ['2º', 'eso2'], ['3º', 'eso3'], ['4º', 'eso4'], ['1º BACH', 'bac1'], ['2º BACH', 'bac2']].forEach(function (n) {
    cifras['trae-' + n[1]] = d.fichas.some(function (f) { return f.nivel === n[0]; });
  });
  return { estado: 'dato', cifras: cifras };
}

function cmpCensoUnaFicha_(ctx) {
  const d = cmpDatosCenso_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { fichas: 0 } };
  const asignadas = d.p.obj.registros.filter(function (r) { return r.datos.censoNeae === true; }).length +
    d.p.obj.avisos.filter(function (a) { return a.tipo === 'matricula-sin-ficha' && a.datos.censo; }).length;
  const otras = d.p.obj.avisos.filter(function (a) { return a.tipo === 'censo-sin-alumno' || a.tipo === 'censo-empate' || a.tipo === 'censo-repetida'; }).length;
  const mal = asignadas + otras === d.fichas.length ? 0 : 1;
  return { estado: mal ? 'mal' : 'bien', cifras: { fichas: d.fichas.length, asignadas: asignadas, 'sin-asignar': otras } };
}

function cmpEntregas_(ctx) {
  const ent = entregasDeEstado_(ctx.avance);
  if (!ent.length) return { estado: 'sin datos', cifras: { entregas: 0 } };
  const suma = function (k) { return ent.reduce(function (n, e) { return n + (e[k] || 0); }, 0); };
  const ultima = ent.map(function (e) { return new Date(e.cuando).getTime(); }).sort().pop();
  return { estado: 'dato', cifras: { entregas: ent.length, 'dias-desde-la-ultima': Math.floor((ctx.ahoraMs - ultima) / 86400000), 'campos-aceptados': suma('camposAceptados'),
    'campos-ignorados': suma('camposIgnorados'), 'registros-usados': suma('registrosUsados'), 'registros-sin-ficha': suma('registrosSinFicha'), 'valores-ignorados': suma('valoresIgnorados'),
    'hecho-con-viejo': ent.some(function (e) { return e.hechoConViejo; }) } };
}

function cmpFichaCompleta_(ctx) {
  const conj = CONJUNTOS_.filter(function (c) { return c.fichaCompleta; })[0];
  if (!conj || !ctx.avance.relevo) return { estado: 'sin datos', cifras: { relevo: false } };
  const entradas = ctx.indice.listados.filter(function (e) { return e.clave === conj.fichaCompleta.clave; });
  let mal = entradas.length === 1 ? 0 : 1, repetidos = 0, sinDueno = 0, acuerdo = true;
  if (entradas.length === 1) {
    try {
      const f = JSON.parse(bytesATexto_(ficheroDeEntrada_(entradas[0]).getBlob().getBytes()));
      acuerdo = f.acuerdo === conj.fichaCompleta.acuerdo;
      const vistos = {};
      f.alumnos.forEach(function (a) { if (vistos[a.idEscolar]) repetidos++; vistos[a.idEscolar] = true; });
      sinDueno = f.campos.filter(function (c) { return !c.dueno; }).length;
    } catch (e) { mal = 1; }
  }
  return { estado: mal || repetidos || sinDueno || !acuerdo ? 'mal' : 'bien', cifras: { entradas: entradas.length, 'repetidos': repetidos, 'campos-sin-dueno': sinDueno, 'acuerdo-2': acuerdo } };
}

/* Por clave y curso: cuántas entradas hay; y cuántos ficheros de esas claves esperan en «Sin clasificar» porque no se sabe su grado, nivel o modalidad. */
function cmpAdmisionPorNivel_(ctx) {
  const claves = ['admision', 'planificacion', 'matricula-provisional'];
  const cifras = {};
  ctx.indice.listados.forEach(function (e) {
    if (claves.indexOf(e.clave) === -1) return;
    const k = e.clave + '-' + (e.cursoEscolar || String(e.variante || '').split('/')[0] || 'sin-curso');
    cifras[k] = (cifras[k] || 0) + 1;
  });
  cifras['esperan-sin-nivel'] = leerPendientes_(ctx.raiz).pendientes.filter(function (p) {
    return claves.indexOf(p.clave) !== -1 && (p.falta || []).indexOf('ambito') !== -1;
  }).length;
  return { estado: 'dato', cifras: cifras };
}

/* ==== ComprobIds.gs ==== */
/* Fila 44: `ids-rellenos`. Solo lee: cuántas entradas había sin id, cuántas se han rellenado y cuántas siguen sin fichero. */
function cmpIdsRellenos_(ctx) {
  const vacias = function (l) { return (l || []).filter(function (e) { return !e.idDrive && !e.porAlumno; }).length; };
  const ahora = vacias(ctx.indice.listados) + vacias(ctx.indice.hechos) + vacias(leerIndiceAlumnos_(ctx.raiz).listados);
  let r = null;
  try { r = leerJson_(subcarpetaPorRuta_(ctx.raiz, '_interno'), ARCHIVO_IDS_); } catch (e) { r = null; }
  const sin = r ? r.sinFichero.length : 0;
  return { estado: sin ? 'mal' : 'bien', cifras: { 'sin-id-ahora': ahora, habia: r ? r.habia : 0, rellenadas: r ? r.rellenadas : 0, 'siguen-sin-fichero': sin } };
}

/* El id de una entrada para comparar con lo que hay en Drive: el suyo y, si viene vacío, el del fichero que está en su `ruta` (se cuenta en `cuenta.n`). */
function cmpIdDeEntrada_(raiz, e, cuenta) {
  if (e.idDrive) return e.idDrive;
  const f = ficheroPorRuta_(raiz, e.ruta);
  if (!f) return '';
  cuenta.n++;
  return f.getId();
}

/* ==== ComprobPersonal.gs ==== */
/* Las comprobaciones del personal (fila 11). Solo leen y solo cuentan: ni un nombre, ni un documento, ni un puesto, ni un título de columna sale de aquí. */

/* Las partes del personal, abiertas, y lo leído de sus listados, por curso. null si no hay ninguna parte. */
function cmpDatosPersonal_(ctx) {
  const partes = (ctx.indice.hechos || []).filter(function (h) { return h.conjunto === 'personal'; });
  if (!partes.length) return null;
  const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === 'personal'; })[0];
  const cursos = partes.map(function (h) {
    const p = cmpAbrirParte_(ctx, h);
    const leidos = Object.keys(ctx.avance.leidos).filter(function (k) { return k.indexOf('personal/' + h.cursoEscolar) === 0; })
      .map(function (k) { return cargarLeido_(ctx.raiz, k); }).filter(function (l) { return !!l; });
    return { h: h, p: p, leidos: leidos };
  });
  return { conj: conj, cursos: cursos };
}

/* Los títulos de columna que la tabla de campos conoce (más las tres que el lector exige). */
function cmpTitulosConocidos_(conj) {
  const t = {};
  conj.campos.forEach(function (c) { (c.col || []).forEach(function (x) { t[normalizarTitulo_(x)] = true; }); });
  return t;
}

function cmpPersonalCruce_(ctx) {
  const d = cmpDatosPersonal_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { cursos: 0 } };
  const conocidos = cmpTitulosConocidos_(d.conj);
  const desconocidas = {}, nombresDe = {};
  let listados = 0, filas = 0, personas = 0, docentes = 0, noDocentes = 0, sinTipo = 0, variasFilas = 0, dosNombres = 0;
  d.cursos.forEach(function (c) {
    listados += c.leidos.length;
    c.leidos.forEach(function (l) {
      filas += l.filas.length;
      l.titulos.forEach(function (t) { if (t && !conocidos[normalizarTitulo_(t)]) desconocidas[normalizarTitulo_(t)] = true; });
      const tn = l.titulos.map(normalizarTitulo_), iN = tn.indexOf('empleado/a'), iD = tn.indexOf('dni/pasaporte');
      if (iN === -1 || iD === -1) return;
      l.filas.forEach(function (f) {
        const id = c.h.cursoEscolar + '|' + idDePersonal_(f[iD]);
        if (!idDePersonal_(f[iD])) return;
        nombresDe[id] = nombresDe[id] || {};
        nombresDe[id][normalizarAlumno_(f[iN])] = true;
      });
    });
    if (!c.p) return;
    c.p.obj.registros.forEach(function (r) {
      personas++;
      if (r.datos.tipoPersonal === 'docente') docentes++; else if (r.datos.tipoPersonal === 'no-docente') noDocentes++; else sinTipo++;
      if ((r.datos.puestos || []).length > 1) variasFilas++;
    });
  });
  Object.keys(nombresDe).forEach(function (id) { if (Object.keys(nombresDe[id]).length > 1) dosNombres++; });
  return { estado: 'dato', cifras: { cursos: d.cursos.length, listados: listados, filas: filas, personas: personas, docentes: docentes, 'no-docentes': noDocentes, 'sin-tipo': sinTipo,
    'con-mas-de-una-fila': variasFilas, 'documentos-con-dos-nombres': dosNombres, 'columnas-desconocidas': Object.keys(desconocidas).length } };
}

/* Cada fila con nombre de cada listado está en un solo registro (en su tabla `puestos`) o en un solo aviso, y en ninguna parte más. */
function cmpPersonalUnaFicha_(ctx) {
  const d = cmpDatosPersonal_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { cursos: 0 } };
  let malos = 0, filas = 0, enFichas = 0, enAvisos = 0;
  d.cursos.forEach(function (c) {
    if (!c.p) { malos++; return; }
    const usables = c.leidos.filter(function (l) { return !l.problema; });
    const delCurso = usables.reduce(function (n, l) { return n + l.filas.length; }, 0);
    const enRegistros = c.p.obj.registros.reduce(function (n, r) { return n + (r.datos.puestos || []).length; }, 0);
    const sueltas = c.p.obj.avisos.filter(function (a) { return a.tipo === 'personal-sin-id'; }).length;
    filas += delCurso; enFichas += enRegistros; enAvisos += sueltas;
    if (delCurso !== enRegistros + sueltas) malos++;
  });
  return { estado: malos ? 'mal' : 'bien', cifras: { cursos: d.cursos.length, filas: filas, 'en-fichas': enFichas, 'en-avisos': enAvisos, 'cursos-que-no-cuadran': malos } };
}

/* ==== ComprobTutorias.gs ==== */
/* Las comprobaciones de las tutorías (fila 21). Solo leen y solo cuentan: ni un nombre, ni un documento, ni un grupo sale de aquí. */

/* Las partes de tutorías abiertas y lo leído de su listado, por curso. null si no hay ninguna parte. */
function cmpDatosTutorias_(ctx) {
  const partes = (ctx.indice.hechos || []).filter(function (h) { return h.conjunto === 'tutorias'; });
  if (!partes.length) return null;
  return partes.map(function (h) {
    const k = Object.keys(ctx.avance.leidos).filter(function (x) { return x === 'tutorias/' + h.cursoEscolar; })[0];
    return { h: h, p: cmpAbrirParte_(ctx, h), leido: k ? cargarLeido_(ctx.raiz, k) : null };
  });
}

function cmpTutoriasCruce_(ctx) {
  const d = cmpDatosTutorias_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { cursos: 0 } };
  const c = { cursos: d.length, 'ficheros-leidos': 0, 'ficheros-sin-usar': 0, lineas: 0, grupos: 0, personas: 0, sustitutos: 0, 'lineas-sin-grupo': 0, 'grupos-con-tutor-hoy': 0, 'grupos-sin-tutor-hoy': 0,
    'personas-fuera-del-personal': 0, 'grupos-con-alumnos-sin-tutor': 0, 'grupos-con-tutor-sin-alumnos': 0 };
  const personas = {};
  d.forEach(function (x) {
    if (x.leido) {
      c['ficheros-leidos']++;
      if (!estadoDeFicheroTutorias_(x.leido, x.h.cursoEscolar).usable) c['ficheros-sin-usar']++;
    }
    if (!x.p) return;
    const o = x.p.obj;
    const lineas = [];
    o.registros.forEach(function (r) {
      c.grupos++;
      if (r.datos.tutorHoy) c['grupos-con-tutor-hoy']++; else c['grupos-sin-tutor-hoy']++;
      (r.datos.tutores || []).forEach(function (t) { lineas.push(t); });
    });
    (o.funcionesSinGrupo || []).forEach(function (t) { lineas.push(t); c['lineas-sin-grupo']++; });
    c.lineas += lineas.length;
    lineas.forEach(function (t) {
      if (t.sustituto) c.sustitutos++;
      personas[x.h.cursoEscolar + '|' + (t.id || 'n:' + normalizarAlumno_(t.empleado))] = true;
    });
    c['personas-fuera-del-personal'] += o.avisos.filter(function (a) { return a.tipo === 'tutoria-no-esta-en-personal'; }).length;
    c['grupos-con-alumnos-sin-tutor'] += o.avisos.filter(function (a) { return a.tipo === 'tutoria-grupo-sin-tutor'; }).length;
    const ha = parteVecinaTutorias_(ctx.indice, 'alumnado', x.h.cursoEscolar, 'actuales');
    if (ha && o.alumnadoMirado) {
      const v = vecinasDeTutorias_(ctx.indice, x.h.cursoEscolar, ctx.cache);
      o.registros.forEach(function (r) { if (!v.alumnado[normalizarAlumno_(r.id)]) c['grupos-con-tutor-sin-alumnos']++; });
    }
  });
  c.personas = Object.keys(personas).length;
  return { estado: 'dato', cifras: c };
}

/* En cada fichero leído no sobra ningún texto de sus tablas, y cada línea leída está una sola vez en la parte (en un grupo o en funcionesSinGrupo). */
function cmpTutoriasLectura_(ctx) {
  const d = cmpDatosTutorias_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { cursos: 0 } };
  let sobran = 0, leidas = 0, enPartes = 0, malos = 0;
  d.forEach(function (x) {
    if (!x.leido) return;
    sobran += x.leido.sobran || 0;
    if (!x.p || !estadoDeFicheroTutorias_(x.leido, x.h.cursoEscolar).usable) return;
    const o = x.p.obj;
    const aqui = o.registros.reduce(function (n, r) { return n + (r.datos.tutores || []).length; }, 0) + (o.funcionesSinGrupo || []).length;
    leidas += x.leido.lineas.length; enPartes += aqui;
    if (aqui !== x.leido.lineas.length) malos++;
  });
  return { estado: sobran || malos ? 'mal' : 'bien', cifras: { cursos: d.length, 'textos-de-sobra': sobran, 'lineas-leidas': leidas, 'lineas-en-partes': enPartes, 'cursos-que-no-cuadran': malos } };
}

/* En la parte del curso de hoy, las marcas `hoy`, `tutorHoy` y los dos avisos de hoy son los que dan las fechas de las líneas el día en que se comprueba. */
function cmpTutoriasHoy_(ctx) {
  const h = (ctx.indice.hechos || []).filter(function (x) { return x.conjunto === 'tutorias' && x.cursoEscolar === cursoActual_(); })[0];
  const p = h ? cmpAbrirParte_(ctx, h) : null;
  if (!p) return { estado: 'sin datos', cifras: { grupos: 0 } };
  const hoy = hoyMadrid_();
  let malos = 0, huecos = 0, dos = 0;
  p.obj.registros.forEach(function (r) {
    const lineas = r.datos.tutores || [];
    const v = vigorDeGrupoTutorias_(lineas, hoy);
    const marcas = lineas.every(function (t) { return !!t.hoy === !!(t.desde && t.desde <= hoy && hoy <= t.hasta); });
    const tutor = v.personas === 1 ? v.enVigor[0].empleado : undefined;
    if (!marcas || r.datos.tutorHoy !== tutor) malos++;
    if (v.hueco) huecos++;
    if (v.personas > 1) dos++;
  });
  const avisos = function (tipo) { return p.obj.avisos.filter(function (a) { return a.tipo === tipo; }).length; };
  if (avisos('tutoria-hueco-hoy') !== huecos || avisos('tutoria-dos-tutores-hoy') !== dos) malos++;
  return { estado: malos ? 'mal' : 'bien', cifras: { grupos: p.obj.registros.length, 'grupos-que-no-cuadran': malos, 'huecos-hoy': huecos, 'dos-tutores-hoy': dos } };
}

/* ==== ComprobTutoriasSobras.gs ==== */
/* La forma, sin sus letras, de los textos que no se han sabido colocar en un listado de tutorías (fila 28). Ni el texto, ni la fila de encima, ni un grupo salen de aquí. */

const SOBRAS_TUTORIAS_EN_COMPROBACION_ = 5;

/* Cuántas palabras, letras, cifras y mayúsculas tiene un texto, y qué signos lleva. */
function formaDeTextoTutorias_(t) {
  const cuenta = function (re) { return (t.match(re) || []).length; };
  const sinMarcas = t.replace(/[.\-\s]/g, '');
  return {
    palabras: t.split(/\s+/).filter(function (w) { return w; }).length, letras: cuenta(/\p{L}/gu), numeros: cuenta(/\d/g), mayusculas: cuenta(/\p{Lu}/gu),
    coma: t.indexOf(',') !== -1, parentesis: /[()]/.test(t), barra: t.indexOf('/') !== -1, guion: t.indexOf('-') !== -1, punto: t.indexOf('.') !== -1,
    marca: /^\(\s*sustituto\s*\/\s*a\s*\)$/i.test(t.trim()),
    periodo: /^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*-\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}$/.test(t.trim()),
    fecha: /^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}$/.test(t.trim()),
    documento: /^(\d{8}[A-Za-z]|[XYZxyz]\d{7}[A-Za-z])$/.test(sinMarcas)
  };
}

function cmpTutoriasSobras_(ctx) {
  const d = cmpDatosTutorias_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { sobras: 0 } };
  const conSobras = d.filter(function (x) { return x.leido && (x.leido.sobran || 0) > 0; })
    .sort(function (a, b) { return anioDeCurso_(b.h.cursoEscolar) - anioDeCurso_(a.h.cursoEscolar); });
  const c = { sobras: conSobras.reduce(function (n, x) { return n + x.leido.sobran; }, 0), 'cursos-con-sobras': conSobras.length };
  const lista = [];
  conSobras.forEach(function (x) { (x.leido.sobras || []).forEach(function (s) { lista.push({ curso: x.h.cursoEscolar, s: s }); }); });
  lista.slice(0, SOBRAS_TUTORIAS_EN_COMPROBACION_).forEach(function (e, i) {
    const p = 's' + (i + 1) + '-', s = e.s, f = formaDeTextoTutorias_(String(s.t));
    const mm = function (v) { return v === null || v === undefined ? -1 : v; };
    c[p + 'curso'] = e.curso; c[p + 'hoja'] = s.hoja; c[p + 'hojas'] = s.hojas; c[p + 'tabla'] = s.tabla; c[p + 'columnas'] = s.columnas; c[p + 'columna'] = s.columna;
    c[p + 'desde-la-columna'] = s.desdeLaColumna; c[p + 'bajo-la-anterior'] = mm(s.bajoLaAnterior); c[p + 'sobre-la-siguiente'] = mm(s.sobreLaSiguiente);
    c[p + 'bajo-el-ultimo-renglon'] = mm(s.bajoElUltimoRenglon); c[p + 'renglones-de-la-anterior'] = s.renglonesDeLaAnterior; c[p + 'filas'] = s.filas;
    TUTORIAS_COLUMNAS_.forEach(function (k) { c[p + 'altura-' + k] = (s.aSuAltura || []).indexOf(k) !== -1; });
    c[p + 'palabras'] = f.palabras; c[p + 'letras'] = f.letras; c[p + 'numeros'] = f.numeros; c[p + 'mayusculas'] = f.mayusculas;
    c[p + 'coma'] = f.coma; c[p + 'parentesis'] = f.parentesis; c[p + 'barra'] = f.barra; c[p + 'guion'] = f.guion; c[p + 'punto'] = f.punto;
    c[p + 'es-la-marca'] = f.marca; c[p + 'parece-periodo'] = f.periodo; c[p + 'parece-fecha'] = f.fecha; c[p + 'parece-documento'] = f.documento;
  });
  return { estado: 'dato', cifras: c };
}

/* ==== ComprobConsejo.gs ==== */
/* Las comprobaciones del Consejo Escolar (fila 22). Solo leen y solo cuentan: ni un nombre, ni una claveNombre, ni un sector, ni un cargo, ni el id de un registro sale de aquí. */

/* Las partes `periodo` y el `historial`, abiertas, y lo leído de cada listado. null si no hay ninguna parte. */
function cmpDatosConsejo_(ctx) {
  const h = (ctx.indice.hechos || []).filter(function (x) { return x.conjunto === 'consejo-escolar'; });
  if (!h.length) return null;
  const periodos = h.filter(function (x) { return x.parte === 'periodo'; }).map(function (x) { return { h: x, p: cmpAbrirParte_(ctx, x) }; });
  const hi = h.filter(function (x) { return x.parte === 'historial'; })[0];
  const leidos = Object.keys(ctx.avance.leidos).filter(function (k) { return k === 'consejo-escolar' || k.indexOf('consejo-escolar/') === 0; })
    .map(function (k) { return cargarLeido_(ctx.raiz, k); }).filter(function (l) { return !!l; });
  return { periodos: periodos, historial: hi ? cmpAbrirParte_(ctx, hi) : null, leidos: leidos };
}

function cmpAvisosDe_(partes, tipo) {
  return partes.reduce(function (n, p) { return n + (p ? p.obj.avisos.filter(function (a) { return a.tipo === tipo; }).length : 0); }, 0);
}

function cmpConsejoCruce_(ctx) {
  const d = cmpDatosConsejo_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { periodos: 0 } };
  const abiertas = d.periodos.map(function (x) { return x.p; }).filter(function (p) { return !!p; });
  const todas = abiertas.concat(d.historial ? [d.historial] : []);
  const usables = d.leidos.filter(function (l) { return !l.problema && periodoValidoConsejo_(l.variante); });
  const reg = d.historial ? d.historial.obj.registros : [];
  const personas = {}, desconocidos = {};
  reg.forEach(function (r) { if (r.datos.claveNombre) personas[r.datos.claveNombre] = true; });
  let buscados = 0, unidos = 0;
  abiertas.forEach(function (p) {
    p.obj.registros.forEach(function (r) {
      const b = buscaSectorConsejo_(r.datos.sector || '');
      if (!b.conocido) desconocidos[sinTildesConsejo_(r.datos.sector || '')] = true;
      if (b.donde) { buscados++; if (r.datos.fichaConjunto) unidos++; }
    });
  });
  const sinFicha = cmpAvisosDe_(abiertas, 'consejo-sin-ficha'), dudosos = cmpAvisosDe_(abiertas, 'consejo-ficha-dudosa');
  return { estado: 'dato', cifras: { periodos: abiertas.length, 'listados-leidos': d.leidos.length, 'listados-sin-usar': d.leidos.length - usables.length,
    filas: usables.reduce(function (n, l) { return n + l.filas.length; }, 0), nombramientos: reg.length, personas: Object.keys(personas).length,
    natos: reg.filter(function (r) { return r.datos.nato; }).length, 'miembros-hoy': reg.filter(function (r) { return r.datos.miembroHoy; }).length,
    'unidos-al-personal': reg.filter(function (r) { return r.datos.fichaConjunto === 'personal'; }).length,
    'unidos-al-alumnado': reg.filter(function (r) { return r.datos.fichaConjunto === 'alumnado'; }).length,
    'sin-ficha': sinFicha, dudosos: dudosos, 'sin-donde-mirar': Math.max(0, buscados - unidos - sinFicha - dudosos),
    'sectores-que-la-tabla-no-conoce': Object.keys(desconocidos).length, 'ceses-distintos': cmpAvisosDe_(todas, 'consejo-ceses-distintos'),
    'fuera-de-periodo': cmpAvisosDe_(todas, 'consejo-fuera-de-periodo') } };
}

/* Cada fila con miembro de cada listado está en un solo registro de su parte `periodo`, y cada registro de cada parte `periodo` está en un solo registro del historial que nombra ese periodo. */
function cmpConsejoUnaFicha_(ctx) {
  const d = cmpDatosConsejo_(ctx);
  if (!d || !d.periodos.length) return { estado: 'sin datos', cifras: { periodos: 0 } };
  let malos = 0, filas = 0, enRegistros = 0, sinHistorial = 0;
  const delHistorial = {};
  if (d.historial) d.historial.obj.registros.forEach(function (r) { delHistorial[r.id] = (delHistorial[r.id] || []).concat([r.datos.periodos || []]); });
  d.periodos.forEach(function (x) {
    if (!x.p) { malos++; return; }
    const l = d.leidos.filter(function (y) { return y.variante === x.h.periodo; })[0];
    const ids = {};
    x.p.obj.registros.forEach(function (r) {
      ids[r.id] = (ids[r.id] || 0) + 1;
      const en = delHistorial[r.id];
      if (!en || en.length !== 1 || en[0].indexOf(x.h.periodo) === -1) sinHistorial++;
    });
    enRegistros += x.p.obj.registros.length;
    let mal = Object.keys(ids).some(function (i) { return ids[i] !== 1; });
    if (l && !l.problema) {
      const delFichero = {};
      l.filas.forEach(function (f) { delFichero[registroDeConsejo_(l.orden, f, l.columnas).id] = true; });
      filas += l.filas.length;
      if (Object.keys(delFichero).length !== x.p.obj.registros.length || Object.keys(delFichero).some(function (i) { return !ids[i]; })) mal = true;
    } else if (x.p.obj.registros.length) mal = true;
    if (mal) malos++;
  });
  return { estado: malos || sinHistorial ? 'mal' : 'bien', cifras: { periodos: d.periodos.length, filas: filas, 'en-registros': enRegistros, 'periodos-que-no-cuadran': malos, 'registros-mal-en-el-historial': sinHistorial } };
}

/* `miembroHoy` y `ultimoPeriodo` del historial son lo que dan el último periodo y las fechas el día en que se comprueba. */
function cmpConsejoHoy_(ctx) {
  const d = cmpDatosConsejo_(ctx);
  if (!d || !d.historial) return { estado: 'sin datos', cifras: { nombramientos: 0 } };
  const o = d.historial.obj, hoy = hoyMadrid_();
  const periodos = d.periodos.map(function (x) { return x.h.periodo; }).sort();
  const ultimo = periodos[periodos.length - 1] || '';
  let malos = 0;
  o.registros.forEach(function (r) { if (r.datos.miembroHoy !== miembroHoyConsejo_(r.datos, r.datos.periodos || [], ultimo, hoy)) malos++; });
  const raro = o.ultimoPeriodo !== ultimo;
  return { estado: malos || raro ? 'mal' : 'bien', cifras: { nombramientos: o.registros.length, 'que-no-cuadran': malos, 'ultimo-periodo-distinto': raro } };
}

/* ==== ComprobEnteros.gs ==== */
/* Las comprobaciones de los conjuntos entregados enteros (fila 23). Solo leen y solo cuentan: ni una razón social, ni un NIF, ni el id de un registro sale de aquí.
   Las dos funciones de `cmpEntero…_` valen para cualquier conjunto con `entregadoPor`; las del catálogo son una línea por conjunto. */

/* La entrega vigente, lo leído de ella y la parte `todas` abierta de un conjunto. null si no hay ni entrega ni parte. */
function cmpDatosEntero_(ctx, conjunto) {
  const conj = CONJUNTOS_.filter(function (c) { return c.conjunto === conjunto; })[0];
  const h = (ctx.indice.hechos || []).filter(function (x) { return x.conjunto === conjunto; })[0] || null;
  const ent = fuentesDeEntero_(ctx.indice, conj)[0] || null;
  if (!ent && !h) return null;
  return { conj: conj, h: h, parte: h ? cmpAbrirParte_(ctx, h) : null, ent: ent, leido: ent ? cargarLeido_(ctx.raiz, ent.k) : null };
}

function cmpAvisosEntero_(p, conj, tipo) { return p ? p.obj.avisos.filter(function (a) { return a.tipo === conj.conjunto + '-' + tipo; }).length : 0; }

function cmpEnteroCruce_(ctx, conjunto) {
  const d = cmpDatosEntero_(ctx, conjunto);
  if (!d || !d.ent || !d.leido || !d.leido.entrega) return { estado: 'sin datos', cifras: { 'registros-de-la-entrega': 0 } };
  const m = montarEntero_(d.conj, d.leido), c = m.cuentas;
  const r = { estado: 'dato', datos: d, cifras: { 'registros-de-la-entrega': (d.leido.entrega.registros || []).length, 'registros-de-la-parte': d.parte ? d.parte.obj.registros.length : 0,
    'sin-id': cmpAvisosEntero_(d.parte, d.conj, 'sin-id'), repetidos: cmpAvisosEntero_(d.parte, d.conj, 'id-repetido'), 'campos-aceptados': c.camposAceptados, 'campos-ignorados': c.camposIgnorados,
    'valores-ignorados': c.valoresIgnorados, 'dias-desde-la-entrega': Math.max(0, Math.floor((ctx.ahoraMs - new Date(d.ent.entrada.subido).getTime()) / 86400000)) } };
  const regs = d.parte ? d.parte.obj.registros : [];
  /* Lo que el registro del conjunto pide además: la cuenta de cada trozo del desglose, los datos repetidos y, de cada campo de tipo tabla, cuántos registros lo traen y cuántas filas suman. */
  const desglose = desgloseDeEntero_(d.conj, regs);
  if (desglose) Object.keys(desglose).forEach(function (k) { r.cifras['desglose-' + k] = desglose[k]; });
  if (d.conj.unicos) r.cifras['datos-repetidos'] = cmpAvisosEntero_(d.parte, d.conj, 'dato-repetido');
  (d.parte ? d.parte.obj.campos : []).filter(function (cp) { return cp.tipo === 'tabla'; }).forEach(function (cp) {
    const nombre = cp.clave.replace(/([A-Z])/g, '-$1').toLowerCase();
    const con = regs.filter(function (x) { return Array.isArray(x.datos[cp.clave]); });
    r.cifras[nombre + '-registros'] = con.length;
    r.cifras[nombre + '-filas'] = con.reduce(function (n, x) { return n + x.datos[cp.clave].length; }, 0);
  });
  return r;
}

/* En la parte no hay dos registros con el mismo id; cada registro de la entrega está en la parte o en un aviso (sin id o repetido), y en uno solo; y la huella de la fuente de la parte es la de la entrega vigente. */
function cmpEnteroUnaFicha_(ctx, conjunto) {
  const d = cmpDatosEntero_(ctx, conjunto);
  if (!d || !d.ent || !d.leido || !d.leido.entrega) return { estado: 'sin datos', cifras: { 'registros-de-la-entrega': 0 } };
  if (!d.parte) return { estado: 'mal', cifras: { 'registros-de-la-entrega': (d.leido.entrega.registros || []).length, 'parte-que-falta': true } };
  const regs = d.parte.obj.registros, vistos = {};
  let repetidosEnParte = 0;
  regs.forEach(function (r) { if (vistos[r.id]) repetidosEnParte++; vistos[r.id] = true; });
  const sueltos = cmpAvisosEntero_(d.parte, d.conj, 'sin-id'), repetidos = cmpAvisosEntero_(d.parte, d.conj, 'id-repetido');
  const enAviso = d.parte.obj.avisos.filter(function (a) { return a.tipo === d.conj.conjunto + '-id-repetido'; });
  const repetidoSinEntrar = enAviso.filter(function (a) { return !vistos[a.id]; }).length;
  const entregados = (d.leido.entrega.registros || []).length;
  const noCuadra = entregados === regs.length + sueltos + repetidos ? 0 : 1;
  const fuente = (d.h.fuentes || [])[0];
  const huellaMala = d.h.alDia && (!fuente || fuente.huella !== d.ent.entrada.huella) ? 1 : 0;
  return { estado: repetidosEnParte + repetidoSinEntrar + noCuadra + huellaMala ? 'mal' : 'bien', cifras: { 'registros-de-la-entrega': entregados, 'registros-de-la-parte': regs.length,
    'repetidos-en-la-parte': repetidosEnParte, 'cuenta-que-no-cuadra': !!noCuadra, 'huella-distinta': !!huellaMala } };
}

function cmpEmpresasCruce_(ctx) {
  const r = cmpEnteroCruce_(ctx, 'empresas');
  if (r.datos) {
    r.cifras['sin-nif'] = (r.datos.parte ? r.datos.parte.obj.registros : []).filter(function (x) { return /^sin-nif-/.test(x.id); }).length;
    delete r.datos;
  }
  return r;
}

function cmpEmpresasUnaFicha_(ctx) { return cmpEnteroUnaFicha_(ctx, 'empresas'); }

function cmpAdministracionesCruce_(ctx) {
  const r = cmpEnteroCruce_(ctx, 'administraciones');
  delete r.datos;
  return r;
}

function cmpAdministracionesUnaFicha_(ctx) { return cmpEnteroUnaFicha_(ctx, 'administraciones'); }

/* ==== ComprobCargos.gs ==== */
/* Las comprobaciones de los cargos (fila 25). Solo leen y solo cuentan: ni un nombre, ni una claveNombre, ni un fichaId, ni el id de un registro, ni el nombre de un cargo sale de aquí. */

function cmpCargosCruce_(ctx) {
  const r = cmpEnteroCruce_(ctx, 'cargos');
  if (!r.datos) return r;
  const regs = r.datos.parte ? r.datos.parte.obj.registros : [], p = r.datos.parte;
  const personas = regs.filter(function (x) { return typeof x.datos.persona === 'string'; });
  const porCargo = {}, todos = {};
  regs.forEach(function (x) { if (x.datos.cargo !== undefined) todos[x.datos.cargo] = true; });
  personas.forEach(function (x) { if (x.datos.ocupaHoy) porCargo[x.datos.cargo] = (porCargo[x.datos.cargo] || 0) + 1; });
  const conOcupante = {};
  personas.forEach(function (x) { conOcupante[x.datos.cargo] = true; });
  const unidos = personas.filter(function (x) { return x.datos.fichaConjunto === 'personal'; }).length;
  const sinFicha = cmpAvisosEntero_(p, r.datos.conj, 'sin-ficha'), dudosos = cmpAvisosEntero_(p, r.datos.conj, 'ficha-dudosa');
  const fechas = function (d) { return p ? p.obj.avisos.filter(function (a) { return a.tipo === 'cargos-fechas' && a.datos.detalle === d; }).length : 0; };
  Object.assign(r.cifras, { cargos: Object.keys(todos).length, 'cargos-sin-ocupante': Object.keys(todos).filter(function (k) { return !conOcupante[k]; }).length, ocupantes: personas.length,
    'ocupantes-sin-inicio': personas.filter(function (x) { return !x.datos.desde; }).length, 'ocupan-hoy': personas.filter(function (x) { return x.datos.ocupaHoy; }).length,
    'cargos-ocupados-hoy': Object.keys(porCargo).length, 'cargos-con-mas-de-uno-hoy': Object.keys(porCargo).filter(function (k) { return porCargo[k] > 1; }).length,
    'unidos-al-personal': unidos, 'sin-ficha': sinFicha, dudosos: dudosos, 'sin-donde-mirar': Math.max(0, personas.length - unidos - sinFicha - dudosos),
    'fechas-al-reves': fechas('al-reves'), 'parejas-que-se-pisan': fechas('se-pisan') });
  delete r.datos;
  return r;
}

function cmpCargosUnaFicha_(ctx) { return cmpEnteroUnaFicha_(ctx, 'cargos'); }

/* `ocupaHoy` es lo que dan las fechas el día en que se comprueba, y cada `fichaId` está en alguna parte del personal. */
function cmpCargosHoy_(ctx) {
  const d = cmpDatosEntero_(ctx, 'cargos');
  if (!d || !d.parte) return { estado: 'sin datos', cifras: { ocupantes: 0 } };
  const hoy = hoyMadrid_(), ids = {};
  (ctx.indice.hechos || []).filter(function (h) { return h.conjunto === 'personal'; }).forEach(function (h) {
    const p = cmpAbrirParte_(ctx, h);
    if (p) p.obj.registros.forEach(function (r) { ids[r.id] = true; });
  });
  let malos = 0, sinFicha = 0, ocupantes = 0;
  d.parte.obj.registros.forEach(function (r) {
    if (typeof r.datos.persona !== 'string') return;
    ocupantes++;
    if (r.datos.ocupaHoy !== ocupaElCargo_(r.datos, hoy)) malos++;
    if (r.datos.fichaId !== undefined && !ids[r.datos.fichaId]) sinFicha++;
  });
  return { estado: malos || sinFicha ? 'mal' : 'bien', cifras: { ocupantes: ocupantes, 'que-no-cuadran': malos, 'fichas-que-no-estan': sinFicha } };
}

/* ==== ComprobContactos.gs ==== */
/* Las comprobaciones de los contactos del profesorado (fila 98). Solo leen y solo cuentan: ni un correo, ni un móvil, ni un nombre, ni un id sale de aquí. */

/* La parte `todos` de los contactos, la parte del personal del curso de hoy y lo escrito a mano. null si aún no hay parte. */
function cmpDatosContactos_(ctx) {
  const h = (ctx.indice.hechos || []).filter(function (x) { return x.conjunto === 'contactos'; })[0] || null;
  if (!h) return null;
  const hp = parteVecinaTutorias_(ctx.indice, 'personal', cursoActual_(), 'curso');
  return { h: h, parte: cmpAbrirParte_(ctx, h), personal: hp ? cmpAbrirParte_(ctx, hp) : null, aMano: contactosAMano_(ctx.raiz) };
}

function cmpContactosCruce_(ctx) {
  const d = cmpDatosContactos_(ctx);
  if (!d || !d.parte) return { estado: 'sin datos', cifras: { registros: 0 } };
  const regs = d.parte.obj.registros, delPersonal = {};
  (d.personal ? d.personal.obj.registros : []).forEach(function (r) { delPersonal[r.id] = r; });
  const con = function (c) { return regs.filter(function (r) { return r.datos[c] !== undefined; }).length; };
  const aMano = function (c) { return regs.filter(function (r) { return r.datos.origen && r.datos.origen[c] && r.datos.origen[c].de === 'a-mano'; }).length; };
  const cifras = {
    'docentes-del-personal': d.personal ? d.personal.obj.registros.filter(function (r) { return r.datos.tipoPersonal !== 'no-docente'; }).length : 0, registros: regs.length,
    'sin-ficha-en-el-personal': regs.filter(function (r) { return !delPersonal[r.id]; }).length, 'personas-con-algo-a-mano': Object.keys(d.aMano.personas).length,
    'cambios-ignorados': d.aMano.ignoradosTotal, 'veces-que-se-ha-escrito': d.aMano.version
  };
  CAMPOS_DE_CONTACTO_.forEach(function (c) {
    const n = c.replace(/([A-Z])/g, '-$1').toLowerCase();
    cifras['con-' + n] = con(c); cifras[n + '-a-mano'] = aMano(c);
  });
  return { estado: 'dato', cifras: cifras };
}

/* Ningún id repetido; todo docente del personal de hoy tiene su registro; cada dato tiene la forma de las reglas y su `origen`; y, si la parte está al día, su fuente es la huella de los listados de ahora. */
function cmpContactosUnaFicha_(ctx) {
  const d = cmpDatosContactos_(ctx);
  if (!d || !d.parte) return { estado: 'sin datos', cifras: { registros: 0 } };
  const regs = d.parte.obj.registros, vistos = {};
  let repetidos = 0, sinRegistro = 0, formaMala = 0, sinOrigen = 0, huellaDistinta = 0;
  regs.forEach(function (r) {
    if (vistos[r.id]) repetidos++;
    vistos[r.id] = true;
    CAMPOS_DE_CONTACTO_.forEach(function (c) {
      const v = r.datos[c], o = r.datos.origen || {};
      if (v === undefined) { if (o[c] && o[c].de === 'a-mano') sinOrigen++; return; }
      if (!validarContacto_(c, v).ok || validarContacto_(c, v).valor !== v) formaMala++;
      if (!o[c] || (o[c].de !== 'a-mano' && o[c].de !== 'seneca')) sinOrigen++;
    });
  });
  (d.personal ? d.personal.obj.registros : []).forEach(function (r) { if (r.datos.tipoPersonal !== 'no-docente' && !vistos[r.id]) sinRegistro++; });
  if (d.h.alDia) {
    const ahora = fuentesDeContactos_(ctx.indice).map(function (x) { return x.entrada.variante + ':' + x.entrada.huella; }).sort().join('|');
    const suyas = (d.h.fuentes || []).map(function (f) { return f.variante + ':' + f.huella; }).sort().join('|');
    if (ahora !== suyas) huellaDistinta = 1;
  }
  return { estado: repetidos + sinRegistro + formaMala + sinOrigen + huellaDistinta ? 'mal' : 'bien', cifras: { registros: regs.length, repetidos: repetidos, 'docentes-sin-registro': sinRegistro,
    'datos-con-forma-mala': formaMala, 'datos-sin-origen': sinOrigen, 'huella-distinta': !!huellaDistinta } };
}

/* ==== ComprobFicha.gs ==== */
/* Las dos comprobaciones de la fila 26: la ficha del alumno de aquí contra ALUMNADO-BD.json, el fichero que genera BD Alumnado (referencia/bd-alumnado/FichaComparar.gs y FichaCentro.gs).
   Solo leen y solo cuentan: ni un valor, ni un nombre, ni un número de identificación sale de aquí; solo cuentas y nombres de clave de una lista cerrada del programa (ORDEN_FICHA_ y las dos listas de abajo).
   Sus diferencias son un `dato`, nunca un `mal`: las trabaja la regla 2 ter de docs/COLA.md. */

/* Las 44 claves de ALUMNADO-BD.json que son del Centro de datos, y las 14 en bruto que BD Alumnado necesita además (FichaCentro.gs). */
const CMPF_CLAVES_CENTRO_ = ['apellido1', 'apellido2', 'nombre', 'alumno', 'sexo', 'fechaNacimiento', 'documento', 'localidadNacimiento', 'nacionalidad',
  'curso', 'unidad', 'ensenanza', 'estadoMatricula', 'edad', 'materias', 'modalidad', 'pendientes', 'numPendientes',
  'telefono', 'telefonoPersonal', 'telefonoUrgencia', 'correo', 'domicilio', 'codigoPostal', 'localidad', 'provincia', 'tutores', 'trayectoria',
  'cursoAnterior', 'repiteCurso', 'repeticionesEso', 'cursosRepetidosEso', 'fuenteEso', 'repeticionesPrimaria', 'cursosRepetidosPrimaria', 'fuentePrimaria',
  'primariaAnoPrimero', 'primariaAnoSexto', 'primariaPendientes', 'primariaArrastradas', 'primariaRepeticiones', 'secundariaAnos', 'centrosSecundaria', 'centroProcedencia'];
const CMPF_CLAVES_BRUTO_ = ['matriculaNivel', 'matriculaCeldas', 'repetiaAnteriorBruto', 'primariaExpediente', 'primariaCompleto', 'primariaCentro', 'secundariaExpediente',
  'secundariaSuspensosAnterior', 'secundariaTrayectoria', 'secundariaNotas', 'censoNeae', 'censoNecesidades', 'censoMedidas', 'censoLocalizado'];
const CMPF_HUELLAS_ = ['ficha-igual-que-bd', 'ficha-igual-claves'];

/*** ---------------- Igualar un valor antes de compararlo: las mismas reglas que BD Alumnado ---------------- */

function cmpfQuitarTildes_(t) { try { return t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { return t; } }

function cmpfVacio_(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') { const t = v.trim(); return t === '' || t === '?'; }
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

/* Una casilla suelta: sin espacios de más, «?» es vacío y un número escrito como texto es un número. Con `plegar`, sin mayúsculas ni tildes (solo para contar «m-»). */
function cmpfCasilla_(v, plegar) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return isFinite(v) ? String(v) : '';
  let t = String(v).replace(/\s+/g, ' ').trim();
  if (t === '?') return '';
  if (/^-?\d+([.,]\d+)?$/.test(t)) t = String(Number(t.replace(',', '.')));
  return plegar ? cmpfQuitarTildes_(t).toLowerCase() : t;
}

function cmpfFecha_(v) {
  const t = String(v).trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : cmpfCasilla_(v, false);
}

function cmpfSiNo_(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const t = cmpfQuitarTildes_(String(v).trim()).toLowerCase();
  if (t === 'si' || t === 'true' || t === '1') return 'true';
  if (t === 'no' || t === 'false' || t === '0') return 'false';
  return cmpfCasilla_(v, false);
}

/* La forma canónica de un valor según su tipo ('' si está vacío). Listas y tablas: sin mirar el orden. */
function cmpfCanon_(v, tipo, plegar) {
  if (cmpfVacio_(v)) return '';
  if (tipo === 'si-no') return cmpfSiNo_(v);
  if (tipo === 'fecha') return cmpfFecha_(v);
  if (tipo === 'numero') { const n = Number(String(v).replace(',', '.')); return isFinite(n) && String(v).trim() !== '' ? String(n) : cmpfCasilla_(v, plegar); }
  if (Array.isArray(v)) {
    const partes = v.map(function (x) { return cmpfCanonCelda_(x, plegar); }).filter(function (x) { return x !== ''; }).sort();
    return partes.length ? JSON.stringify(partes) : '';
  }
  if (typeof v === 'object') return cmpfCanonCelda_(v, plegar);
  return cmpfCasilla_(v, plegar);
}

function cmpfCanonCelda_(x, plegar) {
  if (x !== null && typeof x === 'object' && !Array.isArray(x)) {
    const o = {};
    Object.keys(x).sort().forEach(function (k) { const c = cmpfCanonCelda_(x[k], plegar); if (c !== '') o[k] = c; });
    return Object.keys(o).length ? JSON.stringify(o) : '';
  }
  if (Array.isArray(x)) return cmpfCanon_(x, '', plegar);
  return cmpfCasilla_(x, plegar);
}

/* Cuántas filas tiene una lista o una tabla ya en forma canónica. */
function cmpfFilas_(canon) { try { const a = JSON.parse(canon); return Array.isArray(a) ? a.length : 1; } catch (e) { return 1; } }

/*** ---------------- Cuándo hay que repetirlas ---------------- */

/* Las huellas de lo que se compara: el fichero de BD Alumnado y todas las partes del alumnado. Si cambia cualquiera, las dos comprobaciones quedan debidas (esDebida_). */
function cmpHuellasFicha_(indice) {
  const bd = buscarEnIndice_(indice, 'alumnado-bd', '');
  const partes = (indice.hechos || []).filter(function (h) { return h.conjunto === 'alumnado'; }).map(function (h) { return h.ruta + ':' + h.huella; }).sort();
  return (bd ? bd.huella : '-') + '|' + partes.join(',');
}

/*** ---------------- Lo que se compara ---------------- */

/* El fichero de BD Alumnado y la parte `actuales` de su curso, abiertos una sola vez por pasada. { sin: true } si no hay nada que comparar (no hay fichero, ya lo genera el Centro de datos o no hay parte de ese curso). */
function cmpFichaLeer_(ctx) {
  if (ctx.cache['ficha-bd'] !== undefined) return ctx.cache['ficha-bd'];
  let r = { sin: true };
  const e = buscarEnIndice_(ctx.indice, 'alumnado-bd', '');
  if (e && e.subidoPor !== DUENO_CD_ && !ctx.avance.relevo) {
    let bd = null;
    try { bd = JSON.parse(bytesATexto_(ficheroDeEntrada_(e).getBlob().getBytes())); } catch (x) { bd = null; }
    if (bd && Array.isArray(bd.alumnos)) {
      const curso = parDeCursos_(parseInt(String(bd.cursoAcademico), 10));
      const h = (ctx.indice.hechos || []).filter(function (x) { return x.conjunto === 'alumnado' && x.parte === 'actuales' && x.cursoEscolar === curso; })[0];
      const p = h ? cmpAbrirParte_(ctx, h) : null;
      if (p) r = { bd: bd, h: h, p: p.obj };
    }
  }
  ctx.cache['ficha-bd'] = r;
  return r;
}

function cmpfIgualHuella_(lasDeBD, f) {
  return lasDeBD.some(function (x) { return x.clave === f.clave && String(x.variante || '') === String(f.variante || '') && x.huella && String(x.huella).toLowerCase() === String(f.huella).toLowerCase(); });
}

/* Todas las cuentas, calculadas una vez por pasada y compartidas por las dos comprobaciones. */
function cmpFichaCuentas_(ctx) {
  if (ctx.cache['ficha-cuentas'] !== undefined) return ctx.cache['ficha-cuentas'];
  const d = cmpFichaLeer_(ctx);
  if (d.sin) { ctx.cache['ficha-cuentas'] = d; return d; }
  const bd = d.bd, p = d.p, h = d.h;
  const R = { sin: false, curso: h.cursoEscolar };
  /* Con qué ficheros se hizo cada lado. */
  const lasDeBD = (Array.isArray(bd.fuentes) ? bd.fuentes : []).filter(function (x) { return x && typeof x === 'object'; });
  R.sabidas = Array.isArray(bd.fuentes);
  const propias = (h.fuentes || []);
  const principales = propias.filter(function (f) { return f.clave === 'alumnado' || f.clave === 'matricula'; });
  R.fuentes = principales.length;
  R.fuentesIguales = R.sabidas ? principales.filter(function (f) { return cmpfIgualHuella_(lasDeBD, f); }).length : 0;
  R.fuentesDistintas = R.fuentes - R.fuentesIguales;
  const censos = propias.filter(function (f) { return f.clave === 'censo-neae'; });
  R.censoIgual = R.sabidas && (censos.length ? censos.every(function (f) { return cmpfIgualHuella_(lasDeBD, f); }) : !lasDeBD.some(function (x) { return x.clave === 'censo-neae'; }));
  R.expedientesAqui = ctx.indice.listados.filter(function (e) { return e.porAlumno && (e.clave === 'expediente-primaria' || e.clave === 'expediente-secundaria'); })
    .reduce(function (n, e) { return n + (e.alumnos || 0); }, 0);
  R.expedientesAlli = lasDeBD.filter(function (x) { return /^expediente-/.test(String(x.clave)); }).reduce(function (n, x) { return n + (Number(x.ficheros) || 0); }, 0);
  R.alDia = h.alDia === true;
  R.comparable = R.sabidas && R.fuentesDistintas === 0 && R.alDia;
  /* Quién está en cada lado. */
  const enBD = {};
  bd.alumnos.forEach(function (a) {
    if (a && typeof a === 'object' && a.idEscolar !== undefined && a.idEscolar !== null && String(a.idEscolar).trim()) {
      enBD[String(a.idEscolar).trim()] = { matriculado: a.matriculado === true, datos: a.datos && typeof a.datos === 'object' ? a.datos : {} };
    }
  });
  const enFicha = {};
  p.registros.forEach(function (r) { enFicha[r.id] = r; });
  const idsFicha = Object.keys(enFicha), idsBD = Object.keys(enBD);
  R.alumnosFicha = idsFicha.length; R.alumnosBD = idsBD.length;
  R.soloEnFicha = idsFicha.filter(function (id) { return !enBD[id]; }).length;
  let sinParte = idsBD.filter(function (id) { return !enFicha[id]; });
  if (sinParte.length) {
    (ctx.indice.hechos || []).filter(function (x) { return x.conjunto === 'alumnado' && x !== h; }).forEach(function (x) {
      if (!sinParte.length) return;
      const o = cmpAbrirParte_(ctx, x);
      if (!o) return;
      const estan = {};
      o.obj.registros.forEach(function (r) { estan[r.id] = true; });
      sinParte = sinParte.filter(function (id) { return !estan[id]; });
    });
  }
  R.soloEnBD = sinParte.length;
  R.comunes = idsFicha.length - R.soloEnFicha;
  /* Las claves. */
  const camposDeLaParte = {};
  p.campos.forEach(function (c) { camposDeLaParte[c.clave] = c; });
  const necesarias = CMPF_CLAVES_CENTRO_.concat(CMPF_CLAVES_BRUTO_);
  R.clavesQueFaltan = necesarias.filter(function (k) { return !camposDeLaParte[k]; });
  const comparadas = ORDEN_FICHA_.filter(function (k) { return camposDeLaParte[k] && camposDeLaParte[k].dueno === DUENO_CD_; });
  comparadas.push('matriculado');
  R.comparadas = comparadas.length;
  R.porClave = {};
  const conDif = {}, niveles = {};
  const nivelesBuenos = NIVELES_.map(function (n) { return n.valor; });
  comparadas.forEach(function (k) {
    const tipo = k === 'matriculado' ? 'si-no' : camposDeLaParte[k].tipo;
    const c = { d: 0, f: 0, s: 0, m: 0, nMas: 0, nMenos: 0, lMas: 0, lMenos: 0 };
    idsFicha.forEach(function (id) {
      const b = enBD[id];
      if (!b) return;
      const a = enFicha[id];
      const va = k === 'matriculado' ? a.matriculado : a.datos[k], vb = k === 'matriculado' ? b.matriculado : b.datos[k];
      const ca = cmpfCanon_(va, tipo, false), cb = cmpfCanon_(vb, tipo, false);
      if (ca === cb) return;
      c.d++;
      conDif[id] = true;
      if (ca === '') c.f++; else if (cb === '') c.s++;
      if (cmpfCanon_(va, tipo, true) === cmpfCanon_(vb, tipo, true)) c.m++;
      if (ca !== '' && cb !== '') {
        if (tipo === 'numero' && isFinite(Number(ca)) && isFinite(Number(cb))) { if (Number(ca) > Number(cb)) c.nMas++; else c.nMenos++; }
        if ((tipo === 'lista' || tipo === 'tabla') && cmpfFilas_(ca) !== cmpfFilas_(cb)) { if (cmpfFilas_(ca) > cmpfFilas_(cb)) c.lMas++; else c.lMenos++; }
      }
    });
    R.porClave[k] = c;
  });
  R.conDiferencias = comparadas.filter(function (k) { return R.porClave[k].d > 0; }).length;
  R.alumnosConDiferencias = Object.keys(conDif).length;
  Object.keys(conDif).forEach(function (id) {
    const n = enFicha[id].datos.matriculaNivel;
    if (nivelesBuenos.indexOf(n) !== -1) niveles[n] = (niveles[n] || 0) + 1;
  });
  R.niveles = niveles;
  ctx.cache['ficha-cuentas'] = R;
  return R;
}

function cmpFichaSinDatos_() { return { estado: 'sin datos', cifras: { 'hay-fichero': false } }; }

/* El resumen: cuántas claves y cuántos alumnos difieren. */
function cmpFichaIgualQueBd_(ctx) {
  const R = cmpFichaCuentas_(ctx);
  const huellas = cmpHuellasFicha_(ctx.indice);
  if (R.sin) { const s = cmpFichaSinDatos_(); s.huellas = huellas; return s; }
  const cifras = { curso: R.curso, 'fuentes-sabidas': R.sabidas, fuentes: R.fuentes, 'fuentes-iguales': R.fuentesIguales, 'fuentes-distintas': R.fuentesDistintas, 'censo-igual': R.censoIgual,
    'expedientes-aqui': R.expedientesAqui, 'parte-al-dia': R.alDia, comparable: R.comparable, 'alumnos-ficha': R.alumnosFicha, 'alumnos-bd': R.alumnosBD, comunes: R.comunes,
    'solo-en-ficha': R.soloEnFicha, 'solo-en-bd': R.soloEnBD, 'claves-que-faltan': R.clavesQueFaltan.length, 'claves-comparadas': R.comparadas, 'claves-iguales': R.comparadas - R.conDiferencias,
    'claves-con-diferencias': R.conDiferencias, 'alumnos-con-diferencias': R.alumnosConDiferencias };
  if (R.sabidas) cifras['expedientes-alli'] = R.expedientesAlli;
  Object.keys(R.niveles).forEach(function (n) { cifras['nivel-' + n] = R.niveles[n]; });
  return { estado: 'dato', cifras: cifras, huellas: huellas };
}

/* El detalle, clave a clave: solo las cifras que no son cero. */
function cmpFichaIgualClaves_(ctx) {
  const R = cmpFichaCuentas_(ctx);
  const huellas = cmpHuellasFicha_(ctx.indice);
  if (R.sin) { const s = cmpFichaSinDatos_(); s.huellas = huellas; return s; }
  const cifras = {};
  const poner = function (prefijo, k, n) { if (n) cifras[prefijo + k.toLowerCase()] = n; };
  Object.keys(R.porClave).forEach(function (k) {
    const c = R.porClave[k];
    poner('d-', k, c.d); poner('f-', k, c.f); poner('s-', k, c.s); poner('m-', k, c.m);
    poner('num-mas-', k, c.nMas); poner('num-menos-', k, c.nMenos); poner('lista-mas-', k, c.lMas); poner('lista-menos-', k, c.lMenos);
  });
  R.clavesQueFaltan.forEach(function (k) { poner('falta-', k, 1); });
  return { estado: 'dato', cifras: cifras, huellas: huellas };
}

/* ==== DiagnosticoCampos.gs ==== */
/* Diagnóstico sin nombres (fila 35). Aquí está lo único que puede salir en diagnostico/ultimo.json: la lista blanca de campos por conjunto y la regla de cada uno.
   Un campo que no esté aquí no sale nunca. Un campo nuevo no sale hasta que se añada aquí Y en docs/35-DIAGNOSTICO-SIN-NOMBRES.md.
   Reglas: cat = texto que solo sale si lo comparten al menos DIAG_MIN_ registros del conjunto (si no, «(pocos)»); grupo = nombre de grupo («1º A»), grupo5 = lo mismo pero con el mínimo de personas; num; sino; fecha (AAAA-MM-DD);
   hay = solo si tiene algo o no; periodo = «2024-2026»; cod = el código de una persona; ficha = el código de la ficha a la que se unió (según fichaConjunto); lista = lista de cat;
   tabla = lista de filas con una regla por columna. */
const DIAG_MIN_ = 5;
const DIAG_PREFIJOS_ = { alumnado: 'A-', personal: 'P-' };
const DIAG_REGLAS_ = {
  alumnado: { campos: { curso: 'cat', unidad: 'grupo5', ensenanza: 'cat', estadoMatricula: 'cat', modalidad: 'cat', matriculaNivel: 'cat', cursoAnterior: 'cat', repiteCurso: 'sino', repeticionesEso: 'num',
    cursosRepetidosEso: 'cat', fuenteEso: 'cat', repeticionesPrimaria: 'num', cursosRepetidosPrimaria: 'cat', fuentePrimaria: 'cat', repetiaAnteriorBruto: 'cat', repSinLocalizarBruto: 'num',
    primariaExpediente: 'sino', primariaCompleto: 'sino', primariaInicioNormal: 'sino', secundariaExpediente: 'sino', secundariaSuspensosAnterior: 'num', numPendientes: 'num', pendientes: 'lista',
    materias: { tabla: { materia: 'cat', situacion: 'cat' } }, trayectoria: { tabla: { ano: 'periodo', curso: 'cat', unidad: 'grupo5', estado: 'cat' } } } },
  personal: { campos: { tipoPersonal: 'cat', puesto: 'cat', especialidad: 'cat', fechaTomaPosesion: 'fecha', fechaCese: 'fecha', situacion: 'cat', listados: 'lista',
    puestos: { tabla: { listado: 'cat', puesto: 'cat', fechaTomaPosesion: 'fecha', fechaCese: 'fecha' } } } },
  libros: { campos: { nivel: 'cat', materia: 'cat', conLibro: 'sino', editorial: 'cat', anioImplantacion: 'num', importe: 'num', digital: 'sino', chequeLibro: 'sino', otroMaterial: 'sino' } },
  tutorias: { campos: { unidad: 'grupo', tutorHoyId: 'cod',
    tutores: { tabla: { id: 'cod', periodo: 'cat', desde: 'fecha', hasta: 'fecha', sustituto: 'hay', hoy: 'sino', enPersonal: 'sino' } } } },
  'consejo-escolar': { campos: { sector: 'cat', cargo: 'cat', nombramiento: 'fecha', cese: 'fecha', nato: 'sino', fichaConjunto: 'cat', fichaId: 'ficha', periodos: 'lista', miembroHoy: 'sino' } },
  cargos: { campos: { cargo: 'cat', orden: 'num', desde: 'fecha', hasta: 'fecha', ocupaHoy: 'sino', fichaConjunto: 'cat', fichaId: 'ficha', persona: 'hay' } }
};

/* Las entidades (empresas y administraciones) no son personas: de sus campos solo salen los que no son texto, más `clase` si la hay. Nunca el texto (puede llevar un autónomo o una persona de contacto). */
const DIAG_TIPOS_ENTIDAD_ = { numero: 'num', 'si-no': 'sino', fecha: 'fecha' };

function diagReglasDe_(conj, parte) {
  if (DIAG_REGLAS_[conj.conjunto]) return DIAG_REGLAS_[conj.conjunto].campos;
  const r = { clase: 'cat' };
  ((parte && parte.campos) || []).forEach(function (c) { if (DIAG_TIPOS_ENTIDAD_[c.tipo] && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(c.clave)) r[c.clave] = DIAG_TIPOS_ENTIDAD_[c.tipo]; });
  return r;
}

/* El código de una persona: prefijo + 8 caracteres de la huella SHA-256 de «sal|clave». Es la función que copia BD Alumnado (docs/35-DIAGNOSTICO-SIN-NOMBRES.md, apartado 4). */
function diagCod_(prefijo, sal, clave) {
  return prefijo + huella_(Utilities.newBlob(String(sal) + '|' + String(clave)).getBytes()).slice(0, 8);
}

/* La sal secreta de _interno/clave-diagnostico.json (nunca viaja). Si no existe la crea quien llegue primero. Devuelve { sal, existia }. */
function diagSal_(raiz) {
  const carpeta = subcarpetaPorRuta_(raiz, '_interno');
  const a = leerJson_(carpeta, 'clave-diagnostico.json');
  if (a && /^[0-9a-f]{64}$/.test(String(a.sal || ''))) return { sal: a.sal, existia: true };
  const sal = huella_(Utilities.newBlob(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + new Date().getTime()).getBytes());
  escribirJson_(carpeta, 'clave-diagnostico.json', { sal: sal, creada: ahoraMadrid_() });
  return { sal: sal, existia: false };
}

/* ==== DiagnosticoMontar.gs ==== */
/* Diagnóstico sin nombres (fila 35): de los datos ya hechos al fichero que sube la aplicación. Dos pasadas: la primera cuenta cuántas personas distintas (por id de registro) comparten cada texto (un texto que no comparten al menos
   DIAG_MIN_ sale como «(pocos)»); la segunda escribe solo lo que dice la lista blanca de DiagnosticoCampos.gs. Solo lee. */
const DIAG_PATRON_GRUPO_ = /^\d\s?º?\s?[A-Z]{1,5}(\s?-?\s?[A-Z]{1,5})?$/;
const DIAG_PATRON_PERIODO_ = /^\d{2,4}-\d{2,4}$/;
const DIAG_PATRON_FECHA_ = /^\d{4}-\d\d-\d\d$/;
const DIAG_SLUG_ = /^[A-Za-z0-9ºª\/ _-]{1,40}$/;
const DIAG_POCOS_ = '(pocos)';

function diagTexto_(v) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''; }

/* Una casilla ya limpia, o undefined si no sale. `ctx` = { fase: 'contar'|'emitir', cuentas, sal, conjunto }. `clave` identifica el campo para contar. */
function diagValor_(regla, v, clave, ctx, registro) {
  if (v === null || v === undefined) return undefined;
  if (regla === 'sino') return typeof v === 'boolean' ? v : undefined;
  if (regla === 'num') return typeof v === 'number' && isFinite(v) && Math.abs(v) < 100000 ? v : undefined;
  if (regla === 'fecha') return typeof v === 'string' && DIAG_PATRON_FECHA_.test(v) ? v : undefined;
  if (regla === 'periodo') return typeof v === 'string' && DIAG_PATRON_PERIODO_.test(v) ? v : undefined;
  if (regla === 'hay') return typeof v === 'string' ? diagTexto_(v) !== '' : (v === true);
  if (regla === 'cod') return typeof v === 'string' && v ? diagCod_('P-', ctx.sal, v) : undefined;
  if (regla === 'ficha') {
    if (typeof v !== 'string' || !v) return undefined;
    return diagCod_(DIAG_PREFIJOS_[registro.datos.fichaConjunto] || 'C-', ctx.sal, v);
  }
  if (regla === 'lista') {
    if (!Array.isArray(v)) return undefined;
    const sal = v.map(function (x) { return diagValor_('cat', x, clave, ctx, registro); }).filter(function (x) { return x !== undefined; });
    return ctx.fase === 'emitir' ? sal : undefined;
  }
  if (regla === 'cat' || regla === 'grupo5' || regla === 'grupo') {
    const t = diagTexto_(v);
    if (!t || t.length > 60 || t === '?') return undefined;
    if (regla !== 'cat' && !DIAG_PATRON_GRUPO_.test(t)) return DIAG_POCOS_;
    if (regla === 'grupo') return t;
    if (ctx.fase === 'contar') { const c = ctx.cuentas[clave] = ctx.cuentas[clave] || {}; (c[t] = c[t] || {})[String(registro && registro.id)] = true; return undefined; }
    return Object.keys((ctx.cuentas[clave] || {})[t] || {}).length >= DIAG_MIN_ ? t : DIAG_POCOS_;
  }
  if (regla && regla.tabla) {
    if (!Array.isArray(v)) return undefined;
    const filas = [];
    v.forEach(function (f) {
      if (!f || typeof f !== 'object') return;
      const o = {};
      Object.keys(regla.tabla).forEach(function (k) {
        const x = diagValor_(regla.tabla[k], f[k], clave + '.' + k, ctx, registro);
        if (x !== undefined) o[k] = x;
      });
      if (Object.keys(o).length) filas.push(o);
    });
    return ctx.fase === 'emitir' ? filas : undefined;
  }
  return undefined;
}

/* El código de un registro: el de su persona (alumnado, personal), el de su ficha si se unió a una, o uno propio a partir de su id. */
function diagCodDe_(conj, r, sal) {
  const p = DIAG_PREFIJOS_[conj.conjunto];
  if (p) return diagCod_(p, sal, r.id);
  const d = r.datos || {};
  if (d.fichaId && DIAG_PREFIJOS_[d.fichaConjunto]) return diagCod_(DIAG_PREFIJOS_[d.fichaConjunto], sal, d.fichaId);
  if (conj.conjunto === 'tutorias') return '';
  return diagCod_(conj.entregadoPor && !conj.pasoPropio ? 'E-' : 'C-', sal, r.id);
}

function diagRegistro_(conj, r, reglas, ctx) {
  const o = {};
  const cod = diagCodDe_(conj, r, ctx.sal);
  if (cod) o.cod = cod; else if (typeof r.id === 'string' && DIAG_PATRON_GRUPO_.test(r.id)) o.grupo = r.id;
  if (typeof r.matriculado === 'boolean') o.matriculado = r.matriculado;
  const d = r.datos || {};
  const conocidas = {};
  conj.campos.concat(conj.camposPropios || []).forEach(function (c) { conocidas[c.clave] = true; });
  o.claves = Object.keys(d).filter(function (k) { return /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(k) && (conocidas[k] || !conj.campos.length); }).sort();
  Object.keys(reglas).forEach(function (k) {
    const x = diagValor_(reglas[k], d[k], conj.conjunto + '/' + k, ctx, r);
    if (x !== undefined) o[k] = x;
  });
  if (conj.conjunto === 'tutorias') o.tieneTutorHoy = !!d.tutorHoy;
  return o;
}

function diagAvisos_(conj, p, ids, sal) {
  const por = {};
  (p.avisos || []).forEach(function (a) {
    const t = String(a && a.tipo || '');
    if (!/^[a-z][a-z0-9-]{0,50}$/.test(t)) return;
    const x = por[t] = por[t] || { tipo: t, n: 0, cods: [] };
    x.n++;
    if (a.id && ids[a.id] && x.cods.length < 50) x.cods.push(ids[a.id]);
  });
  return Object.keys(por).sort().map(function (t) { return por[t]; });
}

/* Devuelve { fichero, sensibles, reglas } (`reglas` = las de cada conjunto, para que la puerta sepa la forma de cada casilla). El fichero entero: { version, momento, cruzable, listados, alumnosListados, conjuntos: { <conjunto>: { partes: [...] } } }. `faltantes` = idDrive que la comprobación del índice no encontró. */
function montarDiagnostico_(raiz, indice, comp) {
  const s = diagSal_(raiz);
  const ctx = { fase: 'contar', cuentas: {}, sal: s.sal };
  const cache = { cache: {} };
  const abiertas = [];
  CONJUNTOS_.filter(function (conj) { return !conj.sinDiagnostico; }).forEach(function (conj) {   // los contactos (fila 98) no salen en el diagnóstico
    (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto; }).forEach(function (h) {
      const p = cmpAbrirParte_(cache, h);
      if (p && p.obj && Array.isArray(p.obj.registros)) abiertas.push({ conj: conj, h: h, p: p.obj });
    });
  });
  abiertas.forEach(function (x) { const rg = diagReglasDe_(x.conj, x.p); x.p.registros.forEach(function (r) { diagRegistro_(x.conj, r, rg, ctx); }); });
  ctx.fase = 'emitir';
  const conjuntos = {}, reglasPor = {};
  abiertas.forEach(function (x) {
    const rg = diagReglasDe_(x.conj, x.p), ids = {};
    reglasPor[x.conj.conjunto] = Object.assign(reglasPor[x.conj.conjunto] || {}, rg);
    const regs = x.p.registros.map(function (r) { const o = diagRegistro_(x.conj, r, rg, ctx); ids[r.id] = o.cod || o.grupo; return o; });
    const parte = { parte: x.h.parte, cursoEscolar: /^[0-9-]{0,9}$/.test(x.h.cursoEscolar || '') ? x.h.cursoEscolar : '', registros: regs, avisos: diagAvisos_(x.conj, x.p, ids, s.sal) };
    if (x.h.periodo && DIAG_SLUG_.test(x.h.periodo)) parte.periodo = x.h.periodo;
    (conjuntos[x.conj.conjunto] = conjuntos[x.conj.conjunto] || { partes: [] }).partes.push(parte);
  });
  return { fichero: { version: VERSION_CD, momento: ahoraMadrid_(), cruzable: s.existia, listados: diagListados_(indice, comp), alumnosListados: diagListadosAlumnos_(raiz, s.sal), conjuntos: conjuntos },
    sensibles: diagSensibles_(abiertas, raiz), reglas: reglasPor };
}

function diagListados_(indice, comp) {
  const r = comp && comp.resultados && comp.resultados['indice-y-carpetas'];
  const faltan = r && r.faltantes ? r.faltantes : null;
  const falta = {};
  (faltan || []).forEach(function (id) { falta[id] = true; });
  return (indice.listados || []).filter(function (e) { return !e.porAlumno; }).map(function (e) {
    const o = { tipo: DIAG_SLUG_.test(e.clave || '') ? e.clave : '', variante: DIAG_SLUG_.test(e.variante || '') ? e.variante : '', cursoEscolar: /^[0-9-]{0,9}$/.test(e.cursoEscolar || '') ? e.cursoEscolar : '',
      ambito: DIAG_SLUG_.test(e.ambito || '') ? e.ambito : '', fecha: String(e.subido || '').slice(0, 10) };
    if (!DIAG_PATRON_FECHA_.test(o.fecha)) o.fecha = '';
    if (faltan) o.existe = !falta[e.idDrive || e.ruta];
    return o;
  });
}

/* Los ficheros de un solo alumno: tipo y código (de su nombre: este código no cruza con BD Alumnado). */
function diagListadosAlumnos_(raiz, sal) {
  return leerIndiceAlumnos_(raiz).listados.map(function (e) {
    return { tipo: DIAG_SLUG_.test(e.clave || '') ? e.clave : '', cod: diagCod_('N-', sal, e.alumno || e.alumnoNombre || ''), fecha: DIAG_PATRON_FECHA_.test(String(e.subido || '').slice(0, 10)) ? String(e.subido).slice(0, 10) : '' };
  });
}

/* ==== DiagnosticoPuerta.gs ==== */
/* La puerta de diagnostico/ultimo.json (fila 35). Antes de subir, repasa el texto que va a salir con lo que SÍ es personal en los datos de ahora: cada id (número escolar, DNI), cada palabra de un nombre
   o apellido, cada correo, cada teléfono y cada DNI/NIE con su forma. Si encuentra algo, el fichero no se sube. Solo devuelve cuentas: nunca lo que encontró. */
const DIAG_CAMPOS_NOMBRE_ = ['apellido1', 'apellido2', 'nombre', 'alumno', 'empleado', 'apellidos', 'persona', 'miembro', 'claveNombre', 'tutorHoy', 'sustituto'];
const DIAG_CAMPOS_EXACTOS_ = ['documento', 'telefono', 'telefonoPersonal', 'telefonoUrgencia', 'movil', 'correo', 'fechaNacimiento', 'domicilio'];

function diagPlegar_(t) { return cmpfQuitarTildes_(String(t)).toLowerCase(); }

/* Lo personal de las partes abiertas: { ids: {}, idsDe: {}, idsLibro: {}, palabras: {}, exactos: {}, enteros: {}, sueltas: {} } (no viaja, no se guarda). `idsDe` = de qué conjunto viene cada id (solo para contar); `idsLibro` = ids de libros y de cargos (claves de catálogo, no de una persona; fila 65, tras ver 174 saltos con datos reales), que no cuentan. `enteros` = el valor entero de un campo de nombre; `sueltas` = cada nombre o apellido por separado, de cualquier longitud. */
function diagSensibles_(abiertas, raiz) {
  const s = { ids: {}, idsDe: {}, idsLibro: {}, palabras: {}, exactos: {}, enteros: {}, sueltas: {} };
  const palabras = function (t) {
    const f = diagPlegar_(t), e = f.replace(/\s+/g, ' ').trim();
    (f.match(/[a-zñ]{4,}/g) || []).forEach(function (w) { s.palabras[w] = true; });
    (f.match(/[a-zñ]{2,}/g) || []).forEach(function (w) { s.sueltas[w] = true; });
    if (e) s.enteros[e] = true;
  };
  const exacto = function (t) { const x = diagPlegar_(String(t).trim()); if (x.length >= 5) s.exactos[x] = true; };
  const mirar = function (d) {
    if (!d || typeof d !== 'object') return;
    DIAG_CAMPOS_NOMBRE_.forEach(function (k) { if (typeof d[k] === 'string') palabras(d[k]); });
    DIAG_CAMPOS_EXACTOS_.forEach(function (k) { if (typeof d[k] === 'string') exacto(d[k]); });
  };
  const anota = function (id, conjunto) {
    const k = diagPlegar_(id);
    if (conjunto === 'libros' || conjunto === 'cargos') { s.idsLibro[k] = conjunto; return; }
    s.ids[k] = true;
    if (!s.idsDe[k]) s.idsDe[k] = conjunto;
  };
  abiertas.forEach(function (x) {
    x.p.registros.forEach(function (r) {
      if (typeof r.id === 'string' && r.id.length >= 5 && !DIAG_PATRON_GRUPO_.test(r.id)) { anota(r.id, x.conj.conjunto); }
      mirar(r.datos);
      ((r.datos && r.datos.tutores) || []).forEach(function (t) { mirar(t); if (t && typeof t.id === 'string') anota(t.id, 'tutorias'); });
    });
  });
  Object.keys(s.idsLibro).forEach(function (k) { if (s.ids[k]) delete s.idsLibro[k]; });
  return s;
}

/* Cuántas cosas personales hay en el texto, por clase. Todo cero = limpio. */
function diagRevisar_(texto, s) {
  const t = diagPlegar_(texto);
  const cuenta = function (re) { return (t.match(re) || []).length; };
  const r = {
    correos: cuenta(/[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z0-9.-]+/g),
    telefonos: cuenta(/(?<![0-9a-z])(?:\+34[ .-]?)?[6-9]\d{2}[ .-]?\d{3}[ .-]?\d{3}(?![0-9a-z])/g),
    documentos: cuenta(/(?<![0-9a-z])(?:\d{8}[a-z]|[xyz]\d{7}[a-z])(?![0-9a-z])/g),
    ids: 0, nombres: 0, exactos: 0
  };
  (t.match(/[a-z0-9]{5,}/g) || []).forEach(function (w) { if (s.ids[w]) r.ids++; });
  (t.match(/[a-zñ]{4,}/g) || []).forEach(function (w) { if (s.palabras[w]) r.nombres++; });
  Object.keys(s.exactos).forEach(function (x) { if (t.indexOf(x) !== -1) r.exactos++; });
  return r;
}

function diagTotal_(cuentas) { return Object.keys(cuentas).reduce(function (n, k) { return n + cuentas[k]; }, 0); }

/* ==== DiagnosticoBloques.gs ==== */
/* La puerta del diagnóstico por bloques (fila 56). Los bloques son nueve: la cabecera (cabecera, índice de listados y ficheros de un solo alumno) y cada conjunto entero.
   Cada bloque se repasa solo y la puerta cuenta lo que encuentra por clase (n nombres, e exactos, i ids, c correos, t teléfonos, d documentos), bloque y campo: solo cifras y nombres de campo, nunca la palabra.
   Cada casilla se repasa según la forma que le obliga el montaje: un texto de lista (cat) solo salta si su valor ENTERO es un nombre o un apellido; las fechas, números, códigos y demás formas fijas no llevan letras de un nombre. */
const DIAG_MODO_ = { cat: 'cat', lista: 'cat', grupo: 'forma', grupo5: 'forma', num: 'forma', sino: 'forma', hay: 'forma', periodo: 'forma', fecha: 'fecha', cod: 'cod', ficha: 'cod' };
const DIAG_FIJAS_ = { cod: 'cod', grupo: 'forma', matriculado: 'forma', tieneTutorHoy: 'forma' };
const DIAG_REGLAS_CABECERA_ = { version: 'periodo', momento: 'periodo', cruzable: 'sino', listados: { tabla: { tipo: 'cat', variante: 'cat', ambito: 'cat', cursoEscolar: 'periodo', fecha: 'fecha', existe: 'sino' } },
  alumnosListados: { tabla: { tipo: 'cat', cod: 'cod', fecha: 'fecha' } } };
const DIAG_CLASES_ = { c: 'correos', t: 'telefonos', d: 'documentos', i: 'ids', n: 'nombres', e: 'exactos' };
const DIAG_MAX_SITIOS_ = 20;
const DIAG_FRASES_BLOQUE_ = { alumnado: 'de la ficha del alumno', personal: 'del personal', libros: 'de los libros de texto', tutorias: 'de las tutorías', 'consejo-escolar': 'del Consejo Escolar', cargos: 'de los cargos',
  empresas: 'de las empresas', administraciones: 'de las Administraciones' };

function diagCampoLimpio_(c) { return String(c).toLowerCase().replace(/[^a-z]/g, '') || 'otros'; }

/* Los bloques: [{ bloque, conjunto, objeto }]. */
function diagBloques_(fichero) {
  const cab = Object.assign({}, fichero);
  delete cab.conjuntos;
  const lista = [{ bloque: 'cabecera', conjunto: '', objeto: cab }];
  Object.keys(fichero.conjuntos).forEach(function (c) { lista.push({ bloque: c, conjunto: c, objeto: fichero.conjuntos[c] }); });
  return lista;
}

/* Una casilla (o lo que haya dentro de ella) a la lista de cosas que se repasan: { campo, texto, modo }. `regla` es la de la lista blanca; sin regla, se repasa como texto libre. */
function diagRecorrer_(items, campo, regla, v) {
  if (v === null || v === undefined) return;
  if (regla && regla.tabla) {
    (Array.isArray(v) ? v : []).forEach(function (f) { if (f && typeof f === 'object') Object.keys(f).forEach(function (k) { diagRecorrer_(items, campo + k, regla.tabla[k], f[k]); }); });
    return;
  }
  if (Array.isArray(v)) { v.forEach(function (x) { diagRecorrer_(items, campo, regla, x); }); return; }
  if (typeof v === 'object') {
    Object.keys(v).forEach(function (k) { items.push({ campo: 'nombredeclave', texto: k, modo: 'libre' }); diagRecorrer_(items, campo, null, v[k]); });
    return;
  }
  items.push({ campo: diagCampoLimpio_(campo), texto: String(v), modo: (typeof regla === 'string' && DIAG_MODO_[regla]) || 'libre' });
}

function diagItemsRegistro_(items, r, reglas, entidad) {
  Object.keys(r).forEach(function (k) {
    if (k === 'claves') { (r.claves || []).forEach(function (x) { items.push({ campo: 'nombredeclave', texto: String(x), modo: entidad ? 'libre' : 'programa' }); }); return; }
    if (DIAG_FIJAS_[k]) { diagRecorrer_(items, k, DIAG_FIJAS_[k] === 'cod' ? 'cod' : 'sino', r[k]); return; }
    if (entidad && k !== 'clase') items.push({ campo: 'nombredeclave', texto: k, modo: 'libre' });
    diagRecorrer_(items, k, reglas[k], r[k]);
  });
}

function diagItems_(b, reglasEntidad) {
  const items = [];
  if (b.bloque === 'cabecera') {
    Object.keys(b.objeto).forEach(function (k) { diagRecorrer_(items, k, DIAG_REGLAS_CABECERA_[k], b.objeto[k]); });
    return items;
  }
  const entidad = !DIAG_REGLAS_[b.conjunto], reglas = entidad ? (reglasEntidad || {}) : DIAG_REGLAS_[b.conjunto].campos;
  (b.objeto.partes || []).forEach(function (p) {
    ['parte', 'cursoEscolar', 'periodo'].forEach(function (k) { diagRecorrer_(items, k, 'periodo', p[k]); });
    (p.registros || []).forEach(function (r) {
      const desde = items.length, quien = String(r.cod || r.grupo || '');
      diagItemsRegistro_(items, r, reglas, entidad);
      for (let i = desde; i < items.length; i++) items[i].quien = quien;
    });
    (p.avisos || []).forEach(function (a) {
      diagRecorrer_(items, 'aviso', 'periodo', a.tipo); diagRecorrer_(items, 'aviso', 'num', a.n);
      (a.cods || []).forEach(function (c) { diagRecorrer_(items, 'aviso', 'cod', c); });
    });
  });
  return items;
}

const DIAG_RE_CORREO_ = /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z0-9.-]+/g;
const DIAG_RE_TELEFONO_ = /(?<![0-9a-z])(?:\+34[ .-]?)?[6-9]\d{2}[ .-]?\d{3}[ .-]?\d{3}(?![0-9a-z])/g;
const DIAG_RE_DOCUMENTO_ = /(?<![0-9a-z])(?:\d{8}[a-z]|[xyz]\d{7}[a-z])(?![0-9a-z])/g;

/* Las cuentas de un bloque: { '<clase>|<campo>': n }. Correos, teléfonos y documentos se buscan en todo; los ids en todo salvo en los códigos; los nombres según el modo; los exactos en todo salvo en las fechas.
   `extra` (si se pasa) recoge cifras de apoyo: de qué clase viene cada salto de nombre, de qué conjunto cada id, y cuántas coincidencias se dieron por catálogo (compartidas por 5 personas o más). Solo cuentas. */
function diagContarItems_(items, s, extra) {
  const cuentas = {}, ex = extra || {}, idsDe = s.idsDe || {}, idsLibro = s.idsLibro || {};
  const suma = function (clase, campo, n) { if (n) cuentas[clase + '|' + campo] = (cuentas[clase + '|' + campo] || 0) + n; };
  const mas = function (k) { ex[k] = (ex[k] || 0) + 1; };
  const compartidos = {};
  items.forEach(function (it) {
    if (it.modo !== 'cat' || !it.quien) return;
    const k = it.campo + '\u0001' + diagPlegar_(it.texto).replace(/\s+/g, ' ').trim();
    (compartidos[k] = compartidos[k] || {})[it.quien] = true;
  });
  items.forEach(function (it) {
    const t = it.t = diagPlegar_(it.texto);
    suma('c', it.campo, (t.match(DIAG_RE_CORREO_) || []).length);
    suma('t', it.campo, (t.match(DIAG_RE_TELEFONO_) || []).length);
    suma('d', it.campo, (t.match(DIAG_RE_DOCUMENTO_) || []).length);
    if (it.modo !== 'cod') (t.match(/[a-z0-9]{5,}/g) || []).forEach(function (w) {
      if (s.ids[w]) { suma('i', it.campo, 1); mas('ids-de-' + (idsDe[w] || 'otros')); } else if (idsLibro[w]) mas('ids-de-' + (idsLibro[w] === 'cargos' ? 'cargos' : 'libros') + '-sin-contar');
    });
    if (it.modo === 'libre') (t.match(/[a-zñ]{4,}/g) || []).forEach(function (w) { if (s.palabras[w]) suma('n', it.campo, 1); });
    else if (it.modo === 'cat') {
      const e = t.replace(/\s+/g, ' ').trim();
      if (e === '(pocos)' || !(s.enteros[e] || s.sueltas[e])) return;
      if (s.enteros[e] && e.indexOf(' ') !== -1) { suma('n', it.campo, 1); mas('nombres-enteros'); return; }
      if (Object.keys(compartidos[it.campo + '\u0001' + e] || {}).length >= DIAG_MIN_) { mas('coincidencias-de-catalogo'); return; }
      suma('n', it.campo, 1); mas('nombres-sueltos');
      if (e.length <= 3) mas('nombres-sueltos-cortos');
    }
  });
  const buscables = items.filter(function (it) { return it.modo !== 'fecha'; });
  const todo = buscables.map(function (it) { return it.t; }).join('\u0001');
  Object.keys(s.exactos).forEach(function (x) {
    if (todo.indexOf(x) === -1) return;
    let n = 0;
    buscables.forEach(function (it) { if (it.t.indexOf(x) !== -1) { suma('e', it.campo, 1); n++; } });
    if (!n) suma('e', 'otros', 1);
  });
  return cuentas;
}

/* Repasa cada bloque por separado. Devuelve [{ bloque, conjunto, cuentas, total }]. `reglas` = las reglas de los campos de las entidades, por conjunto (las que usó el montaje). */
function diagRevisarBloques_(fichero, s, reglas) {
  return diagBloques_(fichero).map(function (b) {
    const extra = {}, cuentas = diagContarItems_(diagItems_(b, (reglas || {})[b.conjunto]), s, extra);
    return { bloque: b.bloque, conjunto: b.conjunto, cuentas: cuentas, extra: extra, total: diagTotal_(cuentas) };
  });
}

/* Las cifras de diagnostico-limpio: los totales por clase y el reparto por bloque y campo (`n-libros-editorial`), con los 20 sitios que más cuentan y una cuenta del resto. */
function diagCifrasBloques_(bloques) {
  const cifras = { correos: 0, telefonos: 0, documentos: 0, ids: 0, nombres: 0, exactos: 0 }, por = {};
  bloques.forEach(function (b) {
    Object.keys(b.cuentas).forEach(function (k) {
      const p = k.split('|');
      cifras[DIAG_CLASES_[p[0]]] += b.cuentas[k];
      const nombre = (p[0] + '-' + b.bloque + '-' + p[1]).slice(0, 40);
      por[nombre] = (por[nombre] || 0) + b.cuentas[k];
    });
  });
  bloques.forEach(function (b) { Object.keys(b.extra || {}).forEach(function (k) { cifras[k] = (cifras[k] || 0) + b.extra[k]; }); });
  const orden = Object.keys(por).sort(function (a, c) { return por[c] - por[a] || (a < c ? -1 : 1); });
  orden.slice(0, DIAG_MAX_SITIOS_).forEach(function (k) { cifras[k] = por[k]; });
  if (orden.length > DIAG_MAX_SITIOS_) cifras['resto-coincidencias'] = orden.slice(DIAG_MAX_SITIOS_).reduce(function (n, k) { return n + por[k]; }, 0);
  return cifras;
}

/* Los ficheros que saldrán: cada conjunto limpio en el suyo y diagnostico/ultimo.json con la cabecera y, por conjunto, dónde está o que se ha retenido. Último, el índice. [{ ruta, texto }] */
function diagFicheros_(fichero, retenidos) {
  const cabecera = Object.assign({}, fichero, { conjuntos: {} });
  const lista = [];
  Object.keys(fichero.conjuntos).forEach(function (c) {
    if (retenidos.indexOf(c) !== -1) { cabecera.conjuntos[c] = { retenido: true }; return; }
    cabecera.conjuntos[c] = { enFichero: 'diagnostico/' + c + '.json' };
    lista.push({ ruta: 'diagnostico/' + c + '.json', texto: JSON.stringify({ version: fichero.version, conjunto: c, partes: fichero.conjuntos[c].partes }) });
  });
  return lista.concat([{ ruta: DIAG_RUTA_, texto: JSON.stringify(cabecera, null, 1) }]);
}

/* Una línea por bloque retenido, solo para el dueño: [{ bloque, frase }]. Desaparece cuando el bloque se sube limpio. */
function avisosDeDiagnostico_(comp) {
  const d = comp.diag;
  if (!d || !Array.isArray(d.retenidos)) return [];
  return d.retenidos.filter(function (b) { return b === 'cabecera' || DIAG_FRASES_BLOQUE_[b]; }).map(function (b) {
    return { bloque: b, frase: b === 'cabecera' ? 'El diagnóstico no se ha subido: la primera parte parece llevar algún nombre.' : 'El diagnóstico ' + DIAG_FRASES_BLOQUE_[b] + ' no se ha subido: parece llevar algún nombre.' };
  });
}

/* ==== DiagnosticoSubir.gs ==== */
/* Subir el diagnóstico a este repositorio (fila 35, por bloques desde la fila 56), por el mismo camino y con la misma clave que comprobaciones/ultima.json. Se manda cuando se manda ultima.json (al acabar una pasada de
   comprobaciones) y solo si algo ha cambiado: la huella son las de las partes y los listados del índice (ninguna se abre para saberlo). La puerta (DiagnosticoBloques.gs) repasa cada bloque por separado: el que
   sale limpio se sube, en diagnostico/<conjunto>.json; el que no, se queda en la aplicación (y se borra su fichero de GitHub si había uno). diagnostico/ultimo.json dice cuál es cuál. Si la cabecera no sale limpia, no se sube nada. */
const DIAG_RUTA_ = 'diagnostico/ultimo.json';
const DIAG_ESPERA_MS_ = 30 * 60 * 1000;

function leerDiag_(comp) {
  comp.diag = Object.assign({ estado: 'todavia-no', hash: '', hashMalo: '', version: '', dia: '', ultimaMs: 0, limpio: 'sin-datos', cuentas: {}, ficheros: 0, registros: 0, bytes: 0, partido: false, retenidos: [], subidos: 0, borrados: 0, borradoFalla: 0 }, comp.diag || {});
  return comp.diag;
}

function huellaDiag_(indice, comp) {
  const r = comp.resultados && comp.resultados['indice-y-carpetas'];
  const trozos = [VERSION_CD].concat((indice.hechos || []).map(function (h) { return h.huella; }), (indice.listados || []).map(function (e) { return e.huella || ''; }), r && r.faltantes ? r.faltantes : []);
  return huella_(Utilities.newBlob(trozos.join(',')).getBytes());
}

/* ¿Toca montar y subir ahora? (Barato: no abre ninguna parte.) */
function diagToca_(comp, indice, forzar) {
  if (!PropertiesService.getScriptProperties().getProperty('GH_CLAVE')) return false;
  if (!(indice.hechos || []).length) return false;
  const d = leerDiag_(comp), hoy = ahoraMadrid_().slice(0, 10), h = huellaDiag_(indice, comp);
  if (h === d.hash && d.estado === 'bien') return false;
  if (h === d.hashMalo && d.version === VERSION_CD) return false;
  if ((d.estado === 'sin-permiso' || d.estado === 'caducada') && d.dia === hoy && !forzar) return false;
  if (!forzar && d.version === VERSION_CD && d.ultimaMs && new Date().getTime() - d.ultimaMs < DIAG_ESPERA_MS_) return false;
  return true;
}

function contarRegistrosDiag_(fichero) {
  let n = 0;
  Object.keys(fichero.conjuntos).forEach(function (c) { fichero.conjuntos[c].partes.forEach(function (p) { n += p.registros.length; }); });
  return n;
}

/* Monta, repasa y sube. Escribe comp.diag y comp. Nunca lanza: lo que falle se queda dicho en comp.diag.estado. */
function subirDiagnostico_(raiz, comp, limiteMs, forzar) {
  try { subirDiagnosticoSeguro_(raiz, comp, limiteMs, forzar); } catch (e) {
    const d = leerDiag_(comp);
    d.estado = 'error'; d.version = VERSION_CD; d.ultimaMs = new Date().getTime(); d.dia = ahoraMadrid_().slice(0, 10);
    try { escribirComprob_(raiz, comp); } catch (x) { /* nada más que hacer */ }
  }
}

/* Borra un fichero de GitHub (si está). Devuelve 'bien', 'no-estaba', 'sin-permiso', 'caducada' o 'sin-red'. */
function borrarEnGitHub_(clave, mensaje, ruta) {
  const url = 'https://api.github.com/repos/' + GH_USUARIO + '/' + GH_REPO + '/contents/' + ruta.split('/').map(encodeURIComponent).join('/');
  const rama = PropertiesService.getScriptProperties().getProperty('GH_RAMA') || 'main';
  try {
    const actual = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(rama), { method: 'get', muteHttpExceptions: true, headers: cabecerasGitHub_(clave) });
    const cod = actual.getResponseCode();
    if (cod === 404) return 'no-estaba';
    if (cod === 401) return 'caducada';
    if (cod === 403) return 'sin-permiso';
    if (cod !== 200) return 'sin-red';
    const resp = UrlFetchApp.fetch(url, { method: 'delete', contentType: 'application/json', payload: JSON.stringify({ message: mensaje, sha: JSON.parse(actual.getContentText()).sha, branch: rama }), muteHttpExceptions: true, headers: cabecerasGitHub_(clave) });
    const c = resp.getResponseCode();
    if (c === 200) return 'bien';
    if (c === 401) return 'caducada';
    if (c === 403 || c === 404) return 'sin-permiso';
    return 'sin-red';
  } catch (e) {
    return 'sin-red';
  }
}

function subirDiagnosticoSeguro_(raiz, comp, limiteMs, forzar) {
  const indice = leerIndice_(raiz);
  if (!diagToca_(comp, indice, forzar)) return;
  const d = leerDiag_(comp), hoy = ahoraMadrid_().slice(0, 10), h = huellaDiag_(indice, comp);
  const m = montarDiagnostico_(raiz, indice, comp);
  const bloques = diagRevisarBloques_(m.fichero, m.sensibles, m.reglas);
  const retenidos = bloques.filter(function (b) { return b.total > 0; }).map(function (b) { return b.bloque; });
  d.cuentas = diagCifrasBloques_(bloques); d.retenidos = retenidos; d.limpio = retenidos.length ? 'mal' : 'bien'; d.registros = contarRegistrosDiag_(m.fichero);
  d.version = VERSION_CD; d.ultimaMs = new Date().getTime(); d.dia = hoy; d.subidos = 0; d.borrados = 0; d.borradoFalla = 0;
  if (retenidos.indexOf('cabecera') !== -1) { d.estado = 'no-limpio'; d.hashMalo = h; d.ficheros = 0; d.bytes = 0; d.partido = false; escribirComprob_(raiz, comp); return; }
  const ficheros = diagFicheros_(m.fichero, retenidos);
  d.ficheros = ficheros.length; d.partido = true; d.bytes = ficheros.reduce(function (n, f) { return n + f.texto.length; }, 0);
  const clave = PropertiesService.getScriptProperties().getProperty('GH_CLAVE');
  let r = 'bien';
  for (let i = 0; i < ficheros.length && r === 'bien'; i++) r = escribirEnGitHub_(clave, ficheros[i].texto, 'Diagnóstico sin nombres, ' + VERSION_CD, false, {}, ficheros[i].ruta);
  if (r === 'bien') {
    d.subidos = bloques.length - retenidos.length;
    retenidos.forEach(function (c) {
      const x = borrarEnGitHub_(clave, 'Diagnóstico sin nombres: bloque retenido, ' + VERSION_CD, 'diagnostico/' + c + '.json');
      if (x === 'bien') d.borrados++; else if (x !== 'no-estaba') d.borradoFalla++;
    });
  }
  d.estado = r === 'bien' && retenidos.length ? 'parcial' : r;
  if (r === 'bien' && !retenidos.length) { d.hash = h; d.hashMalo = ''; }
  else if (r === 'bien' && !d.borradoFalla) { d.hash = ''; d.hashMalo = h; }
  escribirComprob_(raiz, comp);
}

/* ==== DiagnosticoBuscar.gs ==== */
/* Del código de diagnóstico a la persona (fila 35). Solo el dueño (lo exige también el manifiesto: `soloDueno`). Lee las partes de ahora y dice quién es y dónde sale; nada de esto se guarda ni sube. */
const DIAG_DONDE_ = { A: ['alumnado'], P: ['personal', 'tutorias', 'consejo-escolar', 'cargos'], C: ['consejo-escolar', 'cargos'], E: ['empresas', 'administraciones'] };

function diagNombreDe_(r, t) {
  const d = t || r.datos || {};
  return String(d.alumno || d.empleado || d.miembro || d.persona || d.razonSocial || d.nombreComercial || d.nombre || '').slice(0, 120);
}

function webDiagnosticoBuscar(codigo, ctx) {
  if (!ctx.esDueno) throw new Error('Esto solo lo puede hacer el dueño.');
  return diagBuscar_(codigo, carpetaDatos_(), function () { return diagSal_(carpetaDatos_()).sal; });
}

/* La búsqueda en sí. `dameSal` devuelve la sal o null si aún no hay diagnóstico (la página nueva solo la lee; la aplicación de hoy la crea si falta). */
function diagBuscar_(codigo, raiz, dameSal) {
  const m = /^([APCEN])-([0-9a-fA-F]{8})$/.exec(String(codigo || '').trim());
  if (!m) return { ok: false, mensaje: 'Un código tiene esta forma: A-1b2c3d4e (una letra, un guion y ocho cifras o letras).' };
  const cod = m[1].toUpperCase() + '-' + m[2].toLowerCase();
  const sal = dameSal();
  if (!sal) return { ok: false, mensaje: 'Todavía no hay diagnóstico: aún no se ha creado la clave con la que se hacen los códigos.' };
  const indice = leerIndice_(raiz);
  const donde = [];
  let nombre = '', ficheros = 0;
  if (m[1].toUpperCase() === 'N') {
    leerIndiceAlumnos_(raiz).listados.forEach(function (e) {
      if (diagCod_('N-', sal, e.alumno || e.alumnoNombre || '') === cod) { nombre = nombre || String(e.alumnoNombre || '').slice(0, 120); ficheros++; }
    });
    if (ficheros) donde.push(ficheros + (ficheros === 1 ? ' fichero de un solo alumno' : ' ficheros de un solo alumno'));
  } else {
    const cache = { cache: {} };
    CONJUNTOS_.filter(function (c) { return DIAG_DONDE_[m[1].toUpperCase()].indexOf(c.conjunto) !== -1; }).forEach(function (conj) {
      (indice.hechos || []).filter(function (h) { return h.conjunto === conj.conjunto; }).forEach(function (h) {
        const p = cmpAbrirParte_(cache, h);
        if (!p || !p.obj || !Array.isArray(p.obj.registros)) return;
        let sale = false;
        p.obj.registros.forEach(function (r) {
          if (diagCodDe_(conj, r, sal) === cod) { sale = true; nombre = nombre || diagNombreDe_(r); }
          ((r.datos && r.datos.tutores) || []).forEach(function (t) { if (conj.conjunto === 'tutorias' && t && t.id && diagCod_('P-', sal, t.id) === cod) { sale = true; nombre = nombre || diagNombreDe_(r, t); } });
        });
        if (sale) donde.push(conj.titulo + (h.cursoEscolar ? ' · ' + h.cursoEscolar : '') + (h.periodo ? ' · ' + h.periodo : ''));
      });
    });
  }
  if (!donde.length) return { ok: true, encontrado: false, codigo: cod, mensaje: 'No encuentro ese código en los datos de ahora. Si se ha cambiado la clave de diagnóstico, los códigos antiguos ya no valen.' };
  return { ok: true, encontrado: true, codigo: cod, nombre: nombre || '(sin nombre en la ficha)', donde: donde };
}

/* ==== ComprobDiagnostico.gs ==== */
/* Las comprobaciones de la fila 35 (diagnóstico sin nombres). Solo leen lo que dejó la última vez que se montó el diagnóstico (comp.diag); solo cuentas. */
function cmpDiagnosticoLimpio_(ctx) {
  const d = ctx.comp.diag;
  if (!d || d.limpio === 'sin-datos') return { estado: 'sin datos', cifras: { ficheros: 0 } };
  const cifras = { ficheros: d.ficheros, registros: d.registros };
  Object.keys(d.cuentas || {}).forEach(function (k) { cifras[k] = d.cuentas[k]; });
  return { estado: d.limpio === 'bien' ? 'bien' : 'mal', cifras: cifras };
}

function cmpDiagnosticoEnvio_(ctx) {
  const d = ctx.comp.diag;
  if (!d || !d.ultimaMs) return { estado: 'sin datos', cifras: { ficheros: 0 } };
  return { estado: 'dato', cifras: { subido: d.estado === 'bien' || d.estado === 'parcial', 'no-limpio': d.estado === 'no-limpio', 'con-error': d.estado === 'error', 'sin-permiso': d.estado === 'sin-permiso' || d.estado === 'caducada', 'sin-red': d.estado === 'sin-red',
    ficheros: d.ficheros, partido: !!d.partido, 'bloques-subidos': d.subidos || 0, 'bloques-retenidos': (d.retenidos || []).length, 'ficheros-borrados': d.borrados || 0, 'borrados-que-fallan': d.borradoFalla || 0, registros: d.registros, bytes: d.bytes, 'minutos-desde-el-intento': Math.max(0, Math.round((ctx.ahoraMs - d.ultimaMs) / 60000)) } };
}

/* ==== ComprobEjecutar.gs ==== */
/* Ejecutar las comprobaciones del catálogo (ComprobCatalogo.gs) y guardar sus resultados en _interno/comprobaciones.json.
   Una comprobación está debida si nunca se ha hecho, se hizo con otra versión o tiene más de 6 horas. Al cambiar de versión no se borra nada:
   se repiten primero las que nunca se han hecho y después las más antiguas; la que no cabe en el tiempo queda como «sin tiempo». */
const COMPROB_VIGENCIA_MS_ = 6 * 3600 * 1000;
/* Una que salió «sin datos» se mira otra vez enseguida: en cuanto llegan los datos, deja de serlo. */
const COMPROB_VIGENCIA_SIN_DATOS_MS_ = 10 * 60 * 1000;

function leerComprob_(raiz) {
  const base = { resultados: {}, errores: {}, subida: { estado: 'todavia-no', dia: '', hash: '', ultimaMs: 0, version: '', malos: [], intentosDia: 0, diaIntentos: '' } };
  const a = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'comprobaciones.json');
  return a ? Object.assign(base, a, { subida: Object.assign(base.subida, a.subida || {}) }) : base;
}

function escribirComprob_(raiz, comp) { escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), 'comprobaciones.json', comp); }

/* Con el índice, las dos comprobaciones de la ficha contra BD Alumnado (fila 26) también se repiten en cuanto cambia el fichero de BD o cualquier parte del alumnado. */
function esDebida_(r, ahoraMs, indice) {
  if (r && indice && CMPF_HUELLAS_.indexOf(r.id) !== -1 && r.huellas !== cmpHuellasFicha_(indice)) return true;
  return !r || r.estado === 'sin tiempo' || r.hechaCon !== VERSION_CD || ahoraMs - new Date(r.cuando).getTime() > (r.estado === 'sin datos' ? COMPROB_VIGENCIA_SIN_DATOS_MS_ : COMPROB_VIGENCIA_MS_);
}

/* Las debidas, las nunca hechas primero y después las más antiguas. */
function comprobacionesDebidas_(comp, ahoraMs, indice) {
  const fecha = function (c) { const r = comp.resultados[c.id]; return r && r.estado !== 'sin tiempo' ? new Date(r.cuando).getTime() : -1; };
  return COMPROBACIONES_.filter(function (c) { return esDebida_(comp.resultados[c.id], ahoraMs, indice); }).sort(function (a, b) { return fecha(a) - fecha(b); });
}

function ejecutarComprobacion_(c, ctx, comp) {
  const t0 = new Date().getTime();
  let res;
  try {
    const r = cmpFuncion_(c.funcion)(ctx);
    res = cmpPuerta_({ id: c.id, estado: r.estado, cifras: r.cifras });
    if (r.faltantes) res.faltantes = r.faltantes;   // idem: los ids de Drive que faltan (los usa el diagnóstico para decir `existe`)
    if (r.huellas) res.huellas = r.huellas;   // se queda en _interno/comprobaciones.json: no viaja (resumenDeComprob_ no lo coge)
    delete comp.errores[c.id];
  } catch (e) {
    res = cmpPuerta_({ id: c.id, estado: 'error', cifras: { funcion: c.funcion, tipo: (e && e.name) || 'Error' } });
    comp.errores[c.id] = String((e && e.message) || e).slice(0, 300);   // el mensaje se queda aquí: puede llevar un nombre
  }
  res.ms = new Date().getTime() - t0;
  res.hechaCon = VERSION_CD;
  res.cuando = ahoraMadrid_();
  comp.resultados[c.id] = res;
}

/* Una pasada de comprobaciones hasta `limiteMs` (hora absoluta). Si `forzarUna`, hace al menos una aunque no quede tiempo. Devuelve cuántas hizo. */
function pasadaComprobaciones_(raiz, limiteMs, forzarUna) {
  const comp = leerComprob_(raiz);
  const indiceAhora = leerIndice_(raiz);
  const debidas = comprobacionesDebidas_(comp, new Date().getTime(), indiceAhora);
  if (!debidas.length) {
    try { subirDiagnostico_(raiz, comp, limiteMs, false); } catch (e) { /* el diagnóstico nunca rompe una tanda */ }
    return 0;
  }
  const ctx = { raiz: raiz, indice: indiceAhora, avance: leerAvance_(raiz), comp: comp, ahoraMs: new Date().getTime(), cache: {} };
  let hechas = 0;
  for (let i = 0; i < debidas.length; i++) {
    if (new Date().getTime() >= limiteMs && (hechas > 0 || !forzarUna)) break;
    ejecutarComprobacion_(debidas[i], ctx, comp);
    hechas++;
  }
  debidas.forEach(function (c) { if (!comp.resultados[c.id]) comp.resultados[c.id] = { id: c.id, estado: 'sin tiempo', cifras: {}, otros: 0, ms: 0, hechaCon: '', cuando: ahoraMadrid_() }; });
  escribirComprob_(raiz, comp);
  if (hechas) {
    try { escribirEstadoHechos_(raiz); } catch (e) { /* informativo */ }
    try { subirComprobaciones_(raiz, comp, false); } catch (e) { /* subir nunca rompe una tanda */ }
    try { subirDiagnostico_(raiz, comp, limiteMs, false); } catch (e) { /* el diagnóstico nunca rompe una tanda */ }
  }
  return hechas;
}

function hayComprobacionesDebidas_(raiz) {
  const comp = leerComprob_(raiz), indice = leerIndice_(raiz);
  return comprobacionesDebidas_(comp, new Date().getTime(), indice).length > 0 || diagToca_(comp, indice, false);
}

/* Lo de las comprobaciones que va a estado.json y a ultima.json (siempre por la puerta). */
function resumenDeComprob_(comp) {
  const lista = COMPROBACIONES_.map(function (c) { return comp.resultados[c.id]; }).filter(function (r) { return !!r; })
    .map(function (r) { return { id: r.id, estado: r.estado, cifras: r.cifras, otros: r.otros || 0, ms: r.ms, hechaCon: r.hechaCon, cuando: r.cuando }; });
  const resumen = {};
  COMPROB_ESTADOS_.forEach(function (e) { resumen[e.replace(' ', '-')] = lista.filter(function (r) { return r.estado === e; }).length; });
  const completo = COMPROBACIONES_.every(function (c) { const r = comp.resultados[c.id]; return r && r.hechaCon === VERSION_CD && r.estado !== 'sin tiempo'; });
  return { completo: completo, resumen: resumen, lista: lista };
}

/* «2 cosas no cuadran» / «todo bien», o null si todavía no hay ninguna hecha. */
function textoComprobado_(comp) {
  const hechas = COMPROBACIONES_.map(function (c) { return comp.resultados[c.id]; }).filter(function (r) { return r && r.hechaCon; });
  if (!hechas.length) return null;
  return { malos: hechas.filter(function (r) { return r.estado === 'mal' || r.estado === 'error'; }).length };
}

/* ==== ClaveGithub.gs ==== */
/* La clave de GitHub (fila 33): qué le pasa, cuándo caduca y qué se le dice al dueño. Nada de la clave sale de aquí: ni su valor ni trozos.
   Se guarda en comp.subida.clave: { tipo: 'clasica' | 'nueva' | '', caduca: 'AAAA-MM-DD' | '', mirada: ms, recuperada: sí/no }.
   El estado de la subida (comp.subida.estado) dice si la clave escribe: 'bien', 'sin-permiso' (403 o 404), 'caducada' (401). */
const CLAVE_AVISO_DIAS_ = 15;
const CLAVE_MIRAR_PAGINA_MS_ = 60 * 60 * 1000;
const CLAVE_ESPERA_ROTA_MS_ = 60 * 1000;
const MESES_CLAVE_ = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* Por cómo empieza: ghp_ es clásica, github_pat_ es de las nuevas. Otra cosa, '' (la ventana enseña entonces los dos caminos). */
function tipoDeClave_(clave) {
  const c = String(clave || '');
  if (/^github_pat_/.test(c)) return 'nueva';
  if (/^ghp_/.test(c)) return 'clasica';
  return '';
}

/* La cabecera «github-authentication-token-expiration» dice «2026-11-12 10:00:00 UTC». Solo interesa el día. */
function fechaDeCaducidad_(valor) {
  const m = /^(\d{4}-\d\d-\d\d)/.exec(String(valor || '').trim());
  return m ? m[1] : '';
}

function cabeceraDe_(resp, nombre) {
  let h = {};
  try { h = (resp.getHeaders && resp.getHeaders()) || {}; } catch (e) { h = {}; }
  const k = Object.keys(h).filter(function (x) { return x.toLowerCase() === nombre; })[0];
  return k ? String(h[k]) : '';
}

/* Cuántos días faltan para el día `fecha` (0 = hoy, negativo = ya pasó). */
function diasHasta_(fecha) {
  return Math.round((Date.parse(fecha + 'T00:00:00Z') - Date.parse(hoyMadrid_() + 'T00:00:00Z')) / 86400000);
}

function fechaLargaClave_(fecha) {
  const p = fecha.split('-');
  return parseInt(p[2], 10) + '-' + MESES_CLAVE_[parseInt(p[1], 10) - 1] + '-' + p[0];
}

/* ok · caduca-pronto · caducada · sin-escribir, o '' si todavía no se sabe. */
function casoDeClave_(subida) {
  const c = subida.clave || {};
  const dias = c.caduca ? diasHasta_(c.caduca) : null;
  if (subida.estado === 'caducada' || (dias !== null && dias < 0)) return 'caducada';
  if (subida.estado === 'sin-permiso') return 'sin-escribir';
  if (dias !== null && dias <= CLAVE_AVISO_DIAS_) return 'caduca-pronto';
  return subida.estado === 'bien' ? 'ok' : '';
}

function fraseDeClave_(caso, dias, caduca) {
  if (caso === 'caduca-pronto') {
    const cuando = dias <= 0 ? 'hoy' : (dias === 1 ? 'mañana' : 'dentro de ' + dias + ' días');
    return 'La clave de GitHub caduca el ' + fechaLargaClave_(caduca) + ' (' + cuando + '). Renuévala antes para que el Centro de datos siga funcionando.';
  }
  if (caso === 'caducada') return 'La clave de GitHub ya no vale (ha caducado o se ha borrado). Hay que poner una nueva.';
  return 'A la clave de GitHub le falta permiso para escribir: el Centro de datos no puede contar cómo va.';
}

/* Lo que la página enseña al dueño, o null si no hay nada que avisar. Solo el caso, el tipo, los días, el día de caducidad y la frase. */
function avisoDeClave_(comp) {
  const caso = casoDeClave_(comp.subida);
  if (caso !== 'caduca-pronto' && caso !== 'caducada' && caso !== 'sin-escribir') return null;
  const c = comp.subida.clave || {};
  const dias = c.caduca ? diasHasta_(c.caduca) : null;
  return { caso: caso, tipo: c.tipo || '', dias: dias, caduca: c.caduca || '', frase: fraseDeClave_(caso, dias, c.caduca || '') };
}

/* Para la comprobación `clave-github`: solo palabras de la lista cerrada y números. */
function cmpClaveGithub_(ctx) {
  const s = ctx.comp.subida, c = s.clave || {};
  const caso = casoDeClave_(s);
  if (!caso) return { estado: 'sin datos', cifras: { 'dias-para-caducar': 'sin-caducidad' } };
  const cifras = { estado: caso, 'dias-para-caducar': c.caduca ? diasHasta_(c.caduca) : 'sin-caducidad' };
  if (c.tipo) cifras.tipo = c.tipo;
  return { estado: caso === 'ok' ? 'bien' : (caso === 'caduca-pronto' ? 'dato' : 'mal'), cifras: cifras };
}

/* Solo lee: ¿la clave entra? Devuelve 'bien', 'caducada' (401), 'sin-permiso' (403) o 'sin-red', y en info.caduca el día de caducidad si GitHub lo dice. */
function mirarClaveEnGitHub_(clave, info) {
  const rama = PropertiesService.getScriptProperties().getProperty('GH_RAMA') || 'main';
  const url = 'https://api.github.com/repos/' + GH_USUARIO + '/' + GH_REPO + '/contents/manifiesto.json?ref=' + encodeURIComponent(rama);
  try {
    const resp = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers: cabecerasGitHub_(clave) });
    const cod = resp.getResponseCode();
    if (cod === 401) return 'caducada';
    if (cod === 403 || cod === 404) return 'sin-permiso';
    if (cod !== 200) return 'sin-red';
    info.caduca = fechaDeCaducidad_(cabeceraDe_(resp, 'github-authentication-token-expiration'));
    return 'bien';
  } catch (e) {
    return 'sin-red';
  }
}

/* Al abrir la página: como mucho una vez cada hora mira si la clave entra y cuándo caduca, y guarda el resultado. Con la clave rota prueba cada vez (no más de una por minuto),
   y si ya entra vuelve a escribir al momento: el aviso se quita al abrir la página, no al día siguiente. */
function revisarClave_(raiz, cadaMs) {
  const clave = PropertiesService.getScriptProperties().getProperty('GH_CLAVE');
  if (!clave) return;
  if (!leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'comprobaciones.json')) return;   // antes de la primera pasada no hay nada que revisar ni que crear
  const comp = leerComprob_(raiz), s = comp.subida;
  const c = s.clave = s.clave || {};
  const ahoraMs = new Date().getTime();
  const rota = s.estado === 'sin-permiso' || s.estado === 'caducada';
  if (c.mirada && ahoraMs - c.mirada < (rota ? CLAVE_ESPERA_ROTA_MS_ : cadaMs)) return;
  const info = {};
  const r = mirarClaveEnGitHub_(clave, info);
  c.mirada = ahoraMs;
  c.tipo = tipoDeClave_(clave);
  if (r === 'sin-red') { escribirComprob_(raiz, comp); return; }
  if (r === 'bien') {
    c.caduca = info.caduca || '';
    if (rota) { subirComprobaciones_(raiz, comp, true); return; }
  } else {
    s.estado = r;
    s.dia = hoyMadrid_();
  }
  escribirComprob_(raiz, comp);
}

/* ¿Toca mirar la clave? Lo usa el testigo de entrada/ para que el disparador siga arrancando aunque no llegue nada. */
function claveTocaMirar_(raiz, cadaMs) {
  if (!PropertiesService.getScriptProperties().getProperty('GH_CLAVE')) return false;
  if (!leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'comprobaciones.json')) return false;
  const s = leerComprob_(raiz).subida, c = s.clave || {};
  const rota = s.estado === 'sin-permiso' || s.estado === 'caducada';
  return !c.mirada || new Date().getTime() - c.mirada >= (rota ? CLAVE_ESPERA_ROTA_MS_ : cadaMs);
}

/* Una sola vez tras volver a funcionar: la página dice «La clave funciona» y se apaga la marca. */
function claveRecuperada_(raiz) {
  const comp = leerComprob_(raiz);
  if (!(comp.subida.clave || {}).recuperada) return false;
  comp.subida.clave.recuperada = false;
  escribirComprob_(raiz, comp);
  return true;
}

/* ==== ComprobSubir.gs ==== */
/* Subir el resultado a comprobaciones/ultima.json de este repositorio, para que lo lean las sesiones de Claude Code.
   Usuario, repositorio y rama son los del lanzador (GH_USUARIO, GH_REPO, propiedad GH_RAMA); la clave, la propiedad GH_CLAVE.
   Si GitHub dice que no, se dice en `subida` y todo lo demás sigue: subir nunca rompe una tanda. */
const COMPROB_RUTA_ = 'comprobaciones/ultima.json';
const COMPROB_ESPERA_SUBIDA_MS_ = 30 * 60 * 1000;
const COMPROB_INTENTOS_DIA_ = 3;

function contenidoUltima_(comp) {
  const r = resumenDeComprob_(comp);
  return { version: VERSION_CD, momento: ahoraMadrid_(), completo: r.completo, resumen: r.resumen, comprobaciones: r.lista };
}

/* Lo mismo, sin la hora ni los milisegundos, para saber si ha cambiado algo. */
function huellaUltima_(contenido) {
  const copia = JSON.parse(JSON.stringify(contenido));
  copia.momento = '';
  copia.comprobaciones.forEach(function (c) { c.ms = 0; c.cuando = ''; });
  return huella_(Utilities.newBlob(JSON.stringify(copia)).getBytes());
}

function cabecerasGitHub_(clave) {
  return { Authorization: 'Bearer ' + clave, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

/* Escribe el fichero. Devuelve 'bien', 'sin-permiso' (403 o 404), 'caducada' (401) o 'sin-red'; en info.caduca, el día de caducidad de la clave si GitHub lo dice. Si el fichero cambió mientras tanto (409 o 422), una vez más. */
function escribirEnGitHub_(clave, texto, mensaje, reintento, info, ruta) {
  const url = 'https://api.github.com/repos/' + GH_USUARIO + '/' + GH_REPO + '/contents/' + (ruta || COMPROB_RUTA_).split('/').map(encodeURIComponent).join('/');
  const rama = PropertiesService.getScriptProperties().getProperty('GH_RAMA') || 'main';
  try {
    const actual = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(rama), { method: 'get', muteHttpExceptions: true, headers: cabecerasGitHub_(clave) });
    const cod = actual.getResponseCode();
    if (info) info.caduca = fechaDeCaducidad_(cabeceraDe_(actual, 'github-authentication-token-expiration'));
    if (cod === 401) return 'caducada';
    if (cod === 403) return 'sin-permiso';
    const cuerpo = { message: mensaje, content: Utilities.base64Encode(Utilities.newBlob(texto).getBytes()), branch: rama };
    if (cod === 200) cuerpo.sha = JSON.parse(actual.getContentText()).sha;
    else if (cod !== 404) return 'sin-red';
    const resp = UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', payload: JSON.stringify(cuerpo), muteHttpExceptions: true, headers: cabecerasGitHub_(clave) });
    const c = resp.getResponseCode();
    if (c === 200 || c === 201) return 'bien';
    if (c === 401) return 'caducada';
    if (c === 403 || c === 404) return 'sin-permiso';
    if ((c === 409 || c === 422) && !reintento) return escribirEnGitHub_(clave, texto, mensaje, true, info, ruta);
    return 'sin-red';
  } catch (e) {
    return 'sin-red';
  }
}

/* Cuándo subir: solo si ha cambiado algo; como mucho cada 30 minutos, salvo una versión nueva o un «mal» / «error» que antes no estaba.
   Tras un «no» de GitHub no se reintenta ese día; sin red, hasta tres veces al día. `forzar` salta la espera (para las pruebas y para un arreglo). */
function subirComprobaciones_(raiz, comp, forzar) {
  const clave = PropertiesService.getScriptProperties().getProperty('GH_CLAVE');
  if (!clave) return;
  const s = comp.subida;
  const ahoraMs = new Date().getTime();
  const hoy = ahoraMadrid_().slice(0, 10);
  const contenido = contenidoUltima_(comp);
  const hash = huellaUltima_(contenido);
  const malos = contenido.comprobaciones.filter(function (c) { return c.estado === 'mal' || c.estado === 'error'; }).map(function (c) { return c.id; });
  if (hash === s.hash && s.estado === 'bien') return;
  if ((s.estado === 'sin-permiso' || s.estado === 'caducada') && s.dia === hoy && !forzar) return;
  if (s.estado === 'sin-red') {
    if (s.diaIntentos !== hoy) { s.diaIntentos = hoy; s.intentosDia = 0; }
    if (s.intentosDia >= COMPROB_INTENTOS_DIA_) return;
  }
  const urgente = s.version !== VERSION_CD || malos.some(function (id) { return (s.malos || []).indexOf(id) === -1; });
  if (!forzar && !urgente && s.ultimaMs && ahoraMs - s.ultimaMs < COMPROB_ESPERA_SUBIDA_MS_) return;
  const info = {};
  const r = escribirEnGitHub_(clave, JSON.stringify(contenido, null, 2), 'Comprobaciones con datos reales, ' + VERSION_CD, false, info);
  const estabaRota = s.estado === 'sin-permiso' || s.estado === 'caducada';
  const c = s.clave = s.clave || {};
  c.mirada = ahoraMs;
  c.tipo = tipoDeClave_(clave);
  if (r === 'bien' || r === 'sin-permiso') c.caduca = info.caduca || '';
  if (estabaRota && r === 'bien') c.recuperada = true;
  s.ultimaMs = ahoraMs;
  s.estado = r;
  s.dia = hoy;
  if (r === 'bien') { s.hash = hash; s.version = VERSION_CD; s.malos = malos; }
  if (r === 'sin-red') { s.diaIntentos = hoy; s.intentosDia = (s.diaIntentos === hoy ? s.intentosDia : 0) + 1; }
  escribirComprob_(raiz, comp);
  try { escribirEstadoHechos_(raiz); } catch (e) { /* informativo */ }
}

/* ==== Recolocar.gs ==== */
/* Recolocar, una sola vez y sin borrar nada, todo lo que se guardó antes de la ficha.
   Solo se mueven y se renombran ficheros: el id de Drive de cada uno no cambia.
   El avance vive en _interno/recolocar.json: { empezado, total, hechos, sitio, sinClasificar, terminado, pendientes: [ { idDrive, nombre, fecha, quien, via, claveAntes, fichaAntes } ] }. */
const RECOLOCAR_TOPE_PAGINA_MS_ = 20 * 1000;
const MENSAJE_RECOLOCANDO_ = 'Estoy recolocando lo que ya había guardado. Prueba dentro de un minuto.';

function leerRecolocar_(raiz) {
  return leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'recolocar.json');
}

function escribirRecolocar_(raiz, estado) {
  escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), 'recolocar.json', estado);
}

/* ¿Hay un repaso sin acabar? Es lo que miran las subidas para decir «prueba dentro de un minuto». */
function estaRecolocando_(raiz) {
  const est = leerRecolocar_(raiz);
  if (est) return !est.terminado;
  return !!leerIndice_(raiz).ocupado;
}

/* «20261008-213912» → «2026-10-08T21:39:12+02:00» (el desfase es el de esa fecha) */
function isoDePrefijo_(m) {
  const adivinado = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6] + ahoraMadrid_(adivinado).slice(-6);
}

function recorrerFicheros_(carpeta, accion) {
  const f = carpeta.getFiles();
  while (f.hasNext()) accion(f.next());
  const c = carpeta.getFolders();
  while (c.hasNext()) recorrerFicheros_(c.next(), accion);
}

/* Quién subió un fichero de anteriores/: el movimiento «guardado» con su nombre más cercano a su fecha. */
function quienSubio_(movimientos, nombre, fecha) {
  const t = new Date(fecha).getTime();
  let mejor = null, dist = Infinity;
  movimientos.forEach(function (m) {
    if (m.fichero !== nombre || m.que !== 'guardado') return;
    const d = Math.abs(new Date(m.cuando).getTime() - t);
    if (d < dist) { dist = d; mejor = m; }
  });
  return mejor ? { quien: mejor.quien || 'recolocado', via: mejor.via || 'recolocado' } : { quien: 'recolocado', via: 'recolocado' };
}

/* Hace la lista de lo que hay que repasar, guarda una copia del índice y lo vacía. Una sola vez. */
function prepararRecolocar_(raiz, indice) {
  const interno = subcarpetaPorRuta_(raiz, '_interno');
  interno.createFile('indice-antes-de-recolocar.json', JSON.stringify(indice, null, 2), 'application/json');
  const movimientos = leerMovimientos_(raiz);
  const lista = [];
  indice.listados.forEach(function (e) {
    if (e.porAlumno) return;
    lista.push({ idDrive: e.idDrive, nombre: e.fichero, fecha: e.subido, quien: e.subidoPor || 'recolocado', via: e.via || 'recolocado', vigente: 1,
      claveAntes: e.clave, fichaAntes: { cursoEscolar: e.cursoEscolar || '', ambito: e.ambito || '' } });
  });
  const anteriores = raiz.getFoldersByName('anteriores');
  if (anteriores.hasNext()) {
    recorrerFicheros_(anteriores.next(), function (f) {
      const m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d) (.*)$/.exec(f.getName());
      const fecha = m ? isoDePrefijo_(m) : ahoraMadrid_(f.getDateCreated());
      const nombre = m ? m[7] : f.getName();
      const q = quienSubio_(movimientos, nombre, fecha);
      lista.push({ idDrive: f.getId(), nombre: nombre, fecha: fecha, quien: q.quien, via: q.via, vigente: 0 });
    });
  }
  /* De la más vieja a la más nueva; a la misma hora, primero los anteriores. */
  lista.sort(function (a, b) { return (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) || (a.vigente - b.vigente); });
  lista.forEach(function (p) { delete p.vigente; });
  const est = { empezado: ahoraMadrid_(), total: lista.length, hechos: 0, sitio: 0, sinClasificar: 0, terminado: false, pendientes: lista };
  escribirRecolocar_(raiz, est);
  indice.listados = [];
  escribirIndice_(raiz, indice);
  return est;
}

function moverARepetidos_(raiz, fichero, nombre, fecha) {
  fichero.moveTo(subcarpetaPorRuta_(raiz, '_interno/repetidos'));
  fichero.setName(prefijoFecha_(fecha) + ' ' + nombreLimpio_(nombre));
}

/* Un fichero que sigue sin ficha completa: a «Sin clasificar», con su fecha y lo que sí se sabe. */
function ponerEnSinClasificarRecolocando_(raiz, fichero, p, bytes, rec) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = leerPendientes_(raiz);
    const h = huella_(bytes);
    if (lista.pendientes.some(function (x) { return x.idDrive === p.idDrive; })) return 'sinClasificar';
    if (lista.pendientes.some(function (x) { return x.huella === h; })) { moverARepetidos_(raiz, fichero, p.nombre, p.fecha); return 'repetido'; }
    const limpio = nombreLimpio_(p.nombre);
    fichero.moveTo(subcarpetaPorRuta_(raiz, 'sin-clasificar'));
    fichero.setName(prefijoFecha_(p.fecha) + ' ' + limpio);
    lista.pendientes.push({ id: idPendiente_(h), fichero: limpio, idDrive: p.idDrive, llegado: p.fecha, llegadoPor: p.quien, via: p.via, bytes: bytes.length, huella: h,
      tipo: rec.tipo, titulos: rec.titulos || [], clave: rec.clave, ficha: rec.ficha, falta: rec.falta, propuesta: rec.propuesta || {}, motivo: rec.motivo });
    escribirPendientes_(raiz, lista);
    return 'sinClasificar';
  } finally {
    lock.releaseLock();
  }
}

/* Repasa un fichero. Devuelve 'sitio' | 'sinClasificar' | 'repetido' | 'perdido'. */
function recolocarUno_(raiz, p) {
  let fichero;
  try { fichero = DriveApp.getFileById(p.idDrive); } catch (e) { return 'perdido'; }
  if (fichero.isTrashed && fichero.isTrashed()) return 'perdido';
  const bytes = fichero.getBlob().getBytes();
  const rec = reconocerFichero_(p.nombre, bytes, { cursoElegido: '' });
  /* Lo que Francisco ya contestó no se le vuelve a preguntar: el vigente hereda lo que el fichero no dice. */
  if (rec.clave && p.fichaAntes && rec.clave === p.claveAntes) {
    rec.falta = rec.falta.filter(function (campo) {
      if (!p.fichaAntes[campo]) return true;
      rec.ficha[campo] = p.fichaAntes[campo];
      return false;
    });
    if (!rec.falta.length) rec.motivo = '';
  }
  if (!(rec.clave && !rec.falta.length)) return ponerEnSinClasificarRecolocando_(raiz, fichero, p, bytes, rec);
  rec.variante = varianteDeFicha_(rec.ficha);
  const previo = buscarEnIndice_(leerIndice_(raiz), rec.clave, rec.variante);
  if (previo && previo.idDrive === p.idDrive) return 'sitio';
  if (previo && previo.huella === huella_(bytes)) { moverARepetidos_(raiz, fichero, p.nombre, p.fecha); return 'repetido'; }
  const r = guardarListado_(p.nombre, bytes, rec, p.quien, p.via, { fichero: fichero, llegado: p.fecha, sinRegistro: true });
  return r.estado === 'guardado' ? 'sitio' : 'repetido';
}

function frasePlural_(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

/* Si toca, prepara y avanza hasta `topeMs` (como mínimo un fichero por llamada).
   Devuelve { hechos, total } mientras quede algo, y null si no hay nada que hacer o ya ha terminado. */
function recolocarSiToca_(raiz, topeMs) {
  let est = leerRecolocar_(raiz);
  if (est && est.terminado) return null;
  if (!est) {
    const indice = leerIndice_(raiz);
    if (!indice.ocupado || indice.contrato < 2) return null;
    est = prepararRecolocar_(raiz, indice);
  }
  const inicio = new Date().getTime();
  while (est.pendientes.length) {
    const p = est.pendientes[0];
    const que = recolocarUno_(raiz, p);
    est.pendientes.shift();
    est.hechos++;
    if (que === 'sitio') est.sitio++;
    else if (que === 'sinClasificar') est.sinClasificar++;
    escribirRecolocar_(raiz, est);
    if (new Date().getTime() - inicio >= topeMs) break;
  }
  if (est.pendientes.length) return { hechos: est.hechos, total: est.total };
  /* Lo último: el índice libre y el resumen. */
  est.terminado = true;
  escribirRecolocar_(raiz, est);
  const indice = leerIndice_(raiz);
  indice.ocupado = false;
  escribirIndice_(raiz, indice);
  apuntarMovimiento_(raiz, { quien: 'recolocado', via: 'recolocado', fichero: '', que: 'guardado',
    mensaje: 'Recolocado lo que ya había: ' + frasePlural_(est.sitio, 'fichero', 'ficheros') + ' en su sitio y ' + est.sinClasificar + ' en «Sin clasificar».' });
  return null;
}

/* ==== Reparar.gs ==== */
/* Fila 34: las entradas del índice cuyo fichero ya no está en listados/. Se mira una vez por versión (y la comprobación `indice-y-carpetas` vigila el resto).
   Nada se borra. Un fichero en otra carpeta de la carpeta de datos o en la papelera de Drive vuelve a su sitio. Si no está en ningún sitio, la entrada queda
   marcada con `faltaFichero` ({ desde: fecha del fichero que falta }) y, si hay un anterior en anteriores/, ese pasa a ser el vigente.
   La marca se va sola cuando se suelta otra vez el listado (la entrada nueva no la lleva) o cuando el fichero reaparece.
   El resumen vive en _interno/reparar-indice.json: { version, cuando, movidos, papelera, anterior, sinAnterior } (cuántas entradas se arreglaron de cada manera). */
const ARCHIVO_REPARAR_ = 'reparar-indice.json';
const COPIA_REPARAR_ = 'indice-antes-de-la-fila-34.json';
const CARPETAS_QUE_NO_SE_TOCAN_ = ['descartados', 'repetidos', 'sin-clasificar'];

function leerReparar_(raiz) {
  return leerJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_REPARAR_);
}

function carpetaDeRutaEntrada_(raiz, ruta) {
  const t = String(ruta).split('/');
  t.pop();
  return subcarpetaPorRuta_(raiz, t.join('/'));
}

/* ¿Está el fichero en una carpeta donde lo dejó una decisión de Francisco o de la aplicación? Si Drive no dice dónde está, no. */
function enCarpetaApartada_(f) {
  try {
    if (typeof f.getParents !== 'function') return false;
    const p = f.getParents();
    while (p.hasNext()) if (CARPETAS_QUE_NO_SE_TOCAN_.indexOf(p.next().getName()) !== -1) return true;
  } catch (e) { /* sin saberlo, se trata como un fichero normal */ }
  return false;
}

/* El anterior más reciente de una entrada, o null. */
function anteriorDeEntrada_(raiz, e) {
  const it = subcarpetaPorRuta_(raiz, rutaDeListado_('anteriores', e.clave, e.variante)).getFiles();
  let mejor = null;
  while (it.hasNext()) {
    const f = it.next(), m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d) (.*)$/.exec(f.getName());
    if (!m || (f.isTrashed && f.isTrashed())) continue;
    const orden = m.slice(1, 7).join('');
    if (!mejor || orden > mejor.orden) mejor = { f: f, orden: orden, fecha: isoDePrefijo_(m), nombre: m[7] };
  }
  return mejor;
}

/* El anterior pasa a ser el vigente de la entrada (la misma entrada, con sus datos nuevos). */
function ponerAnteriorDeVigente_(raiz, e, a) {
  const bytes = a.f.getBlob().getBytes();
  const cuenta = contarListado_(entradaCatalogo_(e.clave), bytes, e.tipo);
  const limpio = nombreLimpio_(a.nombre);
  const q = quienSubio_(leerMovimientos_(raiz), a.nombre, a.fecha);
  const desde = e.subido;
  a.f.moveTo(carpetaDeRutaEntrada_(raiz, e.ruta));
  a.f.setName(limpio);
  e.ruta = e.ruta.replace(/[^\/]*$/, limpio);
  Object.assign(e, { fichero: limpio, idDrive: a.f.getId(), subido: a.fecha, subidoPor: q.quien, via: q.via, bytes: bytes.length, filas: cuenta.filas, resumen: cuenta.resumen,
    huella: huella_(bytes), anteriores: Math.max(0, (e.anteriores || 1) - 1), faltaFichero: { desde: desde } });
}

/* Mira cada entrada de listados/ cuyo fichero no está en listados/. Devuelve el resumen, o null si no había nada que mirar o ya se hizo con esta versión. */
function repararFaltantes_(raiz, forzar) {
  const previo = leerReparar_(raiz);
  if (!forzar && previo && previo.version === VERSION_CD) return null;
  try { rellenarIds_(raiz); } catch (x) { /* sin ids rellenos se mira por ruta */ }
  const indice = leerIndice_(raiz);
  if (indice.ocupado) return null;
  const estan = {};
  cmpIdsDeFicheros_(subcarpetaPorRuta_(raiz, 'listados'), []).forEach(function (id) { estan[id] = true; });
  const pendientes = {};
  leerPendientes_(raiz).pendientes.forEach(function (p) { if (p.idDrive) pendientes[p.idDrive] = true; });
  const res = { version: VERSION_CD, cuando: ahoraMadrid_(), movidos: 0, papelera: 0, anterior: 0, sinAnterior: 0 };
  let cambia = false;
  const faltan = indice.listados.filter(function (e) { return !e.porAlumno && !estan[e.idDrive]; });
  if (faltan.length && !subcarpetaPorRuta_(raiz, '_interno').getFilesByName(COPIA_REPARAR_).hasNext()) subcarpetaPorRuta_(raiz, '_interno').createFile(COPIA_REPARAR_, JSON.stringify(indice, null, 2), 'application/json');
  indice.listados.forEach(function (e) {
    if (e.porAlumno) return;
    if (estan[e.idDrive]) { if (e.faltaFichero && !e.faltaFichero.desde) { delete e.faltaFichero; cambia = true; } return; }
    let f = null;
    if (!pendientes[e.idDrive]) { try { f = ficheroDeEntrada_(e); } catch (x) { f = null; } }
    if (f && !enCarpetaApartada_(f)) {
      const estabaEnPapelera = !!(f.isTrashed && f.isTrashed());
      if (estabaEnPapelera) f.setTrashed(false);
      f.moveTo(carpetaDeRutaEntrada_(raiz, e.ruta));
      if (f.getName() !== e.fichero) f.setName(e.fichero);
      if (e.faltaFichero) delete e.faltaFichero;
      res[estabaEnPapelera ? 'papelera' : 'movidos']++;
      cambia = true;
      return;
    }
    if (e.faltaFichero) return;   // ya se decidió; el vigente es el que hay
    const a = anteriorDeEntrada_(raiz, e);
    if (a) { ponerAnteriorDeVigente_(raiz, e, a); res.anterior++; } else { e.faltaFichero = { desde: e.subido }; res.sinAnterior++; }
    cambia = true;
  });
  if (cambia) escribirIndice_(raiz, indice);   // el índice, lo último
  escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), ARCHIVO_REPARAR_, res);
  return res;
}

/* Las entradas con aviso de «falta el fichero»: [{ e, titulo, desde }]. */
function entradasSinFichero_(indice) {
  return indice.listados.filter(function (e) { return !e.porAlumno && e.faltaFichero; });
}

/* Una línea por entrada, en el mismo formato que los avisos de los datos ya hechos (Avisos.gs). */
function avisosDeFicherosQueFaltan_(indice) {
  return entradasSinFichero_(indice).map(function (e) {
    const c = entradaCatalogo_(e.clave) || { titulo: e.titulo || e.clave };
    const partes = [c.titulo];
    if (e.ambito) partes.push(textoAmbito_(e.clave, e.ambito));
    if (e.periodo) partes.push(textoPeriodo_(e.periodo));
    if (e.cursoEscolar) partes.push(e.cursoEscolar);
    const aviso = { tipo: 'listado-sin-fichero', id: null, datos: { listado: partes.join(' · '), fecha: fechaLegible_(e.faltaFichero.desde).split(' ')[0] } };
    const f = frasePlanaDeAviso_(aviso);
    return { huella: huellaDeAviso_('listados', e.ruta, aviso), conjunto: 'listados', donde: 'Listados · ' + aviso.datos.listado, tipo: aviso.tipo, quien: aviso.datos.listado, que: f.texto, conocida: f.conocida };
  });
}

/* ==== HechosLibros.gs ==== */
/* El conjunto `libros` (fila 37): los libros de texto de cada nivel y asignatura, una parte por curso con todos los niveles juntos. Sin datos de personas.
   Lo leído vive en _interno/leido/; la parte, en hecho/libros/<curso>/curso.json. */

const LIBROS_COLUMNAS_NECESARIAS_ = ['Materia', 'ISBN/EAN', 'Editorial', 'Título'];

/* El lector: guarda los títulos tal como vienen y, de cada fila con `Materia`, todas sus casillas (sin decidir nada). Un fichero que no sirve queda dicho en `problema`.
   { lector, clave, variante, huella, titulos, filas: [[casilla…]], sinMateria, problema: '' | 'vacio' | 'ilegible' | 'faltan-columnas' } */
function leerLibros_(bytes, fuente, huella, conj, entrada) {
  const salida = { lector: fuente.versionLector, clave: fuente.clave, variante: entrada.variante || '', huella: huella, titulos: [], filas: [], sinMateria: 0, problema: '' };
  let tabla = [];
  try { const texto = bytesATexto_(bytes); tabla = leerCsv_(texto, detectarSeparador_(texto)); } catch (e) { salida.problema = 'ilegible'; return salida; }
  if (tabla.length < 2) { salida.problema = 'vacio'; return salida; }
  salida.titulos = tabla[0].map(function (t) { return String(t).trim(); });
  const tn = salida.titulos.map(normalizarTitulo_);
  if (LIBROS_COLUMNAS_NECESARIAS_.some(function (t) { return tn.indexOf(normalizarTitulo_(t)) === -1; })) { salida.problema = 'faltan-columnas'; return salida; }
  const iMateria = tn.indexOf('materia');
  for (let f = 1; f < tabla.length; f++) {
    const celdas = salida.titulos.map(function (t, j) { return String(tabla[f][j] === undefined ? '' : tabla[f][j]).trim(); });
    if (!celdas.some(function (c) { return c; })) continue;
    if (!celdas[iMateria]) { salida.sinMateria++; continue; }
    salida.filas.push(celdas);
  }
  return salida;
}

function frasesDeFicheroLibros_(l, nivelTexto) {
  const de = ' de libros de ' + nivelTexto;
  if (l.problema === 'vacio') return ['El listado' + de + ' está vacío.'];
  if (l.problema === 'ilegible') return ['No se ha podido leer el listado' + de + '.'];
  if (l.problema === 'faltan-columnas') return ['Al listado' + de + ' le falta una columna necesaria y no se ha usado.'];
  return l.sinMateria ? ['El listado' + de + ' trae ' + (l.sinMateria === 1 ? 'una fila sin asignatura.' : l.sinMateria + ' filas sin asignatura.')] : [];
}

/* La identificación de un libro: nivel, asignatura (sin tildes, en minúsculas) e ISBN (sin espacios ni guiones). */
function idDeLibro_(nivel, materia, isbn) {
  return nivel + '~' + normalizarTitulo_(materia) + '~' + String(isbn || '').replace(/[\s\-]/g, '');
}

/* Las filas de un fichero ya leído: { v, celdas, malos } con los datos interpretados por la tabla de campos; `malos` = columnas con un número o un Sí/No que no se entiende. */
function filasDeLibros_(conj, leido) {
  const tn = leido.titulos.map(normalizarTitulo_);
  const simples = conj.campos.filter(function (c) { return c.col; }).map(function (c) {
    return { clave: c.clave, tipo: c.tipo, idx: tn.indexOf(normalizarTitulo_(c.col[0])), titulo: c.col[0] };
  });
  return leido.filas.map(function (celdas) {
    const v = {}, malos = [];
    simples.forEach(function (c) {
      if (c.idx === -1 || !celdas[c.idx]) return;
      const x = convertirValorHecho_(celdas[c.idx], c.tipo);
      if (x !== null) v[c.clave] = x; else if (c.tipo === 'numero' || c.tipo === 'si-no') malos.push(leido.titulos[c.idx]);
    });
    const cs = [];
    leido.titulos.forEach(function (t, j) { if (t && celdas[j]) cs.push({ columna: t, valor: celdas[j] }); });
    return { v: v, celdas: cs, malos: malos };
  });
}

function ordenDeNivelLibros_(nivel) {
  const i = AMBITOS_LIBROS_.map(function (n) { return n.valor; }).indexOf(nivel);
  return i === -1 ? 99 : i;
}

/* La parte de un curso. `fuentes` = [{ leido, entrada }], uno por nivel. Cada registro es { id, datos } (sin `matriculado`). */
function montarLibros_(conj, parte, fuentes) {
  const avisos = [], columnas = {}, porId = {}, orden = [];
  fuentes.forEach(function (f) {
    const nivel = f.entrada.ambito || listadoDeVariante_(f.entrada.variante), texto = textoAmbito_('libros', nivel);
    columnas[nivel] = f.leido.titulos;
    frasesDeFicheroLibros_(f.leido, texto).forEach(function (d) { avisos.push({ tipo: 'libros-fichero', id: null, datos: { nivel: texto, detalle: d } }); });
    if (f.leido.problema) return;
    filasDeLibros_(conj, f.leido).forEach(function (fila) {
      const id = idDeLibro_(nivel, fila.v.materia, fila.v.isbn);
      const datos = { nivel: nivel, nivelTexto: texto, conLibro: !!(fila.v.isbn || fila.v.titulo) };
      conj.campos.forEach(function (c) { if (c.col && fila.v[c.clave] !== undefined) datos[c.clave] = fila.v[c.clave]; });
      if (fila.celdas.length) datos.celdas = fila.celdas;
      fila.malos.forEach(function (col) { avisos.push({ tipo: 'libros-dato', id: id, datos: { materia: fila.v.materia, nivel: texto, columna: col } }); });
      if (porId[id]) avisos.push({ tipo: 'libros-repetido', id: id, datos: { materia: fila.v.materia, nivel: texto } }); else orden.push(id);
      porId[id] = { id: id, datos: datos };
    });
  });
  const registros = orden.map(function (id) { return porId[id]; });
  registros.sort(function (a, b) { return (ordenDeNivelLibros_(a.datos.nivel) - ordenDeNivelLibros_(b.datos.nivel)) || (a.id < b.id ? -1 : 1); });
  return { acuerdoHecho: conj.acuerdoHecho, conjunto: conj.conjunto, parte: parte.parte, cursoEscolar: parte.cursoEscolar, generado: ahoraMadrid_(), origen: DUENO_CD_,
    columnasLibros: columnas, campos: camposPublicos_(conj, false), registros: registros, avisos: avisos };
}

/* La tarea «montar» de una parte de libros: carga lo leído de los listados de su curso, la monta, la escribe y apunta el índice y las cifras que dice la página. */
function montarParteDeLibros_(raiz, t, avance, cache) {
  const t0 = new Date().getTime();
  const fuentes = [];
  for (let i = 0; i < t.necesarias.length; i++) {
    const x = t.necesarias[i];
    if (x.entrada.cursoEscolar !== t.parte.cursoEscolar) continue;
    const leido = cargarLeido_(raiz, x.k);
    if (!leido || !avance.leidos[x.k] || leido.huella !== avance.leidos[x.k].huella) { delete avance.leidos[x.k]; return; }
    fuentes.push({ leido: leido, entrada: x.entrada });
  }
  const objeto = montarLibros_(t.conj, t.parte, fuentes);
  avance.libros = avance.libros || {};
  avance.libros[t.ruta] = cifrasDeLibros_(objeto);
  cerrarMontaje_(raiz, t, avance, objeto, t0);
}

/* { libros: registros con libro, niveles: niveles distintos } de una parte. */
function cifrasDeLibros_(objeto) {
  const niveles = {};
  objeto.registros.forEach(function (r) { niveles[r.datos.nivel] = true; });
  return { libros: objeto.registros.filter(function (r) { return r.datos.conLibro; }).length, niveles: Object.keys(niveles).length };
}

/* Lo que dice la página de los libros: el curso de hoy y, si no tiene parte, el más reciente que la tenga. Solo cifras y cursos. */
function resumenLibrosParaPagina_(partes, avance) {
  const cursos = partes.slice().sort(function (a, b) { return ordenDeCurso_(b.cursoEscolar) - ordenDeCurso_(a.cursoEscolar); });
  const p = cursos.filter(function (x) { return x.cursoEscolar === cursoActual_(); })[0] || cursos[0];
  const k = p && (avance.libros || {})[p.ruta];
  return p && k ? { cursoEscolar: p.cursoEscolar, libros: k.libros, niveles: k.niveles, masCursos: cursos.length - 1 } : null;
}

/* ==== ComprobLibros.gs ==== */
/* Las comprobaciones de los libros de texto (fila 37). Solo leen y solo cuentan: ni una asignatura, ni un título, ni un ISBN sale de aquí. */

/* Las partes de libros, abiertas, y lo leído de sus listados, por curso. null si no hay ninguna parte. */
function cmpDatosLibros_(ctx) {
  const partes = (ctx.indice.hechos || []).filter(function (h) { return h.conjunto === 'libros'; });
  if (!partes.length) return null;
  return partes.map(function (h) {
    const leidos = Object.keys(ctx.avance.leidos).filter(function (k) { return k.indexOf('libros/' + h.cursoEscolar + '/') === 0; })
      .map(function (k) { return cargarLeido_(ctx.raiz, k); }).filter(function (l) { return !!l; });
    return { h: h, p: cmpAbrirParte_(ctx, h), leidos: leidos };
  });
}

/* Por curso: filas leídas = registros + filas repetidas, y ninguna fila con asignatura se pierde. */
function cmpLibrosLectura_(ctx) {
  const d = cmpDatosLibros_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { cursos: 0 } };
  let malos = 0, filas = 0, registros = 0, repetidas = 0, sinAsignatura = 0, niveles = 0;
  d.forEach(function (c) {
    if (!c.p) { malos++; return; }
    const usables = c.leidos.filter(function (l) { return !l.problema; });
    const delCurso = usables.reduce(function (n, l) { return n + l.filas.length; }, 0);
    const rep = c.p.obj.avisos.filter(function (a) { return a.tipo === 'libros-repetido'; }).length;
    filas += delCurso; registros += c.p.obj.registros.length; repetidas += rep;
    sinAsignatura += c.leidos.reduce(function (n, l) { return n + (l.sinMateria || 0); }, 0);
    niveles += c.leidos.length;
    if (delCurso !== c.p.obj.registros.length + rep) malos++;
  });
  return { estado: malos ? 'mal' : 'dato', cifras: { cursos: d.length, niveles: niveles, filas: filas, registros: registros, repetidas: repetidas, 'filas-sin-asignatura': sinAsignatura, 'cursos-que-no-cuadran': malos } };
}

/* Ningún id repetido en una parte. */
function cmpLibrosUnaFicha_(ctx) {
  const d = cmpDatosLibros_(ctx);
  if (!d) return { estado: 'sin datos', cifras: { cursos: 0 } };
  let malos = 0, registros = 0;
  d.forEach(function (c) {
    if (!c.p) { malos++; return; }
    const vistos = {};
    c.p.obj.registros.forEach(function (r) { registros++; if (!r.id || vistos[r.id]) malos++; vistos[r.id] = true; });
  });
  return { estado: malos ? 'mal' : 'bien', cifras: { cursos: d.length, registros: registros, 'repetidos-o-vacios': malos } };
}

/* ==== Fondo.gs ==== */
/* La vuelta de fondo (fila 66): lo que antes se hacía al abrir la pantalla antigua y ahora se hace solo, cada vez que el disparador de 10 minutos arranca recogerEntrada_.
   Lo que se hizo y cuándo queda en _interno/fondo.json, solo con marcas de tiempo: lo lee la comprobación `antigua-sin-pantalla`. */
const FONDO_TOPE_MS_ = 20 * 1000;
const FONDO_HUECO_MAX_MS_ = 24 * 3600 * 1000;
const FONDO_VUELTA_CADA_MS_ = 3600 * 1000;
const NOMBRE_FONDO_ = '_fondo.txt';
const TEXTO_FONDO_ = 'Esto no es un listado: es el aviso que hace que el disparador de 10 minutos arranque aunque no llegue nada. Lo deja el Centro de datos y no se quita.';
const FONDO_COSAS_ = ['vuelta', 'expedientes', 'cursos', 'consejo', 'clave', 'tanda'];

function leerFondo_(raiz) {
  const a = leerJson_(subcarpetaPorRuta_(raiz, '_interno'), 'fondo.json');
  return Object.assign({ cosas: {}, sigue: false, disparador: false, hueco: 0 }, a || {});
}

function escribirFondo_(raiz, fondo) { escribirJson_(subcarpetaPorRuta_(raiz, '_interno'), 'fondo.json', fondo); }

/* El testigo de la vuelta de fondo: un fichero que siempre está en entrada/. Sin él, el lanzador (que no se toca) vería la carpeta vacía y no arrancaría nada: ni comprobaciones, ni la clave, ni los repasos. */
function asegurarTestigoFondo_(raiz) {
  const entrada = subcarpetaPorRuta_(raiz, 'entrada');
  if (!entrada.getFilesByName(NOMBRE_FONDO_).hasNext()) entrada.createFile(NOMBRE_FONDO_, TEXTO_FONDO_, 'text/plain');
}

/* ¿Existe el disparador de 10 minutos? Fuera de Apps Script (no hay ScriptApp) se fía de lo apuntado. */
function hayDisparador_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'recogerEntradaProgramada'; });
}

/* Lo que la pantalla antigua hacía al abrirse, con como mucho FONDO_TOPE_MS_ cada cosa. Nada de esto rompe la vuelta. Devuelve { hecho: [cosas], sigue }. */
function vueltaDeFondo_(raiz) {
  const hecho = [];
  let sigue = false;
  try { asegurarDisparador_(); } catch (e) { /* si no se puede crear, la comprobación lo dice */ }
  try { revisarClave_(raiz, CLAVE_MIRAR_PAGINA_MS_); hecho.push('clave'); } catch (e) { /* mirar la clave nunca rompe la vuelta */ }
  try { sigue = colocarExpedientes_(raiz, FONDO_TOPE_MS_) || sigue; hecho.push('expedientes'); } catch (e) { /* se reintenta en la próxima vuelta */ }
  try { sigue = repasarCursos_(raiz, FONDO_TOPE_MS_) || sigue; hecho.push('cursos'); } catch (e) { /* idem */ }
  try { sigue = repasarConsejo_(raiz, FONDO_TOPE_MS_) || sigue; hecho.push('consejo'); } catch (e) { /* idem */ }
  return { hecho: hecho, sigue: !!sigue };
}

/* Al acabar la vuelta: apunta qué se hizo y cuándo, y cuánto pasó desde la vuelta anterior. `tanda` dice si también hubo una tanda de datos ya hechos. */
function cerrarFondo_(raiz, vuelta, tanda) {
  const fondo = leerFondo_(raiz), ahora = new Date().getTime();
  const antes = fondo.cosas.vuelta || 0;
  fondo.hueco = antes ? ahora - antes : 0;
  vuelta.hecho.concat(['vuelta'], tanda ? ['tanda'] : []).forEach(function (c) { fondo.cosas[c] = ahora; });
  fondo.sigue = vuelta.sigue;
  try { fondo.disparador = hayDisparador_(); } catch (e) { fondo.disparador = false; }
  fondo.version = VERSION_CD;
  escribirFondo_(raiz, fondo);
}

/* ¿Hay comprobaciones por hacer que justifiquen una vuelta? Las «sin datos» (que se repiten cada 10 minutos en cuanto hay una vuelta) no: bastan las de cada 6 horas. */
function comprobacionesPorHacerFondo_(raiz) {
  const comp = leerComprob_(raiz), ahora = new Date().getTime();
  const toca = COMPROBACIONES_.some(function (c) {
    const r = comp.resultados[c.id];
    return !r || r.estado === 'sin tiempo' || r.hechaCon !== VERSION_CD || ahora - new Date(r.cuando).getTime() > COMPROB_VIGENCIA_MS_;
  });
  return toca || diagToca_(comp, leerIndice_(raiz), false);
}

/* ¿Toca una vuelta de fondo entera? Sí si quedaba algo, si hay comprobaciones que repetir, si toca mirar la clave o si hace más de una hora que no se hace. Si no, la vuelta del disparador sale enseguida. */
function fondoPendiente_(raiz) {
  const f = leerFondo_(raiz);
  return !!f.sigue || new Date().getTime() - (f.cosas.vuelta || 0) >= FONDO_VUELTA_CADA_MS_ || comprobacionesPorHacerFondo_(raiz) || claveTocaMirar_(raiz, CLAVE_MIRAR_PAGINA_MS_);
}

/* `antigua-sin-pantalla`: solo cifras. `mal` si el disparador no existe o si pasó más de un día entre dos vueltas. */
function cmpAntiguaSinPantalla_(ctx) {
  const f = leerFondo_(ctx.raiz), ahora = ctx.ahoraMs;
  if (!f.cosas.vuelta) return { estado: 'sin datos', cifras: { 'vueltas-apuntadas': false } };
  const reciente = function (ms) { return !!ms && ahora - ms <= FONDO_HUECO_MAX_MS_; };
  const hechas = FONDO_COSAS_.filter(function (c) { return reciente(f.cosas[c]); }).length;
  const comp = ctx.comp, s = comp.subida || {};
  const comprobadas = COMPROBACIONES_.filter(function (c) { const r = comp.resultados[c.id]; return r && reciente(new Date(r.cuando).getTime()); }).length;
  let disparador = f.disparador;
  try { disparador = hayDisparador_(); } catch (e) { /* fuera de Apps Script: lo apuntado */ }
  const hueco = Math.round(f.hueco / 3600000);
  return {
    estado: disparador && f.hueco <= FONDO_HUECO_MAX_MS_ ? 'bien' : 'mal',
    cifras: { 'cosas-de-fondo-24h': hechas, 'cosas-de-fondo': FONDO_COSAS_.length, 'comprobaciones-24h': comprobadas, 'subida-24h': reciente(s.ultimaMs) ? 1 : 0, disparador: !!disparador, 'horas-entre-vueltas': hueco, sigue: !!f.sigue }
  };
}

/* ==== Entrada.gs ==== */
/* El buzón entrada/: lo que se deja ahí se recoge como si se hubiera soltado en la página. */
const ENTRADA_TOPE_MS_ = 4 * 60 * 1000;   // a los 4 minutos se para y se sigue en la próxima vuelta

/* ¿Hay algo en entrada/ que haya llegado? El testigo de las tandas (HechosTandas.gs) no cuenta. */
function hayEntrada_(raiz) {
  const it = raiz.getFoldersByName('entrada');
  if (!it.hasNext()) return false;
  const fs = it.next().getFiles();
  while (fs.hasNext()) if (!esTemporalDeEntrada_(fs.next().getName())) return true;
  return false;
}

/* Lo que no es un fichero para recoger: el testigo de las tandas y los temporales `.crswap` que escribe el navegador mientras guarda (el fichero entero aparece con su nombre al terminar). */
function esTemporalDeEntrada_(nombre) { return nombre === NOMBRE_TESTIGO_ || nombre === NOMBRE_FONDO_ || /\.crswap$/i.test(nombre); }

function origenDeEntrada_(fichero, bytes) {
  if (/\.json$/i.test(fichero.getName())) {
    try {
      const o = JSON.parse(bytesATexto_(bytes)).origen;
      if (o && typeof o === 'string') return o;
    } catch (e) { /* no es un JSON con origen */ }
  }
  try { return fichero.getOwner().getEmail() || 'entrada'; } catch (e) { return 'entrada'; }
}

/* `ctx` solo llega cuando la arranca el disparador (correo: 'entrada'): entonces, al acabar, sigue con una tanda de los datos ya hechos. */
function recogerEntrada_(ctx) {
  const raiz = carpetaDatos_();
  const entrada = subcarpetaPorRuta_(raiz, 'entrada');
  ponerAlDia_(raiz);
  const deFondo = !!(ctx && ctx.correo === 'entrada');   // la arranca el disparador: sin pantalla antigua, también hace la vuelta de fondo (Fondo.gs)
  if (recolocarSiToca_(raiz, ENTRADA_TOPE_MS_) || repasarAdmision_(raiz, ENTRADA_TOPE_MS_)) {   // primero se termina de recolocar
    if (deFondo) ajustarTestigo_(raiz, true);   // sin pantalla que lo siga, el disparador tiene que volver
    return 0;
  }
  /* Sin ficheros, sin testigo de tandas y sin nada de fondo que hacer, no hay nada más que mirar (el disparador arranca cada 10 minutos). */
  if (deFondo && !hayEntrada_(raiz) && !testigoDe_(raiz) && !fondoPendiente_(raiz)) return 0;
  const vuelta = deFondo ? vueltaDeFondo_(raiz) : null;
  try { limpiarSubidas_(raiz); } catch (e) { /* se reintenta en la próxima vuelta */ }
  try { repararFaltantes_(raiz, false); } catch (e) { /* se reintenta en la próxima vuelta */ }
  const ficheros = [];
  const it = entrada.getFiles();
  while (it.hasNext()) ficheros.push(it.next());
  const inicio = new Date().getTime();
  let recogidos = 0;
  for (let i = 0; i < ficheros.length; i++) {
    if (new Date().getTime() - inicio > ENTRADA_TOPE_MS_) break;
    const f = ficheros[i];
    if (esTemporalDeEntrada_(f.getName())) continue;
    const bytes = f.getBlob().getBytes();
    /* Un `CAMBIOS …` de quien puede mandarlo (fila 98) se aplica y se borra; si no vale, sigue el camino de cualquier fichero que no se entiende. */
    const cam = recibirCambios_(raiz, f.getName(), bytes);
    if (cam) { f.setTrashed(true); recogidos++; continue; }
    const r = procesarFichero_(f.getName(), bytes, origenDeEntrada_(f, bytes), 'entrada', { cursoElegido: '' });
    /* Todo se guarda (en listados/ o en «Sin clasificar»): lo de entrada/ ya está a salvo. */
    if (r.estado === 'guardado' || r.estado === 'ya' || r.estado === 'sin-clasificar') f.setTrashed(true);
    recogidos++;
  }
  if (deFondo) {
    const queda = ENTRADA_TOPE_MS_ - (new Date().getTime() - inicio);
    try { cerrarFondo_(raiz, vuelta, queda > 0); } catch (e) { /* se apunta en la próxima vuelta */ }   // antes de la tanda: su testigo ya cuenta si queda fondo
    try {
      if (queda > 0) hechosTanda_(raiz, queda);
      else ajustarTestigo_(raiz, hechosHayTrabajo_(raiz));   // sin tiempo para una tanda: el testigo hace que el disparador siga
    } catch (e) { /* queda apuntado en el avance; la tanda de la próxima vuelta lo reintenta */ }
  }
  return recogidos;
}

/* El disparador de cada 10 minutos sobre recogerEntradaProgramada (Lanzador.gs). Nunca dos. */
function asegurarDisparador_() {
  const hay = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'recogerEntradaProgramada'; });
  if (!hay) ScriptApp.newTrigger('recogerEntradaProgramada').timeBased().everyMinutes(10).create();
}

/* ==== Subida.gs ==== */
/* Subir un fichero desde el navegador, por trozos en base64 (el fichero viaja sin tocar).
   Los trozos se guardan ya decodificados en Drive, uno por fichero, en _interno/subiendo/<idSubida>/ (la caché del script no da para ficheros grandes).
   Con el último trozo se juntan en orden, se comprueba el tamaño y se pasa a procesarFichero_. La carpeta temporal se tira siempre al acabar, bien o mal. */
const SUBIDA_TOPE_BYTES_ = 50 * 1024 * 1024;
const SUBIDA_TROZO_MAX_BYTES_ = 1048572;   // lo que manda JsSubir.html en cada trozo (múltiplo de 3)
const SUBIDA_ABANDONADA_MS_ = 60 * 60 * 1000;   // una carpeta temporal con más de una hora se da por abandonada

function comprobarIdSubida_(id) {
  if (!/^[A-Za-z0-9_-]{6,60}$/.test(String(id))) throw new Error('La subida no es válida.');
}

const MENSAJE_DEMASIADO_GRANDE_ = 'Este fichero es demasiado grande para soltarlo aquí. Déjalo en la carpeta «entrada» de Drive.';
const MENSAJE_TROZO_PERDIDO_ = 'Se ha perdido un trozo por el camino. Vuelve a soltar el fichero.';

function nombreDeTrozo_(i) { return ('000000' + i).slice(-6); }

/* Junta los trozos de una carpeta, en orden. Devuelve los bytes, o null si falta alguno o sobra alguno. */
function juntarTrozos_(carpeta, total) {
  const por = {};
  const it = carpeta.getFiles();
  let n = 0;
  while (it.hasNext()) { const f = it.next(); por[f.getName()] = f; n++; }
  if (n !== total) return null;
  const bytes = [];
  for (let i = 0; i < total; i++) {
    const f = por[nombreDeTrozo_(i)];
    if (!f) return null;
    const b = f.getBlob().getBytes();
    for (let j = 0; j < b.length; j++) bytes.push(b[j]);
  }
  return bytes;
}

/* cursoElegido: el curso del desplegable de la zona de soltar ('' si no hay); solo se usa si el fichero no dice el suyo.
   tamano: los bytes del fichero entero, para comprobar al final que ha llegado todo (opcional). */
function webSubirTrozo(idSubida, nombre, indice, total, trozo, cursoElegido, tamano, ctx) {
  if (arguments.length === 7) { ctx = tamano; tamano = undefined; }
  const raiz = carpetaDatos_();
  if (estaRecolocando_(raiz)) return { estado: 'error', mensaje: MENSAJE_RECOLOCANDO_ };
  comprobarIdSubida_(idSubida);
  if (!(indice >= 0 && total >= 1 && indice < total)) throw new Error('El trozo no es válido.');
  const curso = String(cursoElegido || '');
  if (curso && !cursoValido_(curso)) throw new Error('El curso no es válido.');
  if (total * SUBIDA_TROZO_MAX_BYTES_ > SUBIDA_TOPE_BYTES_ + SUBIDA_TROZO_MAX_BYTES_ || (tamano !== undefined && tamano !== null && Number(tamano) > SUBIDA_TOPE_BYTES_)) return { estado: 'error', mensaje: MENSAJE_DEMASIADO_GRANDE_ };
  const carpeta = subcarpetaPorRuta_(raiz, '_interno/subiendo/' + idSubida);
  const nombreTrozo = nombreDeTrozo_(indice);
  const ya = carpeta.getFilesByName(nombreTrozo);
  while (ya.hasNext()) ya.next().setTrashed(true);
  carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(String(trozo)), 'application/octet-stream', nombreTrozo));
  if (indice < total - 1) return { estado: 'trozo' };
  try {
    const bytes = juntarTrozos_(carpeta, total);
    if (!bytes) return { estado: 'error', mensaje: MENSAJE_TROZO_PERDIDO_ };
    if (bytes.length > SUBIDA_TOPE_BYTES_) return { estado: 'error', mensaje: MENSAJE_DEMASIADO_GRANDE_ };
    if (tamano !== undefined && tamano !== null && Number(tamano) !== bytes.length) return { estado: 'error', mensaje: MENSAJE_TROZO_PERDIDO_ };
    return procesarFichero_(nombre, bytes, ctx.correo, 'pagina', { cursoElegido: curso });
  } finally {
    carpeta.setTrashed(true);
  }
}

/* Las carpetas temporales de subidas abandonadas (más de una hora) de _interno/subiendo/. */
function subidasAbandonadas_(raiz, ahoraMs) {
  const it = subcarpetaPorRuta_(raiz, '_interno/subiendo').getFolders(), lista = [];
  while (it.hasNext()) { const c = it.next(); if (ahoraMs - c.getDateCreated().getTime() > SUBIDA_ABANDONADA_MS_) lista.push(c); }
  return lista;
}

/* En la vuelta de los 10 minutos: lo abandonado a la papelera. */
function limpiarSubidas_(raiz) {
  subidasAbandonadas_(raiz, new Date().getTime()).forEach(function (c) { c.setTrashed(true); });
}

/* Fila 45: `recibidos-pendientes`. Solo lee. La página nueva guarda en _interno/recibidos/ cada fichero soltado antes de colocarlo y lo borra cuando está colocado:
   lo que lleve más de media hora ahí se quedó a medias (la página lo coloca al abrirse). */
const RECIBIDOS_VIEJO_MS_ = 30 * 60 * 1000;

function cmpRecibidosPendientes_(ctx) {
  const it = ctx.raiz.getFoldersByName('_interno');
  const dentro = it.hasNext() ? it.next().getFoldersByName('recibidos') : null;
  let total = 0, viejos = 0;
  if (dentro && dentro.hasNext()) {
    const fs = dentro.next().getFiles();
    const ahora = new Date().getTime();
    while (fs.hasNext()) {
      const m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)~/.exec(fs.next().getName());
      total++;
      if (!m || ahora - new Date(isoDePrefijo_(m)).getTime() > RECIBIDOS_VIEJO_MS_) viejos++;
    }
  }
  return { estado: viejos ? 'dato' : 'bien', cifras: { 'en-el-diario': total, 'a-medias': viejos } };
}

function cmpSubidasTemporales_(ctx) {
  const n = subidasAbandonadas_(ctx.raiz, new Date().getTime()).length;
  return { estado: n ? 'dato' : 'bien', cifras: { abandonadas: n } };
}

/* ==== Configuracion.gs ==== */
/* configuracion.json: los datos del centro y la firma de los correos. Solo lo que es del centro. */
const CAMPOS_CONFIG_ = {
  centro: ['nombre', 'codigo', 'direccion', 'localidad', 'provincia', 'telefono'],
  correo: ['direccionDelCentro', 'firma']
};
const MAX_TEXTO_CONFIG_ = 300;
const MAX_FIRMA_CONFIG_ = 2000;

function formaCorreo_(t) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t); }

/* '' si vale; si no, lo que hay que decirle junto al campo. */
function errorDeCampo_(grupo, campo, valor) {
  if (grupo === 'centro' && campo === 'codigo' && valor !== '' && !/^\d{8}$/.test(valor)) return 'El código tiene 8 cifras.';
  if (grupo === 'correo' && campo === 'direccionDelCentro' && valor !== '' && !formaCorreo_(valor)) return 'Eso no parece una dirección de correo.';
  const tope = campo === 'firma' ? MAX_FIRMA_CONFIG_ : MAX_TEXTO_CONFIG_;
  if (valor.length > tope) return 'Es demasiado largo (' + tope + ' letras como mucho).';
  return '';
}

function configuracionVacia_() {
  return { contrato: 1, actualizado: '', actualizadoPor: '',
    centro: { nombre: '', codigo: '', direccion: '', localidad: '', provincia: '', telefono: '' },
    correo: { direccionDelCentro: '', firma: '' },
    soporte: { buzon: '' } };
}

/* Lo que enseña la página. */
function datosConfiguracion_(c) {
  return { centro: c.centro || {}, correo: c.correo || {}, actualizado: fechaLegible_(c.actualizado), actualizadoPor: c.actualizadoPor || '' };
}

function webConfiguracionLeer(ctx) {
  return datosConfiguracion_(leerJson_(carpetaDatos_(), 'configuracion.json') || configuracionVacia_());
}

/* Cambia UN campo y nada más: lo que el programa no conoce se conserva. Con el cerrojo puesto. */
function webConfiguracionGuardar(grupo, campo, valor, ctx) {
  if (grupo === 'soporte') return { ok: false, mensaje: 'Este dato ya no se guarda aquí: el botón «Soporte» trae la dirección del buzón.' };
  if (!CAMPOS_CONFIG_[grupo] || CAMPOS_CONFIG_[grupo].indexOf(campo) === -1) throw new Error('Ese dato no existe.');
  const limpio = String(valor === null || valor === undefined ? '' : valor).replace(/\r\n?/g, '\n').trim();
  const error = errorDeCampo_(grupo, campo, limpio);
  if (error) return { ok: false, mensaje: error };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const raiz = carpetaDatos_();
    const c = leerJson_(raiz, 'configuracion.json') || configuracionVacia_();
    c[grupo] = c[grupo] || {};
    c[grupo][campo] = limpio;
    c.contrato = 1;
    c.actualizado = ahoraMadrid_();
    c.actualizadoPor = ctx.correo;
    escribirJson_(raiz, 'configuracion.json', c);
    return Object.assign({ ok: true }, datosConfiguracion_(c));
  } finally {
    lock.releaseLock();
  }
}

/* ==== Soporte.gs ==== */
/* El botón «Soporte» único (fila 20). Lo trae la página del buzón; aquí solo se vacía el dato viejo y se apunta si el botón carga. */

/* `soporte.buzon` de configuracion.json está en desuso: va siempre vacío. Si ya lo está, no se escribe nada. */
function ponerAlDiaSoporte_(raiz) {
  const c = leerJson_(raiz, 'configuracion.json');
  if (!c || !c.soporte || !c.soporte.buzon) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const actual = leerJson_(raiz, 'configuracion.json');
    if (!actual || !actual.soporte || !actual.soporte.buzon) return;
    actual.soporte.buzon = '';
    actual.actualizado = ahoraMadrid_();
    actual.actualizadoPor = 'Centro de datos';
    escribirJson_(raiz, 'configuracion.json', actual);
  } finally {
    lock.releaseLock();
  }
}

/* La página dice, una vez por vez que se abre, si el botón único ha cargado. Solo se escribe si cambia la versión o el sí/no. */
function webSoporteVisto(cargado, ctx) {
  const interno = subcarpetaPorRuta_(carpetaDatos_(), '_interno');
  const antes = leerJson_(interno, 'soporte.json');
  const si = cargado === true;
  if (antes && antes.version === VERSION_CD && antes.cargado === si) return { ok: true };
  escribirJson_(interno, 'soporte.json', { version: VERSION_CD, cargado: si, cuando: ahoraMadrid_() });
  return { ok: true };
}

/* Lo que mide la página nueva (fila 65) lo apunta ella en `_interno/ensayo-pagina/<nombre>`; si eso no es de esta versión, vale lo que apuntó la aplicación de hoy en `_interno/<nombreHoy>`. */
function medidaPantalla_(raiz, nombre, nombreHoy) {
  let m = null;
  try { m = ensayoJson_(raiz, ensayoDeLaRuta_(nombre)); } catch (e) { m = null; }
  if (m && m.version === VERSION_CD) return m;
  return leerJson_(subcarpetaPorRuta_(raiz, '_interno'), nombreHoy);
}

/* Solo lee. `bien` si la última visita con esta versión vio el botón; `mal` si no. */
function cmpSoporteBotonUnico_(ctx) {
  const v = medidaPantalla_(ctx.raiz, 'soporte.json', 'soporte.json');
  if (!v || v.version !== VERSION_CD) return { estado: 'sin datos', cifras: { 'abierta-con-esta-version': false } };
  return { estado: v.cargado ? 'bien' : 'mal', cifras: { 'abierta-con-esta-version': true, 'boton-cargado': !!v.cargado } };
}

/* La página dice cómo acabó cada envío del botón: solo sí o no. Se cuentan los de esta versión; no se guarda ni texto ni correo. */
function webSoporteEnvio(bien, ctx) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const interno = subcarpetaPorRuta_(carpetaDatos_(), '_interno');
    const antes = leerJson_(interno, 'soporte-envio.json');
    const v = antes && antes.version === VERSION_CD ? antes : { version: VERSION_CD, bien: 0, mal: 0 };
    if (bien === true) v.bien++; else v.mal++;
    v.ultimoBien = bien === true;
    v.cuando = ahoraMadrid_();
    escribirJson_(interno, 'soporte-envio.json', v);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/* Solo lee. `bien` si el último envío hecho con esta versión salió bien; `mal` si no. Sin envíos con esta versión, `sin datos`. */
function cmpSoporteEnvio_(ctx) {
  const v = medidaPantalla_(ctx.raiz, 'soporte-envio.json', 'soporte-envio.json');
  if (!v || v.version !== VERSION_CD) return { estado: 'sin datos', cifras: { 'envios-bien': 0, 'envios-mal': 0 } };
  return { estado: v.ultimoBien ? 'bien' : 'mal', cifras: { 'ultimo-envio-bien': !!v.ultimoBien, 'envios-bien': v.bien, 'envios-mal': v.mal } };
}

/* ==== ComprobPantalla.gs ==== */
/* La tabla de «Listados» se mide a sí misma al cargar: la página cuenta, solo con cifras, cuántas filas y cuántas cajitas tiene y si algo se solapa o se sale por la derecha. */
function webListadosMedidas(medidas, ctx) {
  const m = medidas || {};
  const n = function (x) { return Math.max(0, Math.min(100000, Math.floor(Number(x) || 0))); };
  const v = { version: VERSION_CD, filas: n(m.filas), cajitas: n(m.cajitas), solapes: n(m.solapes), desbordes: n(m.desbordes), ancho: n(m.ancho), cuando: ahoraMadrid_() };
  const interno = subcarpetaPorRuta_(carpetaDatos_(), '_interno');
  const antes = leerJson_(interno, 'listados-pantalla.json');
  if (antes && ['version', 'filas', 'cajitas', 'solapes', 'desbordes', 'ancho'].every(function (k) { return antes[k] === v[k]; })) return { ok: true };
  escribirJson_(interno, 'listados-pantalla.json', v);
  return { ok: true };
}

/* Solo lee. `bien` si la última vez que se midió con esta versión nada se solapaba ni se salía; `mal` si algo sí. */
function cmpListadosSinSolapes_(ctx) {
  const v = medidaPantalla_(ctx.raiz, 'listados-pantalla.json', 'listados-pantalla.json');
  if (!v || v.version !== VERSION_CD) return { estado: 'sin datos', cifras: { 'medida-con-esta-version': false } };
  return { estado: v.solapes + v.desbordes ? 'mal' : 'bien', cifras: { filas: v.filas, cajitas: v.cajitas, solapes: v.solapes, desbordes: v.desbordes, 'ancho-de-ventana': v.ancho } };
}

/* La pestaña «Consultar» (fila 99) se mide a sí misma al cargar la primera vez: solo cifras. */
function webConsultarMedidas(medidas, ctx) {
  const m = medidas || {};
  const n = function (x) { return Math.max(0, Math.min(100000, Math.floor(Number(x) || 0))); };
  const v = { version: VERSION_CD, cargada: m.cargada === true, columnas: n(m.columnas), lineas: n(m.lineas), desbordes: n(m.desbordes), ancho: n(m.ancho), cuando: ahoraMadrid_() };
  const interno = subcarpetaPorRuta_(carpetaDatos_(), '_interno');
  const antes = leerJson_(interno, 'consultar-pantalla.json');
  if (antes && ['version', 'cargada', 'columnas', 'lineas', 'desbordes', 'ancho'].every(function (k) { return antes[k] === v[k]; })) return { ok: true };
  escribirJson_(interno, 'consultar-pantalla.json', v);
  return { ok: true };
}

/* Solo lee. `bien` si la última vez que se midió con esta versión la pestaña cargó y la página no se salía por la derecha; `mal` si no cargó o se salía. */
function cmpConsultarPantalla_(ctx) {
  const v = medidaPantalla_(ctx.raiz, 'consultar-pantalla.json', 'consultar-pantalla.json');
  if (!v || v.version !== VERSION_CD) return { estado: 'sin datos', cifras: { 'medida-con-esta-version': false } };
  return { estado: !v.cargada || v.desbordes ? 'mal' : 'bien', cifras: { cargada: v.cargada, columnas: v.columnas, lineas: v.lineas, desbordes: v.desbordes, 'ancho-de-ventana': v.ancho } };
}

/* ==== Consultar.gs ==== */
/* Consultar (fila 99): la lista de un conjunto de datos ya hechos, en pantalla, impresa y en Excel. Solo lee las partes de `hecho/`; no escribe nada.
   Aquí: qué conjuntos se ofrecen, qué claves salen al imprimir o a Excel (las demás son delicadas: se ven en pantalla y no salen) y cómo se lee la parte elegida.
   Las columnas, los filtros y las líneas están en ConsultarFilas.gs; la hoja impresa y el Excel, en ConsultarSalida.gs y ConsultarExcel.gs. */

/* `modo`: `curso` (una parte por curso), `periodo` (el Consejo: una por periodo y el historial) o `unica` (una sola parte). `grupo`: la clave que agrupa («Una hoja por grupo»).
   `vigencia`: cómo se saca «quién estaba ese día»: `registro` (fechas en el propio registro), `tabla` (en las líneas de una tabla), `consejo` o `cargo`.
   `nombresTabla`/`titulos`: nombres cortos de una tabla y de columnas concretas en la cabecera. `ver`: columnas con las que abre; `unidad`: cómo se cuenta («18 grupos»). */
const CONSULTA_CONJUNTOS_ = [
  { id: 'alumnado', nombre: 'Alumnado', conjunto: 'alumnado', parte: 'actuales', modo: 'curso', soloPropio: true, grupo: 'unidad', unidad: ['alumno', 'alumnos'], ver: ['apellido1', 'apellido2', 'nombre', 'unidad'] },
  { id: 'personal', nombre: 'Personal', conjunto: 'personal', parte: 'curso', modo: 'curso', unidad: ['persona', 'personas'], vigencia: { tipo: 'registro', desde: 'fechaTomaPosesion', hasta: 'fechaCese' }, ver: ['empleado', 'tipoPersonal', 'puesto'] },
  { id: 'tutorias', nombre: 'Tutorías', conjunto: 'tutorias', parte: 'curso', modo: 'curso', grupo: 'unidad', unidad: ['grupo', 'grupos'], vigencia: { tipo: 'tabla', tabla: 'tutores', desde: 'desde', hasta: 'hasta' },
    nombresTabla: { tutores: 'Tutores' }, titulos: { 'tutores.empleado': 'Tutor/a' }, ver: ['unidad', 'tutores.empleado', 'tutores.desde', 'tutores.hasta'] },
  { id: 'consejo-escolar', nombre: 'Consejo Escolar', conjunto: 'consejo-escolar', modo: 'periodo', unidad: ['miembro', 'miembros'], vigencia: { tipo: 'consejo' }, ver: ['miembro', 'sector', 'cargo', 'nombramiento', 'cese'] },
  { id: 'libros', nombre: 'Libros de texto', conjunto: 'libros', parte: 'curso', modo: 'curso', unidad: ['asignatura', 'asignaturas'], ver: ['nivelTexto', 'materia', 'titulo', 'editorial'] },
  { id: 'empresas', nombre: 'Empresas', conjunto: 'empresas', parte: 'todas', modo: 'unica', unidad: ['empresa', 'empresas'], ver: ['razonSocial', 'nombreComercial', 'contacto'] },
  { id: 'administraciones', nombre: 'Administraciones', conjunto: 'administraciones', parte: 'todas', modo: 'unica', unidad: ['administración', 'administraciones'], ver: ['nombreCorto', 'clase', 'dependeDe'] },
  { id: 'cargos', nombre: 'Cargos', conjunto: 'cargos', parte: 'todos', modo: 'unica', unidad: ['registro', 'registros'], vigencia: { tipo: 'cargo' }, ver: ['cargoNombre', 'persona', 'desde', 'hasta'] },
  { id: 'contactos', nombre: 'Contactos del profesorado', conjunto: 'contactos', parte: 'todos', modo: 'unica', unidad: ['persona', 'personas'], ver: ['empleado', 'correoCentro'] }
];

/* Lo único que sale al imprimir y a Excel: `clave` o `tabla.columna`, por conjunto. Todo lo demás (documentos, teléfonos, direcciones, correos propios o de familias, datos de tutores legales
   salvo el nombre, censo NEAE y medidas, casillas en bruto, identificadores y cualquier clave nueva) es delicado: se ve en pantalla y no sale. */
const CONSULTA_SALEN_ = {
  alumnado: ['apellido1', 'apellido2', 'nombre', 'alumno', 'sexo', 'fechaNacimiento', 'localidadNacimiento', 'nacionalidad', 'curso', 'unidad', 'ensenanza', 'estadoMatricula', 'edad', 'centroProcedencia',
    'modalidad', 'matriculaNivel', 'cursoAnterior', 'repiteCurso', 'tutores.orden', 'tutores.apellido1', 'tutores.apellido2', 'tutores.nombre'],
  personal: ['empleado', 'apellidos', 'nombre', 'tipoPersonal', 'puesto', 'especialidad', 'situacion', 'fechaTomaPosesion', 'fechaCese', 'listados', 'puestos.listado', 'puestos.puesto', 'puestos.fechaTomaPosesion', 'puestos.fechaCese'],
  tutorias: ['unidad', 'tutorHoy', 'tutores.empleado', 'tutores.apellidos', 'tutores.nombre', 'tutores.periodo', 'tutores.desde', 'tutores.hasta', 'tutores.sustituto', 'tutores.hoy', 'tutores.enPersonal'],
  'consejo-escolar': ['miembro', 'apellidos', 'nombre', 'sector', 'cargo', 'nombramiento', 'cese', 'nato', 'periodos', 'miembroHoy'],
  libros: ['nivel', 'nivelTexto', 'materia', 'conLibro', 'isbn', 'editorial', 'titulo', 'anioImplantacion', 'importe', 'digital', 'chequeLibro', 'otroMaterial'],
  empresas: ['razonSocial', 'nombreComercial', 'contacto'],
  administraciones: ['clase', 'tercero', 'nombreCorto', 'nombreOficial', 'dir3', 'codigoCentro', 'dependeDe', 'nombresAnteriores.nombre', 'nombresAnteriores.hasta', 'dependeDeAnteriores.nombre', 'dependeDeAnteriores.hasta',
    'departamentos.nombre', 'departamentos.nivel', 'departamentos.dir3', 'departamentos.contacto'],
  cargos: ['cargo', 'cargoNombre', 'tratamiento', 'orden', 'persona', 'desde', 'hasta', 'ocupaHoy'],
  contactos: ['empleado', 'correoCentro']
};

function consultaSale_(conjunto, ruta) { return (CONSULTA_SALEN_[conjunto] || []).indexOf(ruta) !== -1; }

function consultaDefinicion_(id) { return CONSULTA_CONJUNTOS_.filter(function (d) { return d.id === id; })[0] || null; }

/* El curso escolar que contiene un día (`AAAA-MM-DD`): el curso empieza el 1 de septiembre. '' si el día no es una fecha. */
function consultaCursoDeDia_(dia) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dia || ''));
  return m ? parDeCursos_(+m[2] >= 9 ? +m[1] : +m[1] - 1) : '';
}

/* Los cursos que se ofrecen. Alumnado, solo los que tienen parte `actuales`. El personal, las tutorías y los libros ofrecen los de cualquiera de los tres y el de hoy, para poder avisar de lo que falta en uno. */
function consultaCursos_(indice, def) {
  const hechos = indice.hechos || [];
  let cursos;
  if (def.soloPropio) cursos = hechos.filter(function (h) { return h.conjunto === def.conjunto && h.parte === def.parte; }).map(function (h) { return h.cursoEscolar; });
  else cursos = hechos.filter(function (h) { return h.parte === 'curso' && ['personal', 'tutorias', 'libros'].indexOf(h.conjunto) !== -1; }).map(function (h) { return h.cursoEscolar; }).concat([cursoActual_()]);
  return ordenarCursos_(cursos);
}

/* Los conjuntos que hay en la carpeta, con sus cursos o periodos. `periodos`: '' es el historial; los demás, uno por periodo, el más reciente primero. */
function consultaOpciones_(indice) {
  const hechos = indice.hechos || [], lista = [];
  CONSULTA_CONJUNTOS_.forEach(function (def) {
    const partes = hechos.filter(function (h) { return h.conjunto === def.conjunto; });
    const o = { id: def.id, nombre: def.nombre, modo: def.modo, grupo: !!def.grupo, vigencia: !!def.vigencia, cursos: [], periodos: [] };
    if (def.modo === 'curso') { if (!partes.some(function (h) { return h.parte === def.parte; })) return; o.cursos = consultaCursos_(indice, def); }
    else if (def.modo === 'periodo') {
      if (!partes.length) return;
      if (partes.some(function (h) { return h.parte === 'historial'; })) o.periodos.push('');
      partes.filter(function (h) { return h.parte === 'periodo'; }).map(function (h) { return h.periodo; }).sort().reverse().forEach(function (p) { o.periodos.push(p); });
    } else if (!partes.some(function (h) { return h.parte === def.parte; })) return;
    lista.push(o);
  });
  return lista;
}

/* La parte que toca de un conjunto y la frase (llana, ámbar) de lo que falta o se está poniendo al día. */
function consultaParte_(indice, def, curso, periodo) {
  const hechos = (indice.hechos || []).filter(function (h) { return h.conjunto === def.conjunto; });
  let parte;
  if (def.modo === 'curso') parte = hechos.filter(function (h) { return h.parte === def.parte && h.cursoEscolar === curso; })[0];
  else if (def.modo === 'periodo') parte = hechos.filter(function (h) { return periodo ? h.parte === 'periodo' && h.periodo === periodo : h.parte === 'historial'; })[0];
  else parte = hechos.filter(function (h) { return h.parte === def.parte; })[0];
  const aviso = [];
  if (!parte) {
    if (def.id === 'tutorias') aviso.push('Falta el listado de la función tutorial del curso ' + curso + ': no hay tutorías que enseñar.');
    else if (def.id === 'personal') aviso.push('Falta el personal del curso ' + curso + ': no hay ningún listado guardado.');
    else if (def.modo === 'periodo') aviso.push('No hay datos del Consejo Escolar de ese periodo.');
    else aviso.push('Falta ' + def.nombre.toLowerCase() + ' del curso ' + curso + ': no hay datos guardados.');
    return { parte: null, aviso: aviso };
  }
  if (def.id === 'personal') {
    const v = (parte.fuentes || []).map(function (f) { return String(f.variante || ''); });
    const todo = v.some(function (x) { return x === curso; });
    if (!todo) ['docentes', 'no-docentes'].forEach(function (t) { if (!v.some(function (x) { return x === curso + '/' + t; })) aviso.push('Al personal de ' + curso + ' le falta el listado de ' + (t === 'docentes' ? 'docentes' : 'no docentes') + '.'); });
  }
  if (parte.alDia === false) aviso.push('Estos datos se están poniendo al día: puede que falte algo.');
  return { parte: parte, aviso: aviso };
}

/* Lo que se ha elegido de verdad: el conjunto (si no existe, Tutorías o el primero), el curso o el periodo (si no valen, el de hoy o el primero) y su parte con las frases de aviso. */
function consultaEleccion_(indice, id, curso, periodo) {
  const opciones = consultaOpciones_(indice);
  const op = opciones.filter(function (o) { return o.id === id; })[0] || opciones.filter(function (o) { return o.id === 'tutorias'; })[0] || opciones[0] || null;
  if (!op) return { opciones: opciones, op: null, def: null, curso: '', periodo: '', parte: null, aviso: [] };
  const def = consultaDefinicion_(op.id);
  let c = '', p = '';
  if (op.modo === 'curso') c = cursoValido_(curso) ? curso : (op.cursos.indexOf(cursoActual_()) !== -1 ? cursoActual_() : op.cursos[0] || '');
  if (op.modo === 'periodo') p = op.periodos.indexOf(periodo) !== -1 ? periodo : (op.periodos.indexOf('') !== -1 ? '' : op.periodos[0]);
  const hecho = consultaParte_(indice, def, c, p);
  return { opciones: opciones, op: op, def: def, curso: c, periodo: p, parte: hecho.parte, aviso: hecho.aviso };
}

/* Todo lo que necesita la pantalla de una consulta: los conjuntos que hay, lo elegido y los datos de la parte (sus campos y registros tal como están). Abre solo una parte. */
function consultaCarga_(raiz, id, curso, periodo) {
  const e = consultaEleccion_(leerIndice_(raiz), id, curso, periodo);
  const res = { hoy: hoyMadrid_(), cursoHoy: cursoActual_(), opciones: e.opciones, id: e.op ? e.op.id : '', curso: e.curso, periodo: e.periodo, campos: [], registros: [], aviso: e.aviso, hay: false };
  if (!e.parte) return res;
  const obj = abrirParteVecina_(e.parte, {});
  res.hay = true; res.campos = obj.campos || []; res.registros = obj.registros || [];
  return res;
}

/* ==== ConsultarFilas.gs ==== */
/* Consultar (fila 99): de una parte leída a una tabla. Columnas que se pueden elegir, quién estaba en vigor un día, filtros y líneas (una por fila de la tabla desplegada). Sin tocar nada de Drive. */

const CONSULTA_OPERADORES_ = ['contiene', 'igual', 'vacio'];

/* Todas las columnas que ofrece una parte: una por clave y una por columna de cada tabla, más el identificador. `delicada`: se ve en pantalla y no sale al imprimir ni a Excel. */
function consultaColumnas_(campos, def) {
  const cols = [];
  (campos || []).forEach(function (c) {
    if (c.tipo === 'tabla') {
      const tabla = (def.nombresTabla || {})[c.clave] || c.etiqueta;
      (c.columnas || []).forEach(function (s) {
        const ruta = c.clave + '.' + s.clave;
        cols.push({ ruta: ruta, clave: c.clave, sub: s.clave, tabla: c.clave, tipo: s.tipo || 'texto', nombre: tabla + ' · ' + s.etiqueta, titulo: (def.titulos || {})[ruta] || s.etiqueta,
          frase: (s.etiqueta || '') + ', en ' + (c.etiqueta || '').toLowerCase(), delicada: !consultaSale_(def.conjunto, ruta) });
      });
    } else {
      cols.push({ ruta: c.clave, clave: c.clave, sub: '', tabla: '', tipo: c.tipo || 'texto', nombre: c.etiqueta || c.clave, titulo: (def.titulos || {})[c.clave] || c.etiqueta || c.clave,
        frase: c.etiqueta || c.clave, delicada: !consultaSale_(def.conjunto, c.clave) });
    }
  });
  cols.push({ ruta: 'id', clave: 'id', sub: '', tabla: '', tipo: 'texto', nombre: 'Identificador', titulo: 'Identificador', frase: 'Identificador del registro (documento, número escolar…)', delicada: true });
  return cols;
}

/* Un valor tal como se ve: las fechas `dd/mm/aaaa`, el sí/no «Sí»/«No», una lista con comas. */
function consultaTexto_(tipo, v) {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.map(function (x) { return consultaTexto_('texto', x); }).filter(function (x) { return x; }).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean' || tipo === 'si-no') return v === true || v === 'true' ? 'Sí' : 'No';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  if (m && (tipo === 'fecha' || tipo === 'texto')) return m[3] + '/' + m[2] + '/' + m[1];
  return String(v);
}

/* ¿Contiene el periodo «2024-2026» este día? Va del 1 de septiembre del primer año al 31 de agosto del último. */
function consultaPeriodoContiene_(periodo, dia) {
  const m = /^(\d{4})-(\d{4})$/.exec(String(periodo || ''));
  return !!m && dia >= m[1] + '-09-01' && dia <= m[2] + '-08-31';
}

/* Los registros en vigor un día (`AAAA-MM-DD`). Sin día, todos. Un límite que falta no limita, salvo en los cargos (sin `desde` no ocupa ningún día). En las tutorías cada grupo se queda con sus líneas en vigor
   (si no tiene ninguna, sale con la tabla vacía). En el Consejo, un miembro nato o sin cese cuenta si el periodo contiene el día. */
function consultaVigentes_(registros, def, dia, periodo) {
  const v = def.vigencia;
  if (!dia || !v) return registros;
  const dentro = function (d, desde, hasta) { return (!d[desde] || d[desde] <= dia) && (!d[hasta] || dia <= d[hasta]); };
  if (v.tipo === 'registro') return registros.filter(function (r) { return dentro(r.datos, v.desde, v.hasta); });
  if (v.tipo === 'cargo') return registros.filter(function (r) { return ocupaElCargo_(r.datos, dia); });
  if (v.tipo === 'tabla') {
    return registros.map(function (r) {
      const filas = (Array.isArray(r.datos[v.tabla]) ? r.datos[v.tabla] : []).filter(function (f) { return dentro(f, v.desde, v.hasta); });
      const datos = Object.assign({}, r.datos); datos[v.tabla] = filas;
      return { id: r.id, matriculado: r.matriculado, datos: datos };
    });
  }
  return registros.filter(function (r) {
    const d = r.datos, periodos = periodo ? [periodo] : (d.periodos || []);
    if (d.nato || !d.nombramiento) return periodos.some(function (p) { return consultaPeriodoContiene_(p, dia); });
    if (d.nombramiento > dia) return false;
    if (d.cese) return dia <= d.cese;
    return periodos.some(function (p) { return consultaPeriodoContiene_(p, dia); });
  });
}

/* ¿Cumple el filtro este texto (ya visto, como lo ve la usuaria)? Sin mayúsculas ni tildes. */
function consultaCumple_(f, texto) {
  const t = normalizarAlumno_(texto), x = normalizarAlumno_(f.texto);
  if (f.op === 'vacio') return t === '';
  if (f.op === 'igual') return t === x;
  return t.indexOf(x) !== -1;
}

/* El valor de una columna en una línea: de la fila de la tabla desplegada, del registro o, si es de otra tabla, de todas sus filas juntas. */
function consultaValor_(col, r, fila, tabla) {
  if (col.ruta === 'id') return r.id;
  if (!col.tabla) return r.datos[col.ruta];
  if (col.tabla === tabla) return fila ? fila[col.sub] : undefined;
  return (Array.isArray(r.datos[col.tabla]) ? r.datos[col.tabla] : []).map(function (x) { return consultaTexto_(col.tipo, x[col.sub]); });
}

/* Lo que se elige (`estado`: { columnas: [ruta…], filtros: [{ ruta, op, texto }], dia }) sobre una carga de `consultaCarga_`. Devuelve las columnas, las líneas y cuántos registros hay. Cada línea:
   `textos` (como se ven), `crudos` (como están, para Excel), `grupo` y `n` (el registro del que sale). Solo una tabla se despliega: la de la primera columna de tabla marcada. */
function consultaTabla_(carga, estado) {
  const def = consultaDefinicion_(carga.id);
  const posibles = consultaColumnas_(carga.campos, def), porRuta = {};
  posibles.forEach(function (c) { porRuta[c.ruta] = c; });
  let columnas = (estado.columnas || []).map(function (r) { return porRuta[r]; }).filter(function (c) { return !!c; });
  const tabla = (columnas.filter(function (c) { return c.tabla; })[0] || {}).tabla || '';
  columnas = columnas.filter(function (c) { return !c.tabla || c.tabla === tabla; });
  const filtros = (estado.filtros || []).filter(function (f) { return porRuta[f.ruta] && CONSULTA_OPERADORES_.indexOf(f.op) !== -1 && (f.op === 'vacio' || String(f.texto || '').trim() !== ''); });
  const registros = consultaVigentes_(carga.registros, def, estado.dia, carga.periodo);
  const lineas = [], vistos = {};
  registros.forEach(function (r, n) {
    const filas = tabla ? (Array.isArray(r.datos[tabla]) && r.datos[tabla].length ? r.datos[tabla] : [null]) : [null];
    filas.forEach(function (fila) {
      const pasa = filtros.every(function (f) { const c = porRuta[f.ruta]; return consultaCumple_(f, consultaTexto_(c.tipo, consultaValor_(c, r, fila, tabla))); });
      if (!pasa) return;
      vistos[n] = true;
      lineas.push({ n: n, grupo: def.grupo ? String(r.datos[def.grupo] || '') : '',
        crudos: columnas.map(function (c) { const v = consultaValor_(c, r, fila, tabla); return v === undefined ? null : v; }),
        textos: columnas.map(function (c) { return consultaTexto_(c.tipo, consultaValor_(c, r, fila, tabla)); }) });
    });
  });
  return { columnas: columnas, lineas: lineas, registros: Object.keys(vistos).length, tabla: tabla, filtros: filtros.map(function (f) { return { ruta: f.ruta, op: f.op, texto: String(f.texto || '').trim() }; }) };
}

/* «18 grupos · 21 líneas». */
function consultaCuenta_(id, t) {
  const u = (consultaDefinicion_(id) || {}).unidad || ['registro', 'registros'];
  const a = t.registros + ' ' + (t.registros === 1 ? u[0] : u[1]);
  return t.lineas.length === t.registros ? a : a + ' · ' + t.lineas.length + (t.lineas.length === 1 ? ' línea' : ' líneas');
}

/* ==== ConsultarSalida.gs ==== */
/* Consultar (fila 99): lo que sale de la pantalla, en papel y en Excel. Aquí se decide qué columnas salen (nunca las delicadas), cuántas hojas serán y cómo se llama el fichero.
   El Excel está en ConsultarExcel.gs; la hoja impresa la pinta JsConsultar.html con este mismo modelo. */

const CONSULTA_FILAS_POR_HOJA_ = 40;
const CONSULTA_AVISO_PERSONAL_ = 'Contiene datos personales del centro';
const CONSULTA_FRASE_OP_ = { contiene: 'contiene', igual: 'es igual a', vacio: 'está vacío' };

function consultaDia_(dia) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dia || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }

/* «curso 26-27», «el 01/10/2026», «periodo 2025-2026» o «historial»: lo que se consulta. */
function consultaCuando_(carga, dia) {
  if (dia) return 'el ' + consultaDia_(dia) + (carga.curso ? ' (curso ' + consultaCursoDeDia_(dia) + ')' : '');
  if (carga.curso) return 'curso ' + carga.curso;
  return carga.periodo ? 'periodo ' + carga.periodo : 'historial';
}

/* Los filtros usados, en frases. El de una columna delicada no dice qué texto era: «<columna>: filtrado». */
function consultaFiltrosEnFrases_(t) {
  return t.filtros.map(function (f) {
    const c = t.todas[f.ruta];
    if (c.delicada) return c.nombre + ': filtrado';
    return c.nombre + ' ' + CONSULTA_FRASE_OP_[f.op] + (f.op === 'vacio' ? '' : ' «' + f.texto + '»');
  });
}

/* El modelo de la hoja y del Excel. `carga` es la de `consultaCarga_`, `estado` lo elegido (columnas, filtros y día). Solo salen las columnas que no son delicadas. */
function consultaSalida_(carga, estado, conGrupos, hoy) {
  const def = consultaDefinicion_(carga.id), t = consultaTabla_(carga, estado);
  const todas = {};
  consultaColumnas_(carga.campos, def).forEach(function (c) { todas[c.ruta] = c; });
  t.todas = todas;
  const salen = [];
  t.columnas.forEach(function (c, i) { if (!c.delicada) salen.push(i); });
  const quitadas = t.columnas.filter(function (c) { return c.delicada; }).map(function (c) { return c.nombre; });
  const lineas = t.lineas.map(function (l) { return { grupo: l.grupo, textos: salen.map(function (i) { return l.textos[i]; }), crudos: salen.map(function (i) { return l.crudos[i]; }) }; });
  const grupos = [];
  lineas.forEach(function (l) { if (grupos.indexOf(l.grupo) === -1) grupos.push(l.grupo); });
  const porGrupo = !!(conGrupos && def.grupo);
  return {
    conjunto: def.nombre, cuando: consultaCuando_(carga, estado.dia), titulo: def.nombre + ' · ' + consultaCuando_(carga, estado.dia), hoy: consultaDia_(hoy),
    columnas: salen.map(function (i) { return t.columnas[i].titulo; }), tipos: salen.map(function (i) { return t.columnas[i].tipo; }),
    lineas: lineas, porGrupo: porGrupo, grupos: grupos, filtros: consultaFiltrosEnFrases_(t), quitadas: quitadas,
    avisoQuitadas: quitadas.length ? 'Al imprimir o sacar a Excel se quita: ' + quitadas.join(', ') + '.' : '',
    avisoPersonal: CONSULTA_AVISO_PERSONAL_, cuenta: consultaCuenta_(carga.id, t), hojas: consultaHojas_(lineas.length, grupos.length, porGrupo)
  };
}

/* Cuántas hojas saldrán: una por grupo si se marca la casilla; si no, unas tantas según las filas por hoja. */
function consultaHojas_(lineas, grupos, porGrupo) {
  if (porGrupo) return { n: grupos, exacto: true };
  return { n: Math.max(1, Math.ceil(lineas / CONSULTA_FILAS_POR_HOJA_)), exacto: false };
}

function consultaFraseHojas_(h) {
  return (h.exacto || h.n === 1 ? '' : 'unas ') + h.n + (h.n === 1 ? ' hoja' : ' hojas');
}

/* `<Conjunto> <curso o fecha>.xlsx`, con la fecha como 01-10-2026 y sin lo que un nombre de fichero no admite. */
function consultaNombreFichero_(carga, dia) {
  const cuando = dia ? consultaDia_(dia).replace(/\//g, '-') : (carga.curso || carga.periodo || 'historial');
  return (consultaDefinicion_(carga.id).nombre + ' ' + cuando).replace(/[\\\/:*?"<>|]/g, '-') + '.xlsx';
}

/* ==== ConsultarExcel.gs ==== */
/* Consultar (fila 99): el .xlsx, escrito sin librerías de fuera (la página no descarga nada). Un Excel es un zip de ficheros XML; aquí el zip va sin comprimir. Devuelve los bytes (Uint8Array). */

function consultaUtf8_(texto) {
  const sal = [];
  for (let i = 0; i < texto.length; i++) {
    let c = texto.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < texto.length) { c = 0x10000 + ((c - 0xd800) << 10) + (texto.charCodeAt(++i) - 0xdc00); }
    if (c < 0x80) sal.push(c);
    else if (c < 0x800) sal.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) sal.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else sal.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return sal;
}

let CRC_TABLA_ = null;
function consultaCrc32_(bytes) {
  if (!CRC_TABLA_) {
    CRC_TABLA_ = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLA_.push(c >>> 0); }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLA_[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* Un zip sin comprimir. `ficheros`: [{ nombre, texto }]. */
function consultaZip_(ficheros) {
  const sal = [], central = [];
  const u16 = function (a, n) { a.push(n & 255, (n >> 8) & 255); }, u32 = function (a, n) { a.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255); };
  ficheros.forEach(function (f) {
    const nombre = consultaUtf8_(f.nombre), datos = consultaUtf8_(f.texto), crc = consultaCrc32_(datos), pos = sal.length;
    [[0x04034b50, 4], [20, 2], [0x0800, 2], [0, 2], [0, 2], [0x21, 2], [crc, 4], [datos.length, 4], [datos.length, 4], [nombre.length, 2], [0, 2]].forEach(function (x) { if (x[1] === 4) u32(sal, x[0]); else u16(sal, x[0]); });
    nombre.forEach(function (b) { sal.push(b); });
    datos.forEach(function (b) { sal.push(b); });
    [[0x02014b50, 4], [20, 2], [20, 2], [0x0800, 2], [0, 2], [0, 2], [0x21, 2], [crc, 4], [datos.length, 4], [datos.length, 4], [nombre.length, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 4], [pos, 4]].forEach(function (x) { if (x[1] === 4) u32(central, x[0]); else u16(central, x[0]); });
    nombre.forEach(function (b) { central.push(b); });
  });
  const inicio = sal.length;
  central.forEach(function (b) { sal.push(b); });
  u32(sal, 0x06054b50); u16(sal, 0); u16(sal, 0); u16(sal, ficheros.length); u16(sal, ficheros.length); u32(sal, central.length); u32(sal, inicio); u16(sal, 0);
  return Uint8Array.from(sal);
}

function consultaXml_(t) { return String(t).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* A, B… Z, AA… */
function consultaLetras_(i) { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; }

function consultaFechaExcel_(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000) : null;
}

/* El XML de una celda: texto en línea, número o fecha (estilo 1). Lo vacío no escribe celda. */
function consultaCelda_(ref, tipo, crudo, texto) {
  if (texto === '' || texto === null || texto === undefined) return '';
  const f = tipo === 'fecha' || tipo === 'texto' ? consultaFechaExcel_(crudo) : null;   // las columnas de una tabla no dicen su tipo: una fecha `AAAA-MM-DD` es una fecha
  if (f !== null) return '<c r="' + ref + '" s="1"><v>' + f + '</v></c>';
  if (typeof crudo === 'number' && isFinite(crudo)) return '<c r="' + ref + '"><v>' + crudo + '</v></c>';
  return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + consultaXml_(texto) + '</t></is></c>';
}

/* `modelo`: el de `consultaSalida_`. Primera fila: «Contiene datos personales del centro»; después el título con los filtros, lo que se quita (si algo) y la tabla. */
function consultaXlsx_(modelo) {
  const sueltas = [CONSULTA_AVISO_PERSONAL_, modelo.titulo + (modelo.filtros.length ? ' · ' + modelo.filtros.join('; ') : '') + ' · ' + modelo.hoy];
  if (modelo.avisoQuitadas) sueltas.push(modelo.avisoQuitadas);
  const xml = [];
  const poner = function (celdas) { xml.push('<row r="' + (xml.length + 1) + '">' + celdas.join('') + '</row>'); };
  sueltas.forEach(function (t) { poner([consultaCelda_('A' + (xml.length + 1), 'texto', t, t)]); });
  poner(modelo.columnas.map(function (c, i) { return consultaCelda_(consultaLetras_(i) + (xml.length + 1), 'texto', c, c); }));
  modelo.lineas.forEach(function (l) {
    const r = xml.length + 1;
    poner(l.textos.map(function (t, i) { return consultaCelda_(consultaLetras_(i) + r, modelo.tipos[i], l.crudos[i], t); }));
  });
  const hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + xml.join('') + '</sheetData></worksheet>';
  const nombreHoja = consultaXml_(modelo.conjunto.replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31));
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return consultaZip_([
    { nombre: '[Content_Types].xml', texto: cab + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { nombre: '_rels/.rels', texto: cab + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { nombre: 'xl/workbook.xml', texto: cab + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + nombreHoja + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { nombre: 'xl/_rels/workbook.xml.rels', texto: cab + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { nombre: 'xl/styles.xml', texto: cab + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>' },
    { nombre: 'xl/worksheets/sheet1.xml', texto: hoja }
  ]);
}

/* ==== Acceso.gs ==== */
/* Quién entra (propiedad ACCESO, la que mira el lanzador) y cambiar de carpeta. Todo esto es solo del dueño. */
function leerAcceso_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('ACCESO') || '[]'); } catch (e) { return []; }
}

function guardarAcceso_(lista) {
  PropertiesService.getScriptProperties().setProperty('ACCESO', JSON.stringify(lista));
}

function webAccesoLeer(ctx) {
  return { dueno: ctx.correo, personas: leerAcceso_() };
}

function webAccesoAnadir(nombre, correo, ctx) {
  const c = String(correo || '').trim().toLowerCase();
  const n = String(nombre || '').trim().slice(0, 100);
  if (!formaCorreo_(c)) return { ok: false, mensaje: 'Eso no parece una dirección de correo.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = leerAcceso_();
    if (c === ctx.correo || lista.some(function (p) { return String(p.correo).toLowerCase() === c; })) {
      return { ok: false, mensaje: 'Esa persona ya está en la lista.' };
    }
    lista.push({ correo: c, nombre: n || c });
    guardarAcceso_(lista);
    return { ok: true, dueno: ctx.correo, personas: lista };
  } finally {
    lock.releaseLock();
  }
}

function webAccesoQuitar(correo, ctx) {
  const c = String(correo || '').trim().toLowerCase();
  if (c === ctx.correo) return { ok: false, mensaje: 'El dueño no se puede quitar.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = leerAcceso_().filter(function (p) { return String(p.correo).toLowerCase() !== c; });
    guardarAcceso_(lista);
    return { ok: true, dueno: ctx.correo, personas: lista };
  } finally {
    lock.releaseLock();
  }
}

/* Cambiar de carpeta: el enlace de otra carpeta de Drive (o su número). */
function webCarpetaCambiar(enlace, ctx) {
  const r = cambiarCarpeta_(enlace);
  if (r.ok) r.carpeta = estadoCarpeta_(true);
  return r;
}

/* ==== Web.gs ==== */
/* Lo que llama el navegador, siempre por la puerta de Lanzador.gs. El último argumento es el contexto ya decidido allí:
   { correo, esDueno, lanzador }. El navegador nunca dice quién es. */
function webEstado(ctx) {
  /* Antes de tocar Drive: un lanzador más viejo que el mínimo no sabe pedir los permisos de este programa. */
  if ((ctx.lanzador || 1) < LANZADOR_MINIMO) return { version: VERSION_CD, correo: ctx.correo, esDueno: ctx.esDueno, lanzadorViejo: true };
  let carpeta;
  try { carpeta = estadoCarpeta_(ctx.esDueno); } catch (e) { carpeta = errorDeCarpeta_(e, ctx.esDueno); }
  const r = { version: VERSION_CD, correo: ctx.correo, esDueno: ctx.esDueno, carpeta: carpeta };
  if (!carpeta.ok) return r;
  const raiz = carpetaDatos_();
  if (ctx.esDueno) asegurarDisparador_();
  try { revisarClave_(raiz, CLAVE_MIRAR_PAGINA_MS_); } catch (e) { /* mirar la clave nunca rompe la página */ }
  try { ponerAlDia_(raiz); } catch (e) { r.avisoEntrada = 'No he podido poner al día los datos de la carpeta.'; }
  try { r.recolocando = recolocarSiToca_(raiz, RECOLOCAR_TOPE_PAGINA_MS_); } catch (e) { r.avisoEntrada = 'No he podido recolocar lo que ya había guardado.'; }
  try { if (!r.recolocando) r.sigue = colocarExpedientes_(raiz, RECOLOCAR_TOPE_PAGINA_MS_); } catch (e) { r.avisoEntrada = 'No he podido colocar los expedientes que esperaban.'; }
  try { if (!r.recolocando) r.sigue = repasarAdmision_(raiz, RECOLOCAR_TOPE_PAGINA_MS_) || r.sigue; } catch (e) { r.avisoEntrada = 'No he podido repasar la admisión y la planificación ya guardadas.'; }
  try { if (!r.recolocando) r.sigue = repasarCursos_(raiz, RECOLOCAR_TOPE_PAGINA_MS_) || r.sigue; } catch (e) { r.avisoEntrada = 'No he podido repasar lo que esperaba en «Sin clasificar».'; }
  try { if (!r.recolocando) r.sigue = repasarConsejo_(raiz, RECOLOCAR_TOPE_PAGINA_MS_) || r.sigue; } catch (e) { r.avisoEntrada = 'No he podido repasar lo que esperaba en «Sin clasificar».'; }
  try { if (!r.recolocando && hayEntrada_(raiz)) recogerEntrada_(); } catch (e) { r.avisoEntrada = 'No he podido recoger la carpeta de entrada.'; }
  try { r.hechos = resumenHechosPagina_(raiz); r.hechosQuedan = !r.recolocando && r.hechos.quedan; r.avisoClave = ctx.esDueno ? r.hechos.claveAviso : null; delete r.hechos.claveAviso; if (ctx.esDueno && claveRecuperada_(raiz)) r.claveFunciona = true; } catch (e) { r.avisoEntrada = 'No he podido comprobar los datos ya hechos.'; }
  try { r.sobrasTutorias = sobrasTutoriasPagina_(raiz); } catch (e) { r.sobrasTutorias = []; }
  r.centroNombre = '';
  try {
    const cfg = leerJson_(raiz, 'configuracion.json') || {};
    r.centroNombre = (cfg.centro || {}).nombre || '';
  } catch (x) { /* sin configuración legible: sin nombre */ }
  const e = estadoListados_(raiz);
  r.filas = e.filas; r.movimientos = e.movimientos; r.cursoActual = e.cursoActual; r.cursos = e.cursos; r.pendientes = e.pendientes;
  r.cursosElegibles = cursosElegibles_(raiz);
  r.tipos = tiposParaPagina_(raiz); r.periodos = PERIODOS_;
  if (!r.recolocando) delete r.recolocando;
  if (!r.sigue) delete r.sigue;
  if (!r.hechosQuedan) delete r.hechosQuedan;
  if (!r.avisoClave) delete r.avisoClave;
  if (!r.claveFunciona) delete r.claveFunciona;
  return r;
}

/* Solo el dueño (lo exige también la puerta). */
function webCrearCarpetaNueva(ctx) {
  if (!ctx.esDueno) throw new Error('Esto solo lo puede hacer el dueño.');
  if (buscarCarpetaCD_().estado === 'ok') throw new Error('La carpeta de los datos ya existe.');
  crearCarpetaNueva_();
  return webEstado(ctx);
}

/* Las versiones anteriores de un listado: [{ fecha, nombre, url }], las más nuevas primero. */
function webAnteriores(clave, variante, ctx) {
  cargarAprendido_(carpetaDatos_());
  if (!entradaCatalogo_(clave) || !/^[0-9A-Za-z-]+(\/[0-9A-Za-z-]+){0,2}$|^$/.test(String(variante || ''))) throw new Error('Ese listado no existe.');
  const raiz = carpetaDatos_();
  const it = subcarpetaPorRuta_(raiz, rutaDeListado_('anteriores', clave, variante)).getFiles();
  const lista = [];
  while (it.hasNext()) {
    const f = it.next();
    const m = /^(\d{8})-(\d{6}) (.*)$/.exec(f.getName());
    const fecha = m ? m[1].slice(6) + '/' + m[1].slice(4, 6) + '/' + m[1].slice(0, 4) + ' ' + m[2].slice(0, 2) + ':' + m[2].slice(2, 4) : '';
    lista.push({ orden: m ? m[1] + m[2] : '', fecha: fecha, nombre: m ? m[3] : f.getName(), url: 'https://drive.google.com/file/d/' + f.getId() + '/view' });
  }
  return lista.sort(function (a, b) { return a.orden < b.orden ? 1 : -1; });
}
