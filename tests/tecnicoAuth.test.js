// Pruebas del middleware de la clave del técnico (SOP-14).
// Se monta el middleware en una app pequeña de prueba porque las rutas
// del técnico (src/routes/tecnico.js) se agregan en la misma historia más adelante.
const express = require('express');
const request = require('supertest');
const tecnicoAuth = require('../src/middleware/tecnicoAuth');

function appDePrueba() {
  const app = express();
  app.get('/api/tecnico/solicitudes', tecnicoAuth, (req, res) => {
    res.status(200).json({ abiertas: 0, solicitudes: [] });
  });
  return app;
}

describe('tecnicoAuth', () => {
  const claveOriginal = process.env.TECNICO_PASSWORD;

  beforeEach(() => {
    process.env.TECNICO_PASSWORD = 'clave-de-prueba';
  });

  afterAll(() => {
    if (claveOriginal === undefined) delete process.env.TECNICO_PASSWORD;
    else process.env.TECNICO_PASSWORD = claveOriginal;
  });

  test('sin el encabezado X-Tecnico-Clave responde 401 "Clave incorrecta"', async () => {
    const res = await request(appDePrueba()).get('/api/tecnico/solicitudes');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Clave incorrecta' });
  });

  test('con una clave incorrecta responde 401 y no entrega datos', async () => {
    const res = await request(appDePrueba())
      .get('/api/tecnico/solicitudes')
      .set('X-Tecnico-Clave', 'otra-clave');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Clave incorrecta' });
    expect(res.body).not.toHaveProperty('solicitudes');
  });

  test('con la clave correcta deja pasar la petición (200)', async () => {
    const res = await request(appDePrueba())
      .get('/api/tecnico/solicitudes')
      .set('X-Tecnico-Clave', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ abiertas: 0, solicitudes: [] });
  });

  test('si TECNICO_PASSWORD no está configurada, nadie entra', async () => {
    delete process.env.TECNICO_PASSWORD;

    const res = await request(appDePrueba())
      .get('/api/tecnico/solicitudes')
      .set('X-Tecnico-Clave', 'cualquier-cosa');

    expect(res.status).toBe(401);
  });
});
