const express = require('express');
const { SERVICIOS } = require('../constantes');
const { crearSolicitud } = require('../repositories/solicitudes');

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

module.exports = router;
