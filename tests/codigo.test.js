const {
  generarCodigo,
  normalizarCodigo,
  esCodigoValido,
} = require('../src/services/codigo');

// Genera muchos códigos una sola vez para usarlos en varias pruebas.
const codigos = Array.from({ length: 500 }, () => generarCodigo());

describe('generarCodigo', () => {
  test('500 códigos cumplen el formato TK-XXXX', () => {
    for (const codigo of codigos) {
      expect(codigo).toMatch(/^TK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    }
  });

  test('ningún código contiene 0, O, 1 ni I', () => {
    for (const codigo of codigos) {
      // Se revisa solo la parte aleatoria (después de "TK-").
      expect(codigo.slice(3)).not.toMatch(/[0O1I]/);
    }
  });

  test('en 500 códigos hay al menos 490 distintos', () => {
    const distintos = new Set(codigos);
    expect(distintos.size).toBeGreaterThanOrEqual(490);
  });
});

describe('normalizarCodigo', () => {
  test('quita espacios y pasa a mayúsculas', () => {
    expect(normalizarCodigo('  tk-ab12 ')).toBe('TK-AB12');
    expect(normalizarCodigo('tk- ab 12')).toBe('TK-AB12');
  });

  test('devuelve "" si no recibe un texto', () => {
    expect(normalizarCodigo(null)).toBe('');
  });
});

describe('esCodigoValido', () => {
  test('acepta códigos bien escritos, aunque tengan espacios o minúsculas', () => {
    expect(esCodigoValido('TK-AB2C')).toBe(true);
    expect(esCodigoValido(' tk-ab2c ')).toBe(true);
  });

  test('rechaza códigos con formato incorrecto', () => {
    expect(esCodigoValido('TK-AB0C')).toBe(false); // tiene 0
    expect(esCodigoValido('TK-ABC')).toBe(false); // le falta un carácter
    expect(esCodigoValido('AB-1234')).toBe(false); // no empieza por TK-
    expect(esCodigoValido('')).toBe(false); // vacío
  });
});
