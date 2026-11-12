// Pruebas de la pantalla de confirmación con el código (SOP-40, H2 parte 2).
// Se prueban las funciones de public/js/index.js y que la página traiga la confirmación.
const request = require('supertest');
const app = require('../src/app');
const { enlaceConsulta, copiarTexto } = require('../public/js/index');

describe('confirmación en index.html', () => {
  test('la página trae la confirmación con el código, el botón Copiar y el enlace a la consulta', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="confirmacion"');
    expect(res.text).toContain('id="codigo-generado"');
    expect(res.text).toContain('id="boton-copiar"');
    expect(res.text).toContain('id="enlace-consulta"');
  });
});

describe('enlaceConsulta', () => {
  test('arma el enlace a la consulta con el código', () => {
    expect(enlaceConsulta('TK-7HQ2')).toBe('consultar.html?codigo=TK-7HQ2');
  });
});

describe('copiarTexto', () => {
  test('copia el código y devuelve true cuando el portapapeles funciona', async () => {
    const portapapeles = { writeText: jest.fn().mockResolvedValue() };

    const copiado = await copiarTexto('TK-7HQ2', portapapeles);

    expect(copiado).toBe(true);
    expect(portapapeles.writeText).toHaveBeenCalledWith('TK-7HQ2');
  });

  test('devuelve false si el navegador no deja copiar', async () => {
    const portapapeles = { writeText: jest.fn().mockRejectedValue(new Error('sin permiso')) };

    expect(await copiarTexto('TK-7HQ2', portapapeles)).toBe(false);
  });

  test('devuelve false si el navegador no tiene portapapeles', async () => {
    expect(await copiarTexto('TK-7HQ2', undefined)).toBe(false);
  });
});
