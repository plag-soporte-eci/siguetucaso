// Pruebas de la pantalla del técnico (tecnico.html: lista de SOP-14 y responsable de SOP-17).
// Se prueban las funciones de public/js/tecnico.js y que la página se sirva.
const request = require('supertest');
const app = require('../src/app');
const {
  ESTADOS,
  textoAbiertas,
  validarResponsable,
  claseDeEstado,
} = require('../public/js/tecnico');

describe('tecnico.html', () => {
  test('la página del técnico se sirve con la clave, la lista y el campo de responsable', async () => {
    const res = await request(app).get('/tecnico.html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="form-clave"');
    expect(res.text).toContain('id="lista-solicitudes"');
    expect(res.text).toContain('class="form-responsable"');
    expect(res.text).toContain('js/tecnico.js');
  });

  test('se abre en /tecnico, sin escribir .html (criterio 1 de SOP-14)', async () => {
    const res = await request(app).get('/tecnico');

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="form-clave"');
  });

  test('las demás páginas también abren sin .html y lo que no existe sigue en 404', async () => {
    const consultar = await request(app).get('/consultar');
    const noExiste = await request(app).get('/no-existe');

    expect(consultar.status).toBe(200);
    expect(consultar.text).toContain('js/consultar.js');
    expect(noExiste.status).toBe(404);
  });

  test('usa exactamente los estados del contrato (sección 7.2)', () => {
    expect(ESTADOS).toEqual(['Recibida', 'En revisión', 'Esperando tu respuesta', 'Resuelta']);
  });
});

describe('validarResponsable', () => {
  test('acepta un nombre', () => {
    expect(validarResponsable('Carlos Gómez')).toBe('');
  });

  test('rechaza vacío o solo espacios', () => {
    expect(validarResponsable('')).not.toBe('');
    expect(validarResponsable('   ')).not.toBe('');
  });

  test('acepta 100 caracteres y rechaza 101', () => {
    expect(validarResponsable('a'.repeat(100))).toBe('');
    expect(validarResponsable('a'.repeat(101))).not.toBe('');
  });
});

describe('ayudas de la pantalla', () => {
  test('el contador usa singular y plural', () => {
    expect(textoAbiertas(1)).toBe('abierta');
    expect(textoAbiertas(0)).toBe('abiertas');
    expect(textoAbiertas(3)).toBe('abiertas');
  });

  test('convierte el estado en una clase CSS sin tildes ni espacios', () => {
    expect(claseDeEstado('En revisión')).toBe('estado-en-revision');
    expect(claseDeEstado('Esperando tu respuesta')).toBe('estado-esperando-tu-respuesta');
  });
});
