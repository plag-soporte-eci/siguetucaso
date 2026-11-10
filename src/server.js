// Punto de entrada: carga las variables de .env y arranca el servidor.
require('dotenv').config({ quiet: true });

const app = require('./app');
const { version } = require('../package.json');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SigueTuCaso v${version} escuchando en http://localhost:${PORT}`);
  console.log(
    process.env.DATABASE_URL
      ? 'Base de datos: configurada (DATABASE_URL)'
      : 'Base de datos: sin configurar (falta DATABASE_URL), la app funciona sin base'
  );
});
