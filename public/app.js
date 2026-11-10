// Consulta GET /health y muestra si el servicio está disponible.
// Punto de partida para el frontend: aquí se irá agregando la lógica de la app.
const estado = document.getElementById('estado');

fetch('/health')
  .then((res) => res.json())
  .then((data) => {
    estado.textContent = `en línea (v${data.version})`;
    estado.className = 'ok';
  })
  .catch(() => {
    estado.textContent = 'no disponible';
    estado.className = 'error';
  });
