// Pruebas de cambiar estado (SOP-15 · H5).
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
function cambiarEstado(codigo, cuerpo) {
  return request(app)
    .patch(`/api/tecnico/solicitudes/${codigo}/estado`)
    .set('X-Tecnico-Clave', CLAVE)
    .send(cuerpo);
}

describe('PATCH /api/tecnico/solicitudes/:codigo/estado (SOP-15 y SOP-16)', () => {
  const claveOriginal = process.env.TECNICO_PASSWORD;
  let codigo;

  beforeEach(async () => {
    process.env.TECNICO_PASSWORD = CLAVE;
    await usarBaseEnMemoria();

    const res = await request(app).post('/api/solicitudes').send(solicitudValida);
    codigo = res.body.codigo;

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

  test('sin clave responde 401 y no cambia el estado', async () => {
    const res = await request(app)
      .patch(`/api/tecnico/solicitudes/${codigo}/estado`)
      .send({ estado: 'En revisión' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Clave incorrecta' });

    const publica = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(publica.body.estado).toBe('Recibida');
  });

  test('con clave incorrecta responde 401', async () => {
    const res = await request(app)
      .patch(`/api/tecnico/solicitudes/${codigo}/estado`)
      .set('X-Tecnico-Clave', 'otra-clave')
      .send({ estado: 'En revisión' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Clave incorrecta' });
  });

  test('cambia el estado, actualiza la fecha y devuelve la solicitud', async () => {
    const res = await cambiarEstado(codigo, { estado: '  En revisión  ' });

    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe(codigo);
    expect(res.body.estado).toBe('En revisión');
    expect(new Date(res.body.actualizadoEn).getTime()).toBeGreaterThan(
      new Date('2026-11-01T10:00:00Z').getTime(),
    );
  });

  test('acepta todos los estados del contrato', async () => {
    const estados = ['Recibida', 'En revisión', 'Esperando tu respuesta', 'Resuelta'];

    for (const estado of estados) {
      const cuerpo =
        estado === 'Esperando tu respuesta'
          ? { estado, nota: 'Necesitamos una captura del error.' }
          : { estado };
      const res = await cambiarEstado(codigo, cuerpo);
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe(estado);
    }
  });

  test('guarda una nota válida y el solicitante puede consultarla', async () => {
    const res = await cambiarEstado(codigo, {
      estado: 'Esperando tu respuesta',
      nota: '  Envía una captura del error.  ',
    });

    expect(res.status).toBe(200);
    expect(res.body.notaTecnico).toBe('Envía una captura del error.');

    const publica = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(publica.status).toBe(200);
    expect(publica.body.notaTecnico).toBe('Envía una captura del error.');
  });

  test('acepta una nota de exactamente 300 caracteres', async () => {
    const nota = 'a'.repeat(300);
    const res = await cambiarEstado(codigo, {
      estado: 'Esperando tu respuesta',
      nota,
    });

    expect(res.status).toBe(200);
    expect(res.body.notaTecnico).toBe(nota);
  });

  test('responde 400 si falta la nota para esperar una respuesta', async () => {
    const res = await cambiarEstado(codigo, { estado: 'Esperando tu respuesta' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Revisa los campos marcados.',
      campos: { nota: expect.any(String) },
    });

    const publica = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(publica.body.estado).toBe('Recibida');
  });

  test('responde 400 si la nota supera 300 caracteres', async () => {
    const res = await cambiarEstado(codigo, {
      estado: 'Esperando tu respuesta',
      nota: 'a'.repeat(301),
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Revisa los campos marcados.',
      campos: { nota: expect.any(String) },
    });
  });

  test('responde 400 si el estado está vacío o no existe', async () => {
    const vacio = await cambiarEstado(codigo, { estado: '   ' });
    expect(vacio.status).toBe(400);
    expect(vacio.body.campos.estado).toBeDefined();

    const sinCampo = await cambiarEstado(codigo, {});
    expect(sinCampo.status).toBe(400);

    const invalido = await cambiarEstado(codigo, { estado: 'Cerrada' });
    expect(invalido.status).toBe(400);
  });

  test('acepta el código en minúsculas y actualiza la consulta pública', async () => {
    const res = await cambiarEstado(codigo.toLowerCase(), { estado: 'Resuelta' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('Resuelta');

    const publica = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(publica.body.estado).toBe('Resuelta');
  });

  test('responde 404 si el código no existe', async () => {
    const res = await cambiarEstado('TK-ZZZZ', { estado: 'En revisión' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'No encontramos una solicitud con ese código. Revisa que esté bien escrito.',
    });
  });

  test('responde 500 con un mensaje claro si la base falla', async () => {
    await db.pool.end();
    db.pool = { query: () => Promise.reject(new Error('sin conexión')) };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await cambiarEstado(codigo, { estado: 'En revisión' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
