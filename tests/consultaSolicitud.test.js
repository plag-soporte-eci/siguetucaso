// Pruebas de la consulta pública del estado (SOP-41, parte backend de SOP-13).
// Usan pg-mem con el mismo schema.sql (nunca una base real).
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

// Registra una solicitud con la API y devuelve su código.
async function crearSolicitud() {
  const res = await request(app).post('/api/solicitudes').send(solicitudValida);
  return res.body.codigo;
}

describe('GET /api/solicitudes/:codigo', () => {
  beforeEach(async () => {
    await usarBaseEnMemoria();
  });

  afterEach(async () => {
    if (db.pool && db.pool.end) await db.pool.end();
    db.pool = null;
    jest.restoreAllMocks();
  });

  test('devuelve el estado de una solicitud existente', async () => {
    const codigo = await crearSolicitud();

    const res = await request(app).get(`/api/solicitudes/${codigo}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      codigo,
      servicio: 'VPN',
      estado: 'Recibida',
      creadoEn: expect.any(String),
      actualizadoEn: expect.any(String),
      responsable: null,
      notaTecnico: null,
    });
  });

  test('nunca devuelve el nombre ni el correo', async () => {
    const codigo = await crearSolicitud();

    const res = await request(app).get(`/api/solicitudes/${codigo}`);

    expect(res.body).not.toHaveProperty('nombre');
    expect(res.body).not.toHaveProperty('correo');
  });

  test('encuentra el código sin importar mayúsculas ni espacios', async () => {
    const codigo = await crearSolicitud();
    const escritoMal = ` ${codigo.toLowerCase().slice(0, 5)} ${codigo.toLowerCase().slice(5)} `;

    const res = await request(app).get(`/api/solicitudes/${encodeURIComponent(escritoMal)}`);

    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe(codigo);
  });

  test('responde 404 con el mensaje del contrato si el código no existe', async () => {
    const res = await request(app).get('/api/solicitudes/TK-ZZZZ');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'No encontramos una solicitud con ese código. Revisa que esté bien escrito.',
    });
  });

  test('responde 404 si el código no tiene el formato TK-XXXX', async () => {
    const res = await request(app).get('/api/solicitudes/hola');

    expect(res.status).toBe(404);
  });

  test('muestra la nota del técnico solo cuando está "Esperando tu respuesta"', async () => {
    const codigo = await crearSolicitud();

    // Mientras llega el Sprint 2, se cambia el estado directo en la base de prueba.
    await db.pool.query(
      "UPDATE solicitudes SET estado = 'En revisión', nota_tecnico = 'Envía una captura' WHERE codigo = $1",
      [codigo]
    );
    const enRevision = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(enRevision.body.notaTecnico).toBeNull();

    await db.pool.query(
      "UPDATE solicitudes SET estado = 'Esperando tu respuesta' WHERE codigo = $1",
      [codigo]
    );
    const esperando = await request(app).get(`/api/solicitudes/${codigo}`);
    expect(esperando.body.estado).toBe('Esperando tu respuesta');
    expect(esperando.body.notaTecnico).toBe('Envía una captura');
  });

  test('responde 500 con un mensaje claro si la base falla', async () => {
    await db.pool.end();
    db.pool = { query: () => Promise.reject(new Error('sin conexión')) };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/api/solicitudes/TK-ABCD');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
