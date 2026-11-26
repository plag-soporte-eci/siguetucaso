// Crea y exporta la app de Express SIN llamar a listen,
// para poder probarla con Supertest.
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const healthRouter = require('./routes/health');
const solicitudesRouter = require('./routes/solicitudes');
const tecnicoRouter = require('./routes/tecnico');

const app = express();

// Cabeceras de seguridad básicas (SOP-48), sin librerías extra.
// No anunciar que el servidor usa Express: menos pistas para un atacante.
app.disable('x-powered-by');
app.use((req, res, next) => {
  // El navegador no "adivina" el tipo de un archivo: usa el que dice el servidor.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Ningún otro sitio puede mostrar la app dentro de un <iframe> (evita el clickjacking).
  res.setHeader('X-Frame-Options', 'DENY');
  // No se envía a otros sitios la página de donde viene el usuario.
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Registra cada petición en consola (se omite durante las pruebas).
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 3 MB alcanza para un adjunto de 2 MB en base64 (SOP-44).
app.use(express.json({ limit: '3mb' }));

app.use(healthRouter);
app.use(solicitudesRouter);
app.use(tecnicoRouter); // SOP-14: API del técnico (exige X-Tecnico-Clave)

// Archivos del frontend (HTML, CSS y JS) en la carpeta public/.
// extensions: ['html'] deja abrir las páginas sin escribir .html,
// por ejemplo /tecnico (criterio 1 de SOP-14) o /consultar.
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

module.exports = app;
