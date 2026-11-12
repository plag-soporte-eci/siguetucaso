// Lógica de la página consultar.html (SOP-13).
// La persona escribe su código y ve en qué va su solicitud, sin iniciar sesión.
// Usa GET /api/solicitudes/:codigo (contrato de AGENTS.md, sección 7.4).

// Mismos textos y mismo orden que ESTADOS en src/constantes.js.
const ESTADOS = ['Recibida', 'En revisión', 'Esperando tu respuesta', 'Resuelta'];

// Alfabeto del código: sin 0, O, 1, I (sección 7.5).
const FORMATO_CODIGO = /^TK-[A-HJ-NP-Z2-9]{4}$/;

// Deja el código como lo guarda el servidor: mayúsculas y sin espacios.
// Si la persona escribe solo los 4 caracteres ("ab12"), le agrega "TK-".
function prepararCodigo(texto) {
  const limpio = String(texto || '').toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z0-9]{4}$/.test(limpio)) {
    return 'TK-' + limpio;
  }
  return limpio;
}

// Devuelve un mensaje de error para mostrar junto al campo, o '' si está bien.
function validarCodigo(codigo) {
  if (codigo === '') {
    return 'Escribe tu código de seguimiento.';
  }
  if (!FORMATO_CODIGO.test(codigo)) {
    return 'El código tiene la forma TK-XXXX (por ejemplo TK-7QH4). Revisa que esté bien escrito.';
  }
  return '';
}

// Arma la línea de pasos: cada estado queda como 'hecho', 'actual' o 'pendiente'.
// Si la solicitud está resuelta, todos quedan hechos y el último es el actual.
function calcularPasos(estadoActual) {
  const posicion = ESTADOS.indexOf(estadoActual);
  return ESTADOS.map((nombre, i) => {
    let tipo = 'pendiente';
    if (i < posicion) tipo = 'hecho';
    if (i === posicion) tipo = 'actual';
    return { nombre, tipo };
  });
}

// Convierte la fecha ISO de la API en un texto fácil de leer.
function formatearFecha(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

// ---------- Todo lo de abajo solo corre en el navegador ----------
if (typeof document !== 'undefined') {
  const form = document.getElementById('form-consulta');
  const campo = document.getElementById('codigo');
  const errorCampo = document.getElementById('error-codigo');
  const boton = document.getElementById('boton-consultar');
  const resultado = document.getElementById('resultado');

  // Muestra (o borra) el mensaje de error junto al campo.
  function mostrarError(mensaje) {
    errorCampo.textContent = mensaje;
    campo.classList.toggle('campo-invalido', mensaje !== '');
    campo.setAttribute('aria-invalid', mensaje !== '' ? 'true' : 'false');
  }

  // Pinta la solicitud que devolvió la API.
  function mostrarSolicitud(solicitud) {
    document.getElementById('res-codigo').textContent = solicitud.codigo;
    document.getElementById('res-servicio').textContent = solicitud.servicio;
    document.getElementById('res-creado').textContent = formatearFecha(solicitud.creadoEn);
    document.getElementById('res-actualizado').textContent = formatearFecha(solicitud.actualizadoEn);

    // Línea de pasos (se usa textContent para no insertar HTML de la API).
    const lista = document.getElementById('pasos');
    lista.innerHTML = '';
    calcularPasos(solicitud.estado).forEach((paso) => {
      const item = document.createElement('li');
      item.className = 'paso paso-' + paso.tipo;
      item.textContent = paso.nombre;
      if (paso.tipo === 'actual') item.setAttribute('aria-current', 'step');
      lista.appendChild(item);
    });

    // Nota del técnico: solo cuando está "Esperando tu respuesta".
    const cajaNota = document.getElementById('caja-nota');
    const hayNota = solicitud.estado === 'Esperando tu respuesta' && solicitud.notaTecnico;
    cajaNota.hidden = !hayNota;
    document.getElementById('res-nota').textContent = hayNota ? solicitud.notaTecnico : '';

    // Responsable: es null hasta el Sprint 2.
    const lineaResponsable = document.getElementById('linea-responsable');
    lineaResponsable.hidden = !solicitud.responsable;
    document.getElementById('res-responsable').textContent = solicitud.responsable || '';

    resultado.hidden = false;
  }

  // Pide la solicitud a la API y muestra el resultado o el error.
  async function consultar(codigo) {
    boton.disabled = true;
    boton.textContent = 'Consultando…';
    resultado.hidden = true;
    try {
      const res = await fetch('/api/solicitudes/' + encodeURIComponent(codigo));
      const datos = await res.json().catch(() => ({}));
      if (res.ok) {
        mostrarError('');
        mostrarSolicitud(datos);
        // Deja el código en la URL para poder volver a consultar o compartir el enlace.
        history.replaceState(null, '', '?codigo=' + encodeURIComponent(codigo));
      } else {
        mostrarError(datos.error || 'No pudimos consultar tu solicitud. Intenta de nuevo.');
      }
    } catch (err) {
      mostrarError('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Consultar';
    }
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const codigo = prepararCodigo(campo.value);
    campo.value = codigo;
    const mensaje = validarCodigo(codigo);
    mostrarError(mensaje);
    if (mensaje === '') {
      consultar(codigo);
    } else {
      resultado.hidden = true;
      campo.focus();
    }
  });

  // Si la página se abre con ?codigo=TK-XXXX (por ejemplo desde la confirmación),
  // consulta de una vez.
  const codigoEnUrl = new URLSearchParams(location.search).get('codigo');
  if (codigoEnUrl) {
    campo.value = prepararCodigo(codigoEnUrl);
    form.requestSubmit();
  }
}

// Permite usar estas funciones en las pruebas con Jest (en el navegador no existe "module").
if (typeof module !== 'undefined') {
  module.exports = { ESTADOS, prepararCodigo, validarCodigo, calcularPasos, formatearFecha };
}
