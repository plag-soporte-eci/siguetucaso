const express = require('express');
const { SERVICIOS } = require('../constantes');
const { crearSolicitud, buscarPorCodigo } = require('../repositories/solicitudes');
const { normalizarCodigo, esCodigoValido } = require('../services/codigo');

const router = express.Router();

function validarSolicitud(datos) {
  const campos = {};
  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
  const correo = typeof datos.correo === 'string' ? datos.correo.trim() : '';
  const servicio = typeof datos.servicio === 'string' ? datos.servicio.trim() : '';
  const descripcion =
    typeof datos.descripcion === 'string' ? datos.descripcion.trim() : '';

  if (!nombre) campos.nombre = 'El nombre es obligatorio.';
  if (!correo) {
    campos.correo = 'El correo es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    campos.correo = 'Escribe un correo válido.';
  }
  if (!servicio) {
    campos.servicio = 'El servicio es obligatorio.';
  } else if (!SERVICIOS.includes(servicio)) {
    campos.servicio = 'Selecciona un servicio válido.';
  }
  if (!descripcion) {
    campos.descripcion = 'La descripción es obligatoria.';
  } else if (descripcion.length > 1000) {
    campos.descripcion = 'La descripción no puede superar 1000 caracteres.';
  }

  return {
    campos,
    datos: {
      nombre,
      correo,
      servicio,
      descripcion,
      desdeCuando:
        typeof datos.desdeCuando === 'string' ? datos.desdeCuando.trim() : '',
      queIntento:
        typeof datos.queIntento === 'string' ? datos.queIntento.trim() : '',
    },
  };
}

router.post('/api/solicitudes', async (req, res) => {
  const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
  const validacion = validarSolicitud(cuerpo);

  if (Object.keys(validacion.campos).length > 0) {
    return res.status(400).json({
      error: 'Revisa los campos marcados.',
      campos: validacion.campos,
    });
  }

  try {
    const solicitud = await crearSolicitud(validacion.datos);

    return res.status(201).json({
      codigo: solicitud.codigo,
      estado: solicitud.estado,
      creadoEn: solicitud.creadoEn,
    });
  } catch (error) {
    console.error('Error al registrar la solicitud:', error.message);
    return res.status(500).json({
      error: 'No pudimos registrar la solicitud. Intenta de nuevo.',
    });
  }
});

// ---------- SOP-41: consulta pública del estado (sin login) ----------

const NO_ENCONTRADA = 'No encontramos una solicitud con ese código. Revisa que esté bien escrito.';

// Arma la respuesta pública: NUNCA incluye nombre ni correo (AGENTS.md, sección 7.4).
// La nota del técnico solo se muestra cuando el estado es "Esperando tu respuesta".
function vistaPublica(solicitud) {
  return {
    codigo: solicitud.codigo,
    servicio: solicitud.servicio,
    estado: solicitud.estado,
    creadoEn: solicitud.creadoEn,
    actualizadoEn: solicitud.actualizadoEn,
    responsable: solicitud.responsable || null,
    notaTecnico:
      solicitud.estado === 'Esperando tu respuesta' ? solicitud.notaTecnico || null : null,
  };
}

router.get('/api/solicitudes/:codigo', async (req, res) => {
  // Acepta el código sin importar mayúsculas ni espacios: " tk-ab 12 " → "TK-AB12".
  const codigo = normalizarCodigo(req.params.codigo);

  // Si ni siquiera tiene el formato TK-XXXX, no vale la pena ir a la base.
  if (!esCodigoValido(codigo)) {
    return res.status(404).json({ error: NO_ENCONTRADA });
  }

  try {
    const solicitud = await buscarPorCodigo(codigo);

    if (!solicitud) {
      return res.status(404).json({ error: NO_ENCONTRADA });
    }
    return res.status(200).json(vistaPublica(solicitud));
  } catch (error) {
    console.error('Error al consultar la solicitud:', error.message);
    return res.status(500).json({
      error: 'No pudimos consultar tu solicitud. Intenta de nuevo.',
    });
  }
});

module.exports = router;
