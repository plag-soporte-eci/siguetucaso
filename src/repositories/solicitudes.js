const { db } = require('../db');
const { generarCodigo } = require('../services/codigo');

const MAXIMO_INTENTOS = 5;

function convertirSolicitud(fila) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    correo: fila.correo,
    servicio: fila.servicio,
    descripcion: fila.descripcion,
    desdeCuando: fila.desde_cuando,
    queIntento: fila.que_intento,
    estado: fila.estado,
    responsable: fila.responsable,
    notaTecnico: fila.nota_tecnico,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

function esConflictoDeCodigo(error) {
  return error.code === '23505' || error.constraint === 'solicitudes_codigo_key';
}

async function crearSolicitud(datos) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const consulta = `
    INSERT INTO solicitudes (
      codigo,
      nombre,
      correo,
      servicio,
      descripcion,
      desde_cuando,
      que_intento
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  for (let intento = 1; intento <= MAXIMO_INTENTOS; intento++) {
    const codigo = generarCodigo();

    try {
      const resultado = await db.pool.query(consulta, [
        codigo,
        datos.nombre,
        datos.correo,
        datos.servicio,
        datos.descripcion,
        datos.desdeCuando || null,
        datos.queIntento || null,
      ]);

      return convertirSolicitud(resultado.rows[0]);
    } catch (error) {
      if (!esConflictoDeCodigo(error) || intento === MAXIMO_INTENTOS) {
        throw error;
      }
    }
  }
}

// Busca una solicitud por su código (SOP-41). El código debe llegar ya normalizado.
// Devuelve la solicitud completa en camelCase, o null si no existe.
async function buscarPorCodigo(codigo) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const resultado = await db.pool.query('SELECT * FROM solicitudes WHERE codigo = $1', [codigo]);

  if (resultado.rows.length === 0) {
    return null;
  }
  return convertirSolicitud(resultado.rows[0]);
}

module.exports = { crearSolicitud, convertirSolicitud, buscarPorCodigo };
