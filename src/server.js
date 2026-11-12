// Punto de entrada: carga las variables de .env y arranca el servidor.
require('dotenv').config({ quiet: true });

const app = require('./app');
const { version } = require('../package.json');
const { initDb } = require('./initDb');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`SigueTuCaso v${version} escuchando en http://localhost:${PORT}`);
      console.log(
        process.env.DATABASE_URL
          ? 'Base de datos: configurada (DATABASE_URL)'
          : 'Base de datos: sin configurar (falta DATABASE_URL), la app funciona sin base'
      );
    });
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error.message);
    process.exitCode = 1;
  }
}

iniciarServidor();
