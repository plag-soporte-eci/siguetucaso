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

// Cambia el estado, guarda la nota si se entrega y actualiza actualizado_en.
// El código debe llegar ya normalizado. Devuelve la solicitud actualizada,
// o null si no existe.
async function cambiarEstado(codigo, estado, notaTecnico = null) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const resultado = await db.pool.query(
    `UPDATE solicitudes
     SET estado = $1, nota_tecnico = COALESCE($2, nota_tecnico), actualizado_en = NOW()
     WHERE codigo = $3
     RETURNING *`,
    [estado, notaTecnico, codigo],
  );

  if (resultado.rows.length === 0) {
    return null;
  }
  return convertirSolicitud(resultado.rows[0]);
}

// ---------- SOP-44: respuestas del solicitante ----------

function convertirRespuesta(fila) {
  return {
    id: fila.id,
    texto: fila.texto,
    archivoNombre: fila.archivo_nombre,
    archivoTipo: fila.archivo_tipo,
    creadoEn: fila.creado_en,
  };
}

// Guarda la respuesta y devuelve la solicitud a "En revisión".
// Recibe la solicitud ya encontrada (con su id) y la respuesta validada.
async function guardarRespuesta(solicitud, respuesta) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const archivo = respuesta.archivo || {};
  await db.pool.query(
    `INSERT INTO respuestas (solicitud_id, texto, archivo_nombre, archivo_tipo, archivo_datos)
     VALUES ($1, $2, $3, $4, $5)`,
    [solicitud.id, respuesta.texto, archivo.nombre || null, archivo.tipo || null, archivo.datos || null],
  );

  return cambiarEstado(solicitud.codigo, 'En revisión');
}

// Respuestas de varias solicitudes, sin el contenido del archivo (solo su nombre y tipo).
// Devuelve un objeto { [solicitudId]: [respuestas, de la más antigua a la más reciente] }.
async function respuestasPorSolicitud(ids) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }
  if (ids.length === 0) {
    return {};
  }

  // Arma "$1, $2, $3…" para el IN (un parámetro por id).
  const marcadores = ids.map((_, i) => `$${i + 1}`).join(', ');
  const resultado = await db.pool.query(
    `SELECT id, solicitud_id, texto, archivo_nombre, archivo_tipo, creado_en
     FROM respuestas
     WHERE solicitud_id IN (${marcadores})
     ORDER BY creado_en ASC, id ASC`,
    ids,
  );

  const agrupadas = {};
  resultado.rows.forEach((fila) => {
    if (!agrupadas[fila.solicitud_id]) agrupadas[fila.solicitud_id] = [];
    agrupadas[fila.solicitud_id].push(convertirRespuesta(fila));
  });
  return agrupadas;
}

// Archivo adjunto de una respuesta, solo si pertenece a la solicitud con ese código.
// Devuelve { nombre, tipo, datos } o null.
async function buscarArchivo(codigo, idRespuesta) {
  if (!db.pool) {
    throw new Error('La base de datos no está configurada');
  }

  const resultado = await db.pool.query(
    `SELECT r.archivo_nombre, r.archivo_tipo, r.archivo_datos
     FROM respuestas r
     JOIN solicitudes s ON s.id = r.solicitud_id
     WHERE s.codigo = $1 AND r.id = $2 AND r.archivo_datos IS NOT NULL`,
    [codigo, idRespuesta],
  );

  if (resultado.rows.length === 0) {
    return null;
  }
  const fila = resultado.rows[0];
  return { nombre: fila.archivo_nombre, tipo: fila.archivo_tipo, datos: fila.archivo_datos };
}

module.exports = {
  guardarRespuesta,
  respuestasPorSolicitud,
  buscarArchivo,
  crearSolicitud,
  convertirSolicitud,
  buscarPorCodigo,
  listarSolicitudes,
  contarAbiertas,
  asignarResponsable,
  cambiarEstado,
};
