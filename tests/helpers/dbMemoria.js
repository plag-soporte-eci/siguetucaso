const fs = require('fs');
const path = require('path');
const { newDb } = require('pg-mem');
const { db } = require('../../src/db');

function usarBaseEnMemoria() {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  db.pool = new Pool();
  const schema = fs.readFileSync(path.join(__dirname, '../../src/schema.sql'), 'utf8');
  return db.pool.query(schema);
}

module.exports = { usarBaseEnMemoria };
