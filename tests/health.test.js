const request = require('supertest');
const { newDb } = require('pg-mem');
const app = require('../src/app');
const { db } = require('../src/db');
const { version } = require('../package.json');

describe('GET /health', () => {
  const poolOriginal = db.pool;

  afterEach(() => {
    db.pool = poolOriginal;
    jest.restoreAllMocks();
  });

  test('responde 200 con status "ok"', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe(version);
    expect(new Date(res.body.time).toISOString()).toBe(res.body.time);
  });

  test('indica "sin configurar" si no hay base de datos', async () => {
    db.pool = null;

    const res = await request(app).get('/health');

    expect(res.body.db).toBe('sin configurar');
  });

  test('indica "ok" si la base de datos responde (pg-mem)', async () => {
    const { Pool } = newDb().adapters.createPg();
    db.pool = new Pool();

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.db).toBe('ok');
  });

  test('indica "error" si la base de datos falla', async () => {
    db.pool = { query: () => Promise.reject(new Error('sin conexión')) };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.db).toBe('error');
  });
});
