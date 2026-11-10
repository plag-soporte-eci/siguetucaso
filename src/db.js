// Conexión a PostgreSQL con la librería "pg".
// Si no hay DATABASE_URL, la app funciona igual pero sin base de datos.
const { Pool } = require('pg');

// Se guarda el pool dentro de un objeto para que las pruebas puedan
// reemplazarlo por una base en memoria (pg-mem) sin tocar una base real.
const db = {
  pool: process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null,
};

// Devuelve "ok", "sin configurar" o "error" según el estado de la base.
async function checkDatabase() {
  if (!db.pool) return 'sin configurar';
  try {
    await db.pool.query('SELECT 1');
    return 'ok';
  } catch (err) {
    console.error('Error al verificar la base de datos:', err.message);
    return 'error';
  }
}

module.exports = { db, checkDatabase };
