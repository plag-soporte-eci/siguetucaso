// Pruebas de las cabeceras de seguridad (SOP-48).
// Toda respuesta de la app (API, páginas y errores) debe traerlas,
// y ninguna debe anunciar que el servidor es Express.
const request = require('supertest');
const app = require('../src/app');

const CABECERAS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

function revisarCabeceras(res) {
  Object.entries(CABECERAS).forEach(([nombre, valor]) => {
    expect(res.headers[nombre]).toBe(valor);
  });
  expect(res.headers).not.toHaveProperty('x-powered-by');
}

describe('cabeceras de seguridad', () => {
  test('las trae la API (/health)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    revisarCabeceras(res);
  });

  test('las traen las páginas del frontend', async () => {
    const res = await request(app).get('/tecnico.html');

    expect(res.status).toBe(200);
    revisarCabeceras(res);
  });

  test('las traen también los errores (401 sin clave y 404)', async () => {
    const sinClave = await request(app).get('/api/tecnico/solicitudes');
    const noExiste = await request(app).get('/no-existe');

    expect(sinClave.status).toBe(401);
    revisarCabeceras(sinClave);
    expect(noExiste.status).toBe(404);
    revisarCabeceras(noExiste);
  });
});
