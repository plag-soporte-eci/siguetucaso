const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/db');
const { usarBaseEnMemoria } = require('./helpers/dbMemoria');

const solicitudValida = {
  nombre: 'Ana Pérez',
  correo: 'ana@correo.com',
  servicio: 'VPN',
  descripcion: 'No me conecta la VPN desde la casa.',
};

describe('POST /api/solicitudes', () => {
  beforeEach(async () => {
    await usarBaseEnMemoria();
  });

  afterEach(async () => {
    await db.pool.end();
    db.pool = null;
  });

  test('registra una solicitud y devuelve su código de seguimiento', async () => {
    const res = await request(app).post('/api/solicitudes').send(solicitudValida);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      codigo: expect.stringMatching(/^TK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/),
      estado: 'Recibida',
      creadoEn: expect.any(String),
    });
  });

  test('rechaza un campo obligatorio vacío', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .send({ ...solicitudValida, nombre: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.campos.nombre).toBeDefined();
  });

  test('rechaza un correo inválido', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .send({ ...solicitudValida, correo: 'ana@correo' });

    expect(res.status).toBe(400);
    expect(res.body.campos.correo).toBeDefined();
  });

  test('rechaza un servicio no válido', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .send({ ...solicitudValida, servicio: 'Impresora' });

    expect(res.status).toBe(400);
    expect(res.body.campos.servicio).toBeDefined();
  });

  test('rechaza una descripción de más de 1000 caracteres', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .send({ ...solicitudValida, descripcion: 'a'.repeat(1001) });

    expect(res.status).toBe(400);
    expect(res.body.campos.descripcion).toBeDefined();
  });
});
