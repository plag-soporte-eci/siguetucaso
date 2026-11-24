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

// ---------- SOP-14: consultas del panel del técnico ----------

// Lista las solicitudes de la más reciente a la más antigua.
// Si llega un estado (ej. "En revisión"), solo devuelve las que tienen ese estado.
// Si dos solicitudes tienen la misma fecha, el id desempata (la última creada va primero).
async function listarSolicitudes(estado) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  let consulta = 'SELECT * FROM solicitudes';
  const parametros = [];

  if (estado) {
    consulta += ' WHERE estado = $1';
    parametros.push(estado);
  }
  consulta += ' ORDER BY creado_en DESC, id DESC';

  const resultado = await db.pool.query(consulta, parametros);
  return resultado.rows.map(convertirSolicitud);
}

// Cuenta las solicitudes abiertas: todas las que NO están en "Resuelta".
async function contarAbiertas() {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const resultado = await db.pool.query(
    'SELECT COUNT(*) AS total FROM solicitudes WHERE estado <> $1',
    ['Resuelta'],
  );
  // PostgreSQL devuelve COUNT como texto; Number() lo convierte en número.
  return Number(resultado.rows[0].total);
}

// ---------- SOP-17: asignar responsable ----------

// Guarda quién atiende la solicitud y actualiza actualizado_en (cada cambio del técnico lo hace).
// El código debe llegar ya normalizado. Devuelve la solicitud actualizada, o null si no existe.
async function asignarResponsable(codigo, responsable) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const resultado = await db.pool.query(
    `UPDATE solicitudes
     SET responsable = $1, actualizado_en = NOW()
     WHERE codigo = $2
     RETURNING *`,
    [responsable, codigo],
  );

  if (resultado.rows.length === 0) {
    return null;
  }
  return convertirSolicitud(resultado.rows[0]);
}

// ---------- SOP-15: cambiar estado ----------

// Cambia el estado de una solicitud y actualiza actualizado_en.
// El código debe llegar ya normalizado. Devuelve la solicitud actualizada,
// o null si no existe.
async function cambiarEstado(codigo, estado) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const resultado = await db.pool.query(
    `UPDATE solicitudes
     SET estado = $1, actualizado_en = NOW()
     WHERE codigo = $2
     RETURNING *`,
    [estado, codigo],
  );

  if (resultado.rows.length === 0) {
    return null;
  }
  return convertirSolicitud(resultado.rows[0]);
}

module.exports = {
  crearSolicitud,
  convertirSolicitud,
  buscarPorCodigo,
  listarSolicitudes,
  contarAbiertas,
  asignarResponsable,
  cambiarEstado,
};
