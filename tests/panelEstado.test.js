// Pruebas de la pantalla para cambiar el estado en el panel del técnico (SOP-15 y SOP-16).
// Se prueban las funciones de public/js/tecnico.js y que la página traiga el formulario.
const request = require('supertest');
const app = require('../src/app');
const {
  MAX_NOTA,
  validarCambioEstado,
  nuevoTotalAbiertas,
} = require('../public/js/tecnico');

describe('tecnico.html', () => {
  test('cada solicitud trae el formulario de estado con el campo de nota', async () => {
    const res = await request(app).get('/tecnico.html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('class="form-estado"');
    expect(res.text).toContain('class="s-nuevo-estado"');
    expect(res.text).toContain('class="s-nota"');
  });
});

describe('validarCambioEstado', () => {
  test('acepta un estado del contrato sin nota', () => {
    expect(validarCambioEstado('En revisión', '')).toEqual({});
    expect(validarCambioEstado('Resuelta')).toEqual({});
  });

  test('rechaza un estado que no está en la lista', () => {
    expect(validarCambioEstado('Cerrada', '').estado).toBeDefined();
  });

  test('"Esperando tu respuesta" exige una nota', () => {
    expect(validarCambioEstado('Esperando tu respuesta', '   ').nota).toBeDefined();
    expect(validarCambioEstado('Esperando tu respuesta', 'Envíanos una captura')).toEqual({});
  });

  test('la nota acepta 300 caracteres y rechaza 301', () => {
    expect(validarCambioEstado('Esperando tu respuesta', 'a'.repeat(MAX_NOTA))).toEqual({});
    expect(validarCambioEstado('Esperando tu respuesta', 'a'.repeat(MAX_NOTA + 1)).nota).toBeDefined();
  });
});

describe('nuevoTotalAbiertas', () => {
  test('resta una al resolver y suma una al reabrir', () => {
    expect(nuevoTotalAbiertas(3, 'En revisión', 'Resuelta')).toBe(2);
    expect(nuevoTotalAbiertas(2, 'Resuelta', 'En revisión')).toBe(3);
  });

  test('no cambia si sigue abierta o sigue resuelta', () => {
    expect(nuevoTotalAbiertas(3, 'Recibida', 'Esperando tu respuesta')).toBe(3);
    expect(nuevoTotalAbiertas(3, 'Resuelta', 'Resuelta')).toBe(3);
  });
});
