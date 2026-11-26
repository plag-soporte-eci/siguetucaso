// Valida la respuesta del solicitante: { texto, archivo? }.
// archivo = { nombre, tipo, datos } donde datos es el contenido en base64.
const MAX_TEXTO = 1000;
const MAX_BYTES_ARCHIVO = 2 * 1024 * 1024; // 2 MB
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'application/pdf'];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Devuelve { campos, datos }. Si campos tiene algo, la respuesta no es válida.
function validarRespuesta(cuerpo) {
  const campos = {};
  const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : '';

  if (!texto) {
    campos.texto = 'Escribe tu respuesta para el técnico.';
  } else if (texto.length > MAX_TEXTO) {
    campos.texto = `La respuesta no puede superar ${MAX_TEXTO} caracteres.`;
  }

  let archivo = null;
  if (cuerpo.archivo) {
    const { nombre, tipo, datos } = cuerpo.archivo;
    const nombreLimpio = typeof nombre === 'string' ? nombre.trim().slice(0, 200) : '';

    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      campos.archivo = 'Solo se aceptan imágenes (PNG o JPG) o PDF.';
    } else if (!nombreLimpio || typeof datos !== 'string' || !BASE64.test(datos)) {
      campos.archivo = 'No pudimos leer el archivo. Intenta adjuntarlo de nuevo.';
    } else if (Buffer.from(datos, 'base64').length > MAX_BYTES_ARCHIVO) {
      campos.archivo = 'El archivo no puede pesar más de 2 MB.';
    } else {
      archivo = { nombre: nombreLimpio, tipo, datos };
    }
  }

  return { campos, datos: { texto, archivo } };
}

module.exports = { validarRespuesta, MAX_TEXTO, MAX_BYTES_ARCHIVO, TIPOS_PERMITIDOS };
