// Pruebas de la API del técnico (SOP-14 · H4).
// Prueba mínima de la tarjeta: sin clave responde 401; con clave, 200 con la lista ordenada.
// Usan pg-mem con el mismo schema.sql (nunca una base real).
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/db');
const { usarBaseEnMemoria } = require('./helpers/dbMemoria');

const CLAVE = 'clave-de-prueba';

function solicitud(nombre, servicio) {
  return {
    nombre,
    correo: `${nombre.toLowerCase()}@correo.com`,
    servicio,
    descripcion: `Problema reportado por ${nombre}.`,
    desdeCuando: 'Desde ayer',
    queIntento: 'Reiniciar el equipo',
  };
}

// Registra una solicitud con la API pública y devuelve su código.
async function crear(nombre, servicio) {
  const res = await request(app).post('/api/solicitudes').send(solicitud(nombre, servicio));
  return res.body.codigo;
}

// Cambia la fecha o el estado directo en la base para preparar cada caso.
async function actualizar(codigo, columna, valor) {
  await db.pool.query(`UPDATE solicitudes SET ${columna} = $1 WHERE codigo = $2`, [valor, codigo]);
}

describe('API del técnico (SOP-14)', () => {
  const claveOriginal = process.env.TECNICO_PASSWORD;
  let ana;
  let beto;
  let carla;

  beforeEach(async () => {
    process.env.TECNICO_PASSWORD = CLAVE;
    await usarBaseEnMemoria();

    // Se crean en este orden, pero con fechas distintas para probar el orden por fecha.
    ana = await crear('Ana', 'VPN');
    beto = await crear('Beto', 'Correo institucional');
    carla = await crear('Carla', 'WiFi / red');
    await actualizar(ana, 'creado_en', '2026-11-10T10:00:00Z');
    await actualizar(beto, 'creado_en', '2026-11-12T10:00:00Z'); // la más reciente
    await actualizar(carla, 'creado_en', '2026-11-11T10:00:00Z');
  });

  afterEach(async () => {
    if (db.pool && db.pool.end) await db.pool.end();
    db.pool = null;
  });

  afterAll(() => {
    if (claveOriginal === undefined) delete process.env.TECNICO_PASSWORD;
    else process.env.TECNICO_PASSWORD = claveOriginal;
  });

  describe('GET /api/tecnico/solicitudes', () => {
    test('sin clave responde 401 y no entrega datos', async () => {
      const res = await request(app).get('/api/tecnico/solicitudes');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Clave incorrecta' });
    });

    test('con clave incorrecta responde 401', async () => {
      const res = await request(app)
        .get('/api/tecnico/solicitudes')
        .set('X-Tecnico-Clave', 'otra-clave');

      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty('solicitudes');
    });

    test('con clave responde 200 con todas, de la más reciente a la más antigua', async () => {
      const res = await request(app)
        .get('/api/tecnico/solicitudes')
        .set('X-Tecnico-Clave', CLAVE);

      expect(res.status).toBe(200);
      expect(res.body.solicitudes.map((s) => s.codigo)).toEqual([beto, carla, ana]);
    });

    test('cada solicitud trae todos los campos, incluidos nombre y correo', async () => {
      const res = await request(app)
        .get('/api/tecnico/solicitudes')
        .set('X-Tecnico-Clave', CLAVE);

      expect(res.body.solicitudes[0]).toEqual(
        expect.objectContaining({
          codigo: beto,
          nombre: 'Beto',
          correo: 'beto@correo.com',
          servicio: 'Correo institucional',
          descripcion: 'Problema reportado por Beto.',
          desdeCuando: 'Desde ayer',
          queIntento: 'Reiniciar el equipo',
          estado: 'Recibida',
          responsable: null,
          notaTecnico: null,
          creadoEn: expect.any(String),
          actualizadoEn: expect.any(String),
        }),
      );
    });

    test('filtra por estado y el contador de abiertas no cambia con el filtro', async () => {
      await actualizar(ana, 'estado', 'Resuelta');
      await actualizar(carla, 'estado', 'En revisión');

      const enRevision = await request(app)
        .get('/api/tecnico/solicitudes')
        .query({ estado: 'En revisión' })
        .set('X-Tecnico-Clave', CLAVE);

      expect(enRevision.status).toBe(200);
      expect(enRevision.body.solicitudes.map((s) => s.codigo)).toEqual([carla]);
      // Abiertas = todas menos "Resuelta" (Beto y Carla), sin importar el filtro.
      expect(enRevision.body.abiertas).toBe(2);

      const resueltas = await request(app)
        .get('/api/tecnico/solicitudes')
        .query({ estado: 'Resuelta' })
        .set('X-Tecnico-Clave', CLAVE);

      expect(resueltas.body.solicitudes.map((s) => s.codigo)).toEqual([ana]);
      expect(resueltas.body.abiertas).toBe(2);
    });

    test('responde 400 si el estado no es uno de los del contrato', async () => {
      const res = await request(app)
        .get('/api/tecnico/solicitudes')
        .query({ estado: 'Cerrada' })
        .set('X-Tecnico-Clave', CLAVE);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Estado no válido.' });
    });
  });

  describe('GET /api/tecnico/solicitudes/:codigo', () => {
    test('sin clave responde 401', async () => {
      const res = await request(app).get(`/api/tecnico/solicitudes/${ana}`);

      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty('nombre');
    });

    test('con clave devuelve el detalle completo, aunque el código venga en minúsculas', async () => {
      const res = await request(app)
        .get(`/api/tecnico/solicitudes/${ana.toLowerCase()}`)
        .set('X-Tecnico-Clave', CLAVE);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          codigo: ana,
          nombre: 'Ana',
          correo: 'ana@correo.com',
          desdeCuando: 'Desde ayer',
          queIntento: 'Reiniciar el equipo',
        }),
      );
    });

    test('responde 404 si el código no existe', async () => {
      const res = await request(app)
        .get('/api/tecnico/solicitudes/TK-ZZZZ')
        .set('X-Tecnico-Clave', CLAVE);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'No encontramos una solicitud con ese código. Revisa que esté bien escrito.',
      });
    });
  });
});
