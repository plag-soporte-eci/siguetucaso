// Crea y exporta la app de Express SIN llamar a listen,
// para poder probarla con Supertest.
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const healthRouter = require('./routes/health');
const solicitudesRouter = require('./routes/solicitudes');
const tecnicoRouter = require('./routes/tecnico');

const app = express();

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
