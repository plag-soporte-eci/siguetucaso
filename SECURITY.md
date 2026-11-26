# Política de seguridad

## Versiones con soporte

| Versión | Soporte |
|---|---|
| 2.1.x (la que está en la [demo](https://siguetucaso.onrender.com)) | ✅ |
| Anteriores | ❌ |

## Cómo reportar una vulnerabilidad

**No abras un issue público** con los detalles de una vulnerabilidad: cualquiera podría leerlo antes de que se corrija.

1. Repórtala en privado desde la pestaña **Security** del repositorio → **Report a vulnerability**.
2. Si esa opción no aparece, abre un issue que diga solo "Tengo un reporte de seguridad" (sin detalles) y el equipo te contactará por un canal privado.

Incluye, si puedes: qué parte de la app afecta, cómo reproducirla y qué impacto tiene.

Si encuentras una clave o contraseña expuesta, avísanos de inmediato: además de borrarla del repositorio hay que **cambiarla** (en Neon, en Render o donde corresponda), porque el historial de Git la conserva.

## Controles que tiene el proyecto

### En el código
- **Sin secretos en el repositorio:** `DATABASE_URL` y `TECNICO_PASSWORD` solo viven en `.env` (ignorado por Git) y en el panel de Render. `.env.example` tiene solo los nombres.
- **Consultas SQL parametrizadas** (`$1`, `$2`…) en `src/repositories/solicitudes.js`: los datos del usuario nunca se pegan dentro del SQL.
- **Clave del técnico** comparada con `crypto.timingSafeEqual` en `src/middleware/tecnicoAuth.js`, para no dar pistas por el tiempo de respuesta.
- **Lo que escriben los solicitantes se muestra con `textContent`** en el navegador: no se interpreta como HTML.
- **Archivos adjuntos limitados:** solo PNG, JPG o PDF de máximo 2 MB, y se descargan como archivo (no se abren dentro de la app).
- **Cabeceras de seguridad** en todas las respuestas (`src/app.js`): sin `X-Powered-By`, con `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: no-referrer`.
- **Logs sin claves:** morgan no registra encabezados y ningún mensaje imprime las variables de entorno.

### En el ciclo de entrega (DevSecOps)
- **`main` protegida:** todo entra por Pull Request, con revisión de otro integrante y el CI en verde.
- **CI con permisos mínimos:** el token de GitHub del workflow solo puede leer el código.
- **`npm audit`** en cada PR: el CI falla si una dependencia de producción tiene una vulnerabilidad alta o crítica.
- **gitleaks** en cada PR: revisa todo el historial buscando contraseñas, tokens y cadenas de conexión. Usa las reglas de gitleaks más una propia para la `DATABASE_URL` de PostgreSQL/Neon (`.gitleaks.toml`).
- **Dependabot:** cada lunes revisa npm y GitHub Actions y abre PRs con las versiones nuevas.
