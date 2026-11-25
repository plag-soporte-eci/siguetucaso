// Lógica del panel del técnico (tecnico.html).
// SOP-14: lista de todas las solicitudes con filtro por estado y contador de abiertas.
// SOP-17: asignar o cambiar el responsable de cada solicitud.
// SOP-15 y SOP-16: cambiar el estado; en "Esperando tu respuesta" se exige una nota.
// La clave se guarda en sessionStorage y se envía en el encabezado X-Tecnico-Clave (AGENTS.md 7.7).

// Mismos textos y mismo orden que ESTADOS en src/constantes.js.
const ESTADOS = ['Recibida', 'En revisión', 'Esperando tu respuesta', 'Resuelta'];
const ESPERANDO_RESPUESTA = ESTADOS[2];
const RESUELTA = ESTADOS[3];

const MAX_RESPONSABLE = 100;
const MAX_NOTA = 300; // igual que en la API (contrato 7.4)
const LLAVE_CLAVE = 'tecnicoClave';

// Texto del contador: "1 abierta" o "3 abiertas".
function textoAbiertas(total) {
  return total === 1 ? 'abierta' : 'abiertas';
}

// Revisa el nombre del responsable antes de enviarlo. Devuelve '' si está bien.
function validarResponsable(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) return 'Escribe el nombre de quien atiende la solicitud.';
  if (limpio.length > MAX_RESPONSABLE) {
    return `El nombre puede tener máximo ${MAX_RESPONSABLE} caracteres.`;
  }
  return '';
}

// Revisa el cambio de estado antes de enviarlo (las mismas reglas de la API).
// Devuelve { campo: mensaje } solo con lo que está mal; vacío si todo está bien.
function validarCambioEstado(estado, nota) {
  const errores = {};
  const notaLimpia = String(nota || '').trim();

  if (!ESTADOS.includes(estado)) {
    errores.estado = 'Elige un estado de la lista.';
  } else if (estado === ESPERANDO_RESPUESTA) {
    if (!notaLimpia) {
      errores.nota = 'Escribe qué necesitas que te envíe el solicitante.';
    } else if (notaLimpia.length > MAX_NOTA) {
      errores.nota = `La nota puede tener máximo ${MAX_NOTA} caracteres.`;
    }
  }
  return errores;
}

// Ajusta el contador de abiertas después de un cambio de estado.
// "Abierta" = cualquier estado distinto de "Resuelta".
function nuevoTotalAbiertas(total, estadoAntes, estadoDespues) {
  const estabaAbierta = estadoAntes !== RESUELTA;
  const quedaAbierta = estadoDespues !== RESUELTA;
  if (estabaAbierta && !quedaAbierta) return total - 1;
  if (!estabaAbierta && quedaAbierta) return total + 1;
  return total;
}

// Convierte el estado en una clase CSS: "Esperando tu respuesta" → "estado-esperando-tu-respuesta".
function claseDeEstado(estado) {
  return 'estado-' + String(estado || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/\s+/g, '-');
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
  const formClave = document.getElementById('form-clave');
  const campoClave = document.getElementById('clave');
  const errorClave = document.getElementById('error-clave');
  const panel = document.getElementById('panel');
  const filtro = document.getElementById('filtro-estado');
  const lista = document.getElementById('lista-solicitudes');
  const errorPanel = document.getElementById('error-panel');
  const sinSolicitudes = document.getElementById('sin-solicitudes');
  const plantilla = document.getElementById('plantilla-solicitud');

  // sessionStorage puede fallar (por ejemplo en modo privado): por eso el try/catch.
  function leerClave() {
    try { return sessionStorage.getItem(LLAVE_CLAVE) || ''; } catch (e) { return ''; }
  }
  function guardarClave(clave) {
    try { sessionStorage.setItem(LLAVE_CLAVE, clave); } catch (e) { /* sin sessionStorage */ }
  }
  function borrarClave() {
    try { sessionStorage.removeItem(LLAVE_CLAVE); } catch (e) { /* sin sessionStorage */ }
  }

  // Llama a la API del técnico con la clave guardada.
  // Si la clave es incorrecta (401), vuelve a pedirla.
  async function llamarApi(ruta, opciones = {}) {
    const res = await fetch(ruta, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        'X-Tecnico-Clave': leerClave(),
        ...(opciones.headers || {}),
      },
    });
    const datos = await res.json().catch(() => ({}));
    if (res.status === 401) {
      borrarClave();
      mostrarFormularioClave('Clave incorrecta. Intenta de nuevo.');
      throw new Error('Clave incorrecta');
    }
    return { res, datos };
  }

  function mostrarFormularioClave(mensaje) {
    panel.hidden = true;
    formClave.hidden = false;
    errorClave.textContent = mensaje || '';
    campoClave.value = '';
    campoClave.focus();
  }

  // Pinta una solicitud copiando la plantilla. Todo con textContent (no se inserta HTML).
  function crearItem(solicitud) {
    const item = plantilla.content.firstElementChild.cloneNode(true);
    const poner = (clase, texto) => { item.querySelector(clase).textContent = texto || '—'; };

    poner('.s-codigo', solicitud.codigo);
    poner('.s-servicio', solicitud.servicio);
    poner('.s-descripcion', solicitud.descripcion);
    poner('.s-nombre', solicitud.nombre);
    poner('.s-correo', solicitud.correo);
    poner('.s-desde', solicitud.desdeCuando);
    poner('.s-intento', solicitud.queIntento);
    poner('.s-creado', formatearFecha(solicitud.creadoEn));
    poner('.s-actualizado', formatearFecha(solicitud.actualizadoEn));

    const etiqueta = item.querySelector('.s-estado');
    // Pinta la etiqueta del estado (se reutiliza cuando el técnico lo cambia).
    function pintarEstado(estado) {
      etiqueta.textContent = estado;
      etiqueta.className = 'etiqueta-estado s-estado ' + claseDeEstado(estado);
    }
    pintarEstado(solicitud.estado);

    // SOP-17: formulario del responsable
    const form = item.querySelector('.form-responsable');
    const campo = item.querySelector('.s-responsable');
    const error = item.querySelector('.s-error');
    const ok = item.querySelector('.s-ok');
    const boton = form.querySelector('button');
    campo.value = solicitud.responsable || '';
    boton.textContent = solicitud.responsable ? 'Cambiar' : 'Asignar';

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      ok.textContent = '';
      const mensaje = validarResponsable(campo.value);
      error.textContent = mensaje;
      campo.classList.toggle('campo-invalido', mensaje !== '');
      if (mensaje) {
        campo.focus();
        return;
      }

      boton.disabled = true;
      try {
        const ruta = '/api/tecnico/solicitudes/' + encodeURIComponent(solicitud.codigo) + '/responsable';
        const { res, datos } = await llamarApi(ruta, {
          method: 'PATCH',
          body: JSON.stringify({ responsable: campo.value.trim() }),
        });
        if (res.ok) {
          campo.value = datos.responsable;
          boton.textContent = 'Cambiar';
          ok.textContent = 'Listo: el solicitante ya ve quién lo atiende.';
          item.querySelector('.s-actualizado').textContent = formatearFecha(datos.actualizadoEn);
        } else {
          error.textContent = (datos.campos && datos.campos.responsable) || datos.error ||
            'No pudimos asignar el responsable. Intenta de nuevo.';
        }
      } catch (e) {
        if (e.message !== 'Clave incorrecta') {
          error.textContent = 'No hay conexión con el servidor. Intenta de nuevo.';
        }
      } finally {
        boton.disabled = false;
      }
    });

    // SOP-15 y SOP-16: formulario del estado (con nota en "Esperando tu respuesta")
    const formEstado = item.querySelector('.form-estado');
    const selectEstado = item.querySelector('.s-nuevo-estado');
    const campoNota = item.querySelector('.s-campo-nota');
    const nota = item.querySelector('.s-nota');
    const errorEstado = item.querySelector('.s-error-estado');
    const okEstado = item.querySelector('.s-ok-estado');
    const botonEstado = formEstado.querySelector('button');
    let estadoActual = solicitud.estado;

    ESTADOS.forEach((estado) => {
      const opcion = document.createElement('option');
      opcion.value = estado;
      opcion.textContent = estado;
      selectEstado.appendChild(opcion);
    });
    selectEstado.value = estadoActual;
    // Si ya está esperando respuesta, se muestra la nota que se le pidió al solicitante.
    nota.value = estadoActual === ESPERANDO_RESPUESTA ? solicitud.notaTecnico || '' : '';

    // La nota solo aparece cuando el estado elegido es "Esperando tu respuesta".
    function mostrarNotaSiHaceFalta() {
      campoNota.hidden = selectEstado.value !== ESPERANDO_RESPUESTA;
    }
    mostrarNotaSiHaceFalta();
    selectEstado.addEventListener('change', () => {
      okEstado.textContent = '';
      errorEstado.textContent = '';
      mostrarNotaSiHaceFalta();
    });

    formEstado.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      okEstado.textContent = '';
      const nuevoEstado = selectEstado.value;
      const errores = validarCambioEstado(nuevoEstado, nota.value);
      errorEstado.textContent = errores.estado || errores.nota || '';
      nota.classList.toggle('campo-invalido', Boolean(errores.nota));
      if (errores.nota) {
        nota.focus();
        return;
      }
      if (errores.estado) return;

      const cuerpo = { estado: nuevoEstado };
      if (nuevoEstado === ESPERANDO_RESPUESTA) cuerpo.nota = nota.value.trim();

      botonEstado.disabled = true;
      try {
        const ruta = '/api/tecnico/solicitudes/' + encodeURIComponent(solicitud.codigo) + '/estado';
        const { res, datos } = await llamarApi(ruta, {
          method: 'PATCH',
          body: JSON.stringify(cuerpo),
        });
        if (res.ok) {
          // Actualiza el contador de abiertas, la etiqueta y la fecha sin recargar la lista.
          const total = Number(document.getElementById('total-abiertas').textContent) || 0;
          const nuevoTotal = nuevoTotalAbiertas(total, estadoActual, datos.estado);
          document.getElementById('total-abiertas').textContent = nuevoTotal;
          document.getElementById('texto-abiertas').textContent = textoAbiertas(nuevoTotal);
          estadoActual = datos.estado;
          pintarEstado(datos.estado);
          item.querySelector('.s-actualizado').textContent = formatearFecha(datos.actualizadoEn);
          okEstado.textContent = datos.estado === ESPERANDO_RESPUESTA
            ? 'Listo: el solicitante ya ve tu nota.'
            : 'Listo: el solicitante ya ve el nuevo estado.';
        } else {
          errorEstado.textContent = (datos.campos && (datos.campos.nota || datos.campos.estado)) ||
            datos.error || 'No pudimos cambiar el estado. Intenta de nuevo.';
        }
      } catch (e) {
        if (e.message !== 'Clave incorrecta') {
          errorEstado.textContent = 'No hay conexión con el servidor. Intenta de nuevo.';
        }
      } finally {
        botonEstado.disabled = false;
      }
    });

    return item;
  }

  // Carga la lista (SOP-14) según el filtro elegido.
  async function cargarSolicitudes() {
    errorPanel.textContent = '';
    const estado = filtro.value;
    const ruta = '/api/tecnico/solicitudes' + (estado ? '?estado=' + encodeURIComponent(estado) : '');
    try {
      const { res, datos } = await llamarApi(ruta);
      if (!res.ok) {
        errorPanel.textContent = datos.error || 'No pudimos cargar las solicitudes.';
        return;
      }
      formClave.hidden = true;
      panel.hidden = false;
      document.getElementById('total-abiertas').textContent = datos.abiertas;
      document.getElementById('texto-abiertas').textContent = textoAbiertas(datos.abiertas);

      lista.innerHTML = '';
      datos.solicitudes.forEach((s) => lista.appendChild(crearItem(s)));
      sinSolicitudes.hidden = datos.solicitudes.length > 0;
    } catch (e) {
      if (e.message !== 'Clave incorrecta') {
        errorPanel.textContent = 'No hay conexión con el servidor. Intenta de nuevo.';
      }
    }
  }

  // Llena el filtro con los estados del contrato.
  ESTADOS.forEach((estado) => {
    const opcion = document.createElement('option');
    opcion.value = estado;
    opcion.textContent = estado;
    filtro.appendChild(opcion);
  });
  filtro.addEventListener('change', cargarSolicitudes);

  formClave.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const clave = campoClave.value;
    if (!clave) {
      errorClave.textContent = 'Escribe la clave.';
      return;
    }
    guardarClave(clave);
    errorClave.textContent = '';
    cargarSolicitudes();
  });

  document.getElementById('boton-salir').addEventListener('click', () => {
    borrarClave();
    mostrarFormularioClave('');
  });

  // Si ya hay clave en esta pestaña, carga la lista de una vez.
  if (leerClave()) {
    cargarSolicitudes();
  } else {
    mostrarFormularioClave('');
  }
}

// Permite usar estas funciones en las pruebas con Jest (en el navegador no existe "module").
if (typeof module !== 'undefined') {
  module.exports = {
    ESTADOS,
    MAX_NOTA,
    textoAbiertas,
    validarResponsable,
    validarCambioEstado,
    nuevoTotalAbiertas,
    claseDeEstado,
    formatearFecha,
  };
}
