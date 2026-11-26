// API del técnico (SOP-14, contrato sección 7.4).
// Todas las rutas que empiezan por /api/tecnico exigen la clave del técnico
// en el encabezado X-Tecnico-Clave (lo valida el middleware tecnicoAuth).
// Las rutas no escriben SQL: llaman funciones de repositories/solicitudes.js.
const express = require('express');
const tecnicoAuth = require('../middleware/tecnicoAuth');
const { ESTADOS } = require('../constantes');
const {
  listarSolicitudes,
  contarAbiertas,
  buscarPorCodigo,
  asignarResponsable,
  cambiarEstado,
  respuestasPorSolicitud,
  buscarArchivo,
} = require('../repositories/solicitudes');
const { normalizarCodigo, esCodigoValido } = require('../services/codigo');

const router = express.Router();

const NO_ENCONTRADA = 'No encontramos una solicitud con ese código. Revisa que esté bien escrito.';
const ESTADO_ESPERANDO_RESPUESTA = ESTADOS[2];
const MAX_NOTA_TECNICO = 300;

// Agrega a cada solicitud la lista de respuestas del solicitante (SOP-44).
async function conRespuestas(solicitudes) {
  const respuestas = await respuestasPorSolicitud(solicitudes.map((s) => s.id));
  return solicitudes.map((s) => ({ ...s, respuestas: respuestas[s.id] || [] }));
}

// Primero la clave: si no es correcta, ninguna ruta de abajo se ejecuta (401).
router.use('/api/tecnico', tecnicoAuth);

// GET /api/tecnico/solicitudes?estado=
// Devuelve { abiertas, solicitudes } con TODOS los campos, más recientes primero.
// "abiertas" cuenta todas las que no están "Resuelta", sin importar el filtro.
router.get('/api/tecnico/solicitudes', async (req, res) => {
  const estado = typeof req.query.estado === 'string' ? req.query.estado.trim() : '';

  // Sin estado = "Todas". Con estado, debe ser uno de los 4 del contrato.
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido.' });
  }

  try {
    const solicitudes = await conRespuestas(await listarSolicitudes(estado || null));
    const abiertas = await contarAbiertas();

    return res.status(200).json({ abiertas, solicitudes });
  } catch (error) {
    console.error('Error al listar las solicitudes del técnico:', error.message);
    return res.status(500).json({
      error: 'No pudimos cargar las solicitudes. Intenta de nuevo.',
    });
  }
});

// GET /api/tecnico/solicitudes/:codigo
// Detalle completo de una solicitud (a diferencia de la consulta pública,
// aquí SÍ van el nombre, el correo, desde cuándo y qué intentó).
router.get('/api/tecnico/solicitudes/:codigo', async (req, res) => {
  // Igual que la consulta pública: acepta minúsculas y espacios.
  const codigo = normalizarCodigo(req.params.codigo);

  if (!esCodigoValido(codigo)) {
    return res.status(404).json({ error: NO_ENCONTRADA });
  }

  try {
    const solicitud = await buscarPorCodigo(codigo);

    if (!solicitud) {
      return res.status(404).json({ error: NO_ENCONTRADA });
    }
    const [conDetalle] = await conRespuestas([solicitud]);
    return res.status(200).json(conDetalle);
  } catch (error) {
    console.error('Error al consultar el detalle de la solicitud:', error.message);
    return res.status(500).json({
      error: 'No pudimos cargar la solicitud. Intenta de nuevo.',
    });
  }
});

// ---------- SOP-17: asignar responsable ----------

const MAX_RESPONSABLE = 100;

// PATCH /api/tecnico/solicitudes/:codigo/responsable  con cuerpo { responsable }
// Guarda quién atiende la solicitud. El solicitante lo ve en la consulta pública.
router.patch('/api/tecnico/solicitudes/:codigo/responsable', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo);
  const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
  const responsable = typeof cuerpo.responsable === 'string' ? cuerpo.responsable.trim() : '';

  // Validación: el nombre es obligatorio y corto (se muestra en la pantalla del solicitante).
  if (!responsable) {
    return res.status(400).json({
      error: 'Revisa los campos marcados.',
      campos: { responsable: 'Escribe el nombre de quien atiende la solicitud.' },
    });
  }
  if (responsable.length > MAX_RESPONSABLE) {
    return res.status(400).json({
      error: 'Revisa los campos marcados.',
      campos: { responsable: `El nombre puede tener máximo ${MAX_RESPONSABLE} caracteres.` },
    });
  }

  if (!esCodigoValido(codigo)) {
    return res.status(404).json({ error: NO_ENCONTRADA });
  }

  try {
    const solicitud = await asignarResponsable(codigo, responsable);

    if (!solicitud) {
      return res.status(404).json({ error: NO_ENCONTRADA });
    }
    return res.status(200).json(solicitud);
  } catch (error) {
    console.error('Error al asignar el responsable:', error.message);
    return res.status(500).json({
      error: 'No pudimos asignar el responsable. Intenta de nuevo.',
    });
  }
});

// ---------- SOP-15: cambiar estado ----------

// PATCH /api/tecnico/solicitudes/:codigo/estado con cuerpo { estado, nota? }
router.patch('/api/tecnico/solicitudes/:codigo/estado', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo);
  const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
  const estado = typeof cuerpo.estado === 'string' ? cuerpo.estado.trim() : '';
  const nota = typeof cuerpo.nota === 'string' ? cuerpo.nota.trim() : '';
  const esperaRespuesta = estado === ESTADO_ESPERANDO_RESPUESTA;

  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({
      error: 'Revisa los campos marcados.',
      campos: { estado: 'Selecciona un estado válido.' },
    });
  }

  if (esperaRespuesta && !nota) {
    return res.status(400).json({
      error: 'Revisa los campos marcados.',
      campos: { nota: 'Escribe la nota que necesita el solicitante.' },
    });
  }
  if (esperaRespuesta && nota.length > MAX_NOTA_TECNICO) {
    return res.status(400).json({
      error: 'Revisa los campos marcados.',
      campos: { nota: `La nota no puede superar ${MAX_NOTA_TECNICO} caracteres.` },
    });
  }

  if (!esCodigoValido(codigo)) {
    return res.status(404).json({ error: NO_ENCONTRADA });
  }

  try {
    const solicitud = await cambiarEstado(codigo, estado, esperaRespuesta ? nota : null);

    if (!solicitud) {
      return res.status(404).json({ error: NO_ENCONTRADA });
    }
    return res.status(200).json(solicitud);
  } catch (error) {
    console.error('Error al cambiar el estado de la solicitud:', error.message);
    return res.status(500).json({
      error: 'No pudimos cambiar el estado. Intenta de nuevo.',
    });
  }
});

// ---------- SOP-44: descargar el archivo que adjuntó el solicitante ----------

// GET /api/tecnico/solicitudes/:codigo/respuestas/:id/archivo
router.get('/api/tecnico/solicitudes/:codigo/respuestas/:id/archivo', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo);
  const id = Number(req.params.id);
  const noHay = { error: 'No encontramos ese archivo.' };

  if (!esCodigoValido(codigo) || !Number.isInteger(id) || id < 1) {
    return res.status(404).json(noHay);
  }

  try {
    const archivo = await buscarArchivo(codigo, id);

    if (!archivo) {
      return res.status(404).json(noHay);
    }
    res.set('Content-Type', archivo.tipo);
    res.attachment(archivo.nombre);
    return res.send(Buffer.from(archivo.datos, 'base64'));
  } catch (error) {
    console.error('Error al descargar el archivo:', error.message);
    return res.status(500).json({ error: 'No pudimos descargar el archivo. Intenta de nuevo.' });
  }
});

module.exports = router;
