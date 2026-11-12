// Código de seguimiento de una solicitud (SOP-12, ver AGENTS.md sección 7.5).
// Formato: "TK-" + 4 caracteres, por ejemplo "TK-7HQ2".
const crypto = require('crypto');

// Caracteres permitidos. Se quitan 0, O, 1 e I porque se confunden al leerlos o dictarlos.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Cuántos caracteres van después de "TK-".
const LARGO = 4;

// Expresión regular del formato válido: TK- seguido de 4 caracteres del ALFABETO.
const FORMATO = new RegExp(`^TK-[${ALFABETO}]{${LARGO}}$`);

// Genera un código nuevo al azar.
// crypto.randomInt da números aleatorios seguros (más difíciles de adivinar que Math.random).
// No revisa si el código ya existe: de eso se encarga el repositorio al guardar.
function generarCodigo() {
  let codigo = 'TK-';
  for (let i = 0; i < LARGO; i++) {
    const posicion = crypto.randomInt(ALFABETO.length); // número entre 0 y 31
    codigo += ALFABETO[posicion];
  }
  return codigo;
}

// Limpia lo que escribió el usuario: quita todos los espacios y pasa a mayúsculas.
// Ejemplo: "  tk- ab 12 " → "TK-AB12". Si no recibe un texto, devuelve ''.
function normalizarCodigo(texto) {
  if (typeof texto !== 'string') return '';
  return texto.replace(/\s+/g, '').toUpperCase();
}

// Indica si un texto (ya normalizado) tiene el formato de un código válido.
function esCodigoValido(texto) {
  return FORMATO.test(normalizarCodigo(texto));
}

module.exports = { ALFABETO, generarCodigo, normalizarCodigo, esCodigoValido };
