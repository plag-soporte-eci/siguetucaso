// Pruebas de asignar responsable (SOP-17 · H7).
// Prueba mínima: con clave, el técnico asigna un responsable, se actualiza actualizado_en
// y el solicitante lo ve en la consulta pública. Sin clave responde 401.
// Usan pg-mem con el mismo schema.sql (nunca una base real).
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/db');
const { usarBaseEnMemoria } = require('./helpers/dbMemoria');

const CLAVE = 'clave-de-prueba';

const solicitudValida = {
  nombre: 'Ana Pérez',
  correo: 'ana@correo.com',
  servicio: 'VPN',
  descripcion: 'No me conecta la VPN desde la casa.',
};

// Envía el PATCH con la clave del técnico.
function asignar(codigo, cuerpo) {
  return request(app)
    .patch(`/api/tecnico/solicitudes/${codigo}/responsable`)
    .set('X-Tecnico-Clave', CLAVE)
    .send(cuerpo);
}

describe('PATCH /api/tecnico/solicitudes/:codigo/responsable (SOP-17)', () => {
  const claveOriginal = process.env.TECNICO_PASSWORD;
  let codigo;

  beforeEach(async () => {
    process.env.TECNICO_PASSWORD = CLAVE;
    await usarBaseEnMemoria();
    const res = await request(app).post('/api/solicitudes').send(solicitudValida);
    codigo = res.body.codigo;
    // Fecha vieja para comprobar que el cambio actualiza actualizado_en.
    await db.pool.query(
      "UPDATE solicitudes SET actualizado_en = '2026-11-01T10:00:00Z' WHERE codigo = $1",
      [codigo],
    );
  });

  afterEach(async () => {
    if (db.pool && db.pool.end) await db.pool.end();
    db.pool = null;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (claveOriginal === undefined) delete process.env.TECNICO_PASSWORD;
    else process.env.TECNICO_PASSWORD = claveOriginal;
  });

  test('sin clave responde 401 y no cambia nada', async () => {
    const res = await request(app)
      .patch(`/api/tecnico/solicitudes/${codigo}/responsable`)
      .send({ responsable: 'Carlos' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Clave incorrecta' });

    const publica = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(publica.body.responsable).toBeNull();
  });

  test('asigna el responsable, actualiza la fecha y devuelve la solicitud', async () => {
    const res = await asignar(codigo, { responsable: '  Carlos Gómez  ' });

    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe(codigo);
    expect(res.body.responsable).toBe('Carlos Gómez');
    expect(new Date(res.body.actualizadoEn).getTime()).toBeGreaterThan(
      new Date('2026-11-01T10:00:00Z').getTime(),
    );
  });

  test('el solicitante ve quién lo atiende en la consulta pública', async () => {
    await asignar(codigo, { responsable: 'Carlos Gómez' });

    const res = await request(app).get(`/api/solicitudes/${codigo}`);

    expect(res.status).toBe(200);
    expect(res.body.responsable).toBe('Carlos Gómez');
  });

  test('se puede cambiar el responsable y acepta el código en minúsculas', async () => {
    await asignar(codigo, { responsable: 'Carlos' });

    const res = await asignar(codigo.toLowerCase(), { responsable: 'Diana' });

    expect(res.status).toBe(200);
    expect(res.body.responsable).toBe('Diana');
  });

  test('responde 400 si el responsable está vacío o es muy largo', async () => {
    const vacio = await asignar(codigo, { responsable: '   ' });
    expect(vacio.status).toBe(400);
    expect(vacio.body.campos.responsable).toBeDefined();

    const sinCampo = await asignar(codigo, {});
    expect(sinCampo.status).toBe(400);

    const largo = await asignar(codigo, { responsable: 'a'.repeat(101) });
    expect(largo.status).toBe(400);
  });

  test('responde 404 si el código no existe', async () => {
    const res = await asignar('TK-ZZZZ', { responsable: 'Carlos' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'No encontramos una solicitud con ese código. Revisa que esté bien escrito.',
    });
  });

  test('responde 500 con un mensaje claro si la base falla', async () => {
    await db.pool.end();
    db.pool = { query: () => Promise.reject(new Error('sin conexión')) };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await asignar(codigo, { responsable: 'Carlos' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
