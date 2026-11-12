// Middleware que protege la API del técnico (SOP-14, contrato sección 7.4).
// Cada petición a /api/tecnico/... debe traer el encabezado X-Tecnico-Clave
// con el mismo valor de la variable de entorno TECNICO_PASSWORD.
// Si no coincide (o falta), responde 401 { error: "Clave incorrecta" }.
// No hay usuarios ni login: es una decisión consciente de océano azul.
const crypto = require('crypto');

// Convierte un texto en un resumen SHA-256 de tamaño fijo (32 bytes).
// Así las dos claves siempre miden lo mismo y se pueden comparar con
// timingSafeEqual, que tarda lo mismo acierte o falle (evita que alguien
// adivine la clave midiendo cuánto se demora la respuesta).
function resumen(texto) {
  return crypto.createHash('sha256').update(String(texto)).digest();
}

function tecnicoAuth(req, res, next) {
  // Se lee en cada petición para que las pruebas puedan cambiarla.
  const claveEsperada = process.env.TECNICO_PASSWORD;
  const claveRecibida = req.get('X-Tecnico-Clave');

  // Sin clave configurada en el servidor nadie entra (nunca dejamos el panel abierto).
  if (!claveEsperada || !claveRecibida) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }

  if (!crypto.timingSafeEqual(resumen(claveRecibida), resumen(claveEsperada))) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }

  return next();
}

module.exports = tecnicoAuth;
