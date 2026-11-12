// Lógica del formulario de reporte (index.html, SOP-38 / parte frontend de SOP-11).
// Valida en el navegador y envía la solicitud a POST /api/solicitudes
// (contrato de AGENTS.md, sección 7.4).

// Mismos textos y mismo orden que SERVICIOS en src/constantes.js.
const SERVICIOS = [
  'Plataforma académica',
  'Correo institucional',
  'WiFi / red',
  'VPN',
  'Equipo / computador',
  'Otro',
];

const MAX_DESCRIPCION = 1000;

// Revisión sencilla de correo: algo@algo.algo, sin espacios.
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quita espacios al inicio y al final de cada campo.
// Los opcionales vacíos no se envían.
function limpiarDatos(datos) {
  const limpio = {
    nombre: String(datos.nombre || '').trim(),
    correo: String(datos.correo || '').trim(),
    servicio: String(datos.servicio || '').trim(),
    descripcion: String(datos.descripcion || '').trim(),
  };
  const desdeCuando = String(datos.desdeCuando || '').trim();
  const queIntento = String(datos.queIntento || '').trim();
  if (desdeCuando) limpio.desdeCuando = desdeCuando;
  if (queIntento) limpio.queIntento = queIntento;
  return limpio;
}

// Revisa los datos ya limpios. Devuelve { campo: mensaje } solo con los campos
// que tienen error; si el objeto queda vacío, el formulario está bien.
function validarFormulario(datos) {
  const errores = {};

  if (!datos.nombre) {
    errores.nombre = 'Escribe tu nombre.';
  }

  if (!datos.correo) {
    errores.correo = 'Escribe tu correo.';
  } else if (!FORMATO_CORREO.test(datos.correo)) {
    errores.correo = 'Revisa tu correo, parece que no está bien escrito.';
  }

  if (!datos.servicio) {
    errores.servicio = 'Elige con qué tienes el problema.';
  } else if (!SERVICIOS.includes(datos.servicio)) {
    errores.servicio = 'Elige una de las opciones de la lista.';
  }

  if (!datos.descripcion) {
    errores.descripcion = 'Cuéntanos qué pasa.';
  } else if (datos.descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `La descripción puede tener máximo ${MAX_DESCRIPCION} caracteres.`;
  }

  return errores;
}

// ---------- Confirmación con el código (SOP-40, H2 parte 2) ----------

// Arma el enlace a la consulta con el código ya puesto: consultar.html?codigo=TK-XXXX.
// consultar.js lee ese parámetro y busca la solicitud sola.
function enlaceConsulta(codigo) {
  return 'consultar.html?codigo=' + encodeURIComponent(codigo);
}

// Intenta copiar un texto al portapapeles. Devuelve true si lo logró y false si no.
// Recibe el portapapeles como parámetro (en el navegador es navigator.clipboard)
// para poder probarla con Jest usando uno de mentiras.
async function copiarTexto(texto, portapapeles) {
  if (!portapapeles || typeof portapapeles.writeText !== 'function') return false;
  try {
    await portapapeles.writeText(texto);
    return true;
  } catch (err) {
    // Por ejemplo: el navegador no dio permiso o la página no está en https.
    return false;
  }
}

// ---------- Todo lo de abajo solo corre en el navegador ----------
if (typeof document !== 'undefined') {
  const form = document.getElementById('form-solicitud');
  const boton = document.getElementById('boton-enviar');
  const errorGeneral = document.getElementById('error-general');
  const selectServicio = document.getElementById('servicio');
  const descripcion = document.getElementById('descripcion');
  const contador = document.getElementById('contador-descripcion');
  const CAMPOS = ['nombre', 'correo', 'servicio', 'descripcion', 'desdeCuando', 'queIntento'];

  // Llena la lista de servicios con los textos exactos del contrato.
  SERVICIOS.forEach((servicio) => {
    const opcion = document.createElement('option');
    opcion.value = servicio;
    opcion.textContent = servicio;
    selectServicio.appendChild(opcion);
  });

  // Contador de caracteres de la descripción.
  descripcion.addEventListener('input', () => {
    contador.textContent = `${descripcion.value.length} / ${MAX_DESCRIPCION} caracteres`;
  });

  // Muestra el mensaje de cada campo junto a él (o lo borra si ya no tiene error).
  function mostrarErrores(errores) {
    CAMPOS.forEach((campo) => {
      const mensaje = errores[campo] || '';
      const input = document.getElementById(campo);
      document.getElementById('error-' + campo).textContent = mensaje;
      input.classList.toggle('campo-invalido', mensaje !== '');
      input.setAttribute('aria-invalid', mensaje !== '' ? 'true' : 'false');
    });
    // Lleva al usuario al primer campo con error.
    const primero = CAMPOS.find((campo) => errores[campo]);
    if (primero) document.getElementById(primero).focus();
  }

  // Si el usuario corrige un campo, se borra su error de una vez.
  CAMPOS.forEach((campo) => {
    document.getElementById(campo).addEventListener('input', () => {
      document.getElementById('error-' + campo).textContent = '';
      document.getElementById(campo).classList.remove('campo-invalido');
    });
  });

  const codigoGenerado = document.getElementById('codigo-generado');
  const mensajeCopiar = document.getElementById('mensaje-copiar');

  // Cambia el formulario por la confirmación con el código (SOP-40).
  function mostrarConfirmacion(respuesta) {
    codigoGenerado.textContent = respuesta.codigo;
    document.getElementById('enlace-consulta').href = enlaceConsulta(respuesta.codigo);
    mensajeCopiar.textContent = '';

    // Se ocultan el formulario y los textos de arriba/abajo: solo queda la confirmación.
    form.hidden = true;
    document.getElementById('intro').hidden = true;
    document.getElementById('enlace-ya-tengo').hidden = true;
    document.getElementById('confirmacion').hidden = false;

    // El foco va al código para que el lector de pantalla lo anuncie.
    codigoGenerado.focus();
  }

  // Selecciona el código en pantalla para que el usuario lo copie a mano si hace falta.
  function seleccionarCodigo() {
    const rango = document.createRange();
    rango.selectNodeContents(codigoGenerado);
    const seleccion = window.getSelection();
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
  }

  // Botón "Copiar código".
  document.getElementById('boton-copiar').addEventListener('click', async () => {
    const copiado = await copiarTexto(codigoGenerado.textContent, navigator.clipboard);
    if (copiado) {
      mensajeCopiar.textContent = '¡Código copiado!';
      mensajeCopiar.className = 'mensaje-copiar ok';
    } else {
      seleccionarCodigo();
      mensajeCopiar.textContent = 'No pudimos copiarlo. Ya quedó seleccionado: cópialo a mano o anótalo.';
      mensajeCopiar.className = 'mensaje-copiar error';
    }
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    errorGeneral.textContent = '';

    const datos = limpiarDatos(Object.fromEntries(new FormData(form)));
    const errores = validarFormulario(datos);
    mostrarErrores(errores);
    if (Object.keys(errores).length > 0) return;

    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const respuesta = await res.json().catch(() => ({}));
      if (res.status === 201) {
        mostrarConfirmacion(respuesta);
      } else if (respuesta.campos) {
        // El servidor también valida: mostramos sus mensajes junto a cada campo.
        mostrarErrores(respuesta.campos);
        errorGeneral.textContent = respuesta.error || '';
      } else {
        errorGeneral.textContent =
          respuesta.error || 'No pudimos enviar tu solicitud. Intenta de nuevo.';
      }
    } catch (err) {
      errorGeneral.textContent =
        'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
    } finally {
      boton.disabled = false;
      boton.textContent = 'Enviar solicitud';
    }
  });
}

// Permite usar estas funciones en las pruebas con Jest (en el navegador no existe "module").
if (typeof module !== 'undefined') {
  module.exports = {
    SERVICIOS,
    MAX_DESCRIPCION,
    limpiarDatos,
    validarFormulario,
    enlaceConsulta,
    copiarTexto,
  };
}
