// Pruebas de la pantalla de consulta (SOP-13, parte frontend).
// Se prueban las funciones de public/js/consultar.js y que la página se sirva.
const request = require('supertest');
const app = require('../src/app');
const {
  ESTADOS,
  prepararCodigo,
  validarCodigo,
  calcularPasos,
  formatearFecha,
} = require('../public/js/consultar');

describe('consultar.html', () => {
  test('la página de consulta se sirve con el campo del código', async () => {
    const res = await request(app).get('/consultar.html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="codigo"');
    expect(res.text).toContain('js/consultar.js');
  });

  test('usa exactamente los estados del contrato (sección 7.2)', () => {
    expect(ESTADOS).toEqual(['Recibida', 'En revisión', 'Esperando tu respuesta', 'Resuelta']);
  });
});

describe('prepararCodigo', () => {
  test('pasa a mayúsculas y quita espacios', () => {
    expect(prepararCodigo('  tk-7q h4 ')).toBe('TK-7QH4');
  });

  test('agrega "TK-" si solo escriben los 4 caracteres', () => {
    expect(prepararCodigo('7qh4')).toBe('TK-7QH4');
  });
});

describe('validarCodigo', () => {
  test('acepta un código con el formato correcto', () => {
    expect(validarCodigo('TK-7QH4')).toBe('');
  });

  test('pide el código si está vacío', () => {
    expect(validarCodigo('')).toMatch(/Escribe tu código/);
  });

  test('rechaza formatos inválidos y caracteres que no usa el código (0, O, 1, I)', () => {
    expect(validarCodigo('TK-12')).not.toBe('');
    expect(validarCodigo('XX-ABCD')).not.toBe('');
    expect(validarCodigo('TK-AB0O')).not.toBe('');
    expect(validarCodigo('TK-AB1I')).not.toBe('');
  });
});

describe('calcularPasos', () => {
  test('marca los pasos anteriores como hechos y el estado como actual', () => {
    const pasos = calcularPasos('En revisión');

    expect(pasos.map((p) => p.tipo)).toEqual(['hecho', 'actual', 'pendiente', 'pendiente']);
    expect(pasos.map((p) => p.nombre)).toEqual(ESTADOS);
  });

  test('una solicitud recién creada solo tiene "Recibida" como actual', () => {
    expect(calcularPasos('Recibida')[0].tipo).toBe('actual');
  });

  test('una solicitud resuelta tiene todos los pasos anteriores hechos', () => {
    expect(calcularPasos('Resuelta').map((p) => p.tipo)).toEqual([
      'hecho',
      'hecho',
      'hecho',
      'actual',
    ]);
  });
});

describe('formatearFecha', () => {
  test('muestra un guion si no hay fecha válida', () => {
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('no-es-fecha')).toBe('—');
  });

  test('devuelve un texto legible para una fecha ISO', () => {
    expect(formatearFecha('2026-11-11T15:30:00.000Z')).toMatch(/2026/);
  });
});
