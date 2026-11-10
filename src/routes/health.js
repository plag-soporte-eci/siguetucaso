// GET /health: indica si la app está viva, qué versión está desplegada
// y si la base de datos responde. Sirve para monitoreo y para validar un rollback.
const express = require('express');
const { version } = require('../../package.json');
const { checkDatabase } = require('../db');

const router = express.Router();

router.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'ok',
    version,
    db: await checkDatabase(),
    time: new Date().toISOString(),
  });
});

module.exports = router;
