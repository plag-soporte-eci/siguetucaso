// Crea y exporta la app de Express SIN llamar a listen,
// para poder probarla con Supertest.
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const healthRouter = require('./routes/health');

const app = express();

// Registra cada petición en consola (se omite durante las pruebas).
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());

// Rutas de la API
app.use(healthRouter);

// Archivos del frontend (HTML, CSS y JS) en la carpeta public/
app.use(express.static(path.join(__dirname, '..', 'public')));

module.exports = app;
