const fs = require('fs');
const path = require('path');
const { db } = require('./db');

async function initDb() {
  if (!db.pool) {
    console.log('Base de datos: sin configurar; no se ejecutó el esquema');
    return;
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.pool.query(schema);
}

module.exports = { initDb };
