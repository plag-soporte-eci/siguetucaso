# SigueTuCaso – Solicitudes de soporte

Reporta tu problema una sola vez, con lo necesario, y consulta cuando quieras en qué va, sin tener que escribirle a nadie.

Proyecto final de **Pensamiento Lean y Agile** – Escuela Colombiana de Ingeniería Julio Garavito.

## Equipo
| Integrante | Rol |
|---|---|
| Juan Sebastián Ortega Muñoz | Product Owner + Developer |
| Sebastián Albarracín Silva | Scrum Master + Developer Frontend |
| Nicolas Toro | Developer – Backend y calidad |
| David Salomón Baena Rubio | Developer – DevOps |

## Enlaces
- Tablero Jira: https://plag-soporte-eci.atlassian.net/jira/software/projects/SOP/boards/1
- Demo desplegada: _(link)_
- Health check: _(link)/health_

## Stack
| Tecnología | Por qué |
|---|---|
| Node.js 20 LTS | Versión estable con soporte largo; un solo lenguaje (JavaScript) en frontend y backend. |
| Express | Framework web mínimo y muy documentado para crear las rutas de la API. |
| HTML, CSS y JavaScript plano (`public/`) | Sin frameworks ni bundlers: fácil de entender y servido directamente por Express. |
| PostgreSQL (Neon) + `pg` | Base de datos relacional gratis en la nube (Neon); `pg` es el cliente estándar de Node. |
| dotenv | Carga la configuración desde `.env` para no dejar secretos en el código. |
| morgan | Registra cada petición en la consola para depurar y revisar logs del despliegue. |
| Jest + Supertest | Pruebas automatizadas de los endpoints sin levantar el servidor. |
| pg-mem | Base PostgreSQL en memoria para las pruebas, sin depender de una base real. |

## Estructura
```
src/
  app.js            # crea y exporta la app de Express (sin listen, para pruebas)
  server.js         # arranca el servidor en PORT
  db.js             # conexión a PostgreSQL con DATABASE_URL
  routes/health.js  # GET /health
public/             # frontend: index.html, styles.css, app.js
tests/              # pruebas con Jest + Supertest
```

## Cómo ejecutar el proyecto
1. **Requisitos:** Node.js 20 o superior (`node -v`) y npm. PostgreSQL es opcional en local.
2. **Clonar:**
   ```bash
   git clone https://github.com/plag-soporte-eci/siguetucaso.git
   cd siguetucaso
   ```
3. **Instalar dependencias:**
   ```bash
   npm install
   ```
4. **Configurar el entorno:** copiar `.env.example` a `.env` y llenar los valores (pedirlos al equipo, **nunca** subirlos al repo).
   ```bash
   cp .env.example .env
   ```
   Si `DATABASE_URL` queda vacía, la app arranca igual y lo indica en el log.
5. **Ejecutar:**
   ```bash
   npm start      # modo normal
   npm run dev    # se reinicia solo al guardar cambios
   ```
   Abrir http://localhost:3000
6. **Ejecutar pruebas:**
   ```bash
   npm test
   ```
7. **Verificar `/health`:** con el servidor corriendo, abrir http://localhost:3000/health o:
   ```bash
   curl http://localhost:3000/health
   ```
   Respuesta esperada:
   ```json
   { "status": "ok", "version": "0.1.0", "db": "sin configurar", "time": "2026-11-10T17:00:00.000Z" }
   ```
   `db` puede ser `"ok"` (la base responde), `"sin configurar"` (no hay `DATABASE_URL`) o `"error"` (la base no responde). `version` sale de `package.json` y sirve para confirmar qué versión está desplegada (por ejemplo, después de un rollback).

## Despliegue (Render + Neon)
La demo corre gratis en **Render** (la app) y **Neon** (la base PostgreSQL). Cada merge a `main` se despliega solo, pero únicamente si el CI quedó en verde.

**Dependencias:** cuenta en [Neon](https://console.neon.tech) y en [Render](https://dashboard.render.com), y que la app de GitHub de Render tenga acceso al repositorio `plag-soporte-eci/siguetucaso` (si no aparece, lo aprueba un admin de la organización).

### 1. Base de datos en Neon
1. **New project** → nombre `siguetucaso`, región **AWS US East (N. Virginia)** (la misma zona de Render, para que la app y la base estén cerca).
2. En **Connect** copiar la cadena **pooled** (el host termina en `-pooler`):
   `postgresql://usuario:clave@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
3. Esa cadena **no se pega en ningún archivo del repositorio**: solo en Render (y, si quieres probar con base real, en tu `.env` local).

La tabla `solicitudes` no se crea a mano: la crea `src/initDb.js` al arrancar la app (SOP-11).

### 2. Web service en Render
1. **New → Web Service** → elegir el repositorio `plag-soporte-eci/siguetucaso`.
2. Configuración:

   | Campo | Valor |
   |---|---|
   | Name | `siguetucaso` |
   | Region | Virginia (US East) |
   | Branch | `main` |
   | Language | Node |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Instance Type | Free |

3. **Environment Variables** (se guardan en Render, nunca en el repositorio):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | Cadena *pooled* de Neon |
   | `TECNICO_PASSWORD` | Clave del panel del técnico (se comparte con el equipo por privado) |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `20` (la misma versión del CI) |

   `PORT` no se configura: Render la pone sola y `src/server.js` la usa.
4. **Create Web Service** y esperar el primer deploy.
5. **Settings → Health Checks → Path:** `/health`. Render lo consulta cada pocos segundos y no pasa tráfico a un deploy nuevo que no responda.
6. **Settings → Build & Deploy → Auto-Deploy:** **After CI Checks Pass**. Así un merge a `main` se despliega solo, pero nunca si el CI (`ci.yml`) falló.

### 3. Verificar
- Abrir `https://<servicio>.onrender.com/health` → debe responder `"status": "ok"` y `"db": "ok"`.
- En **Logs** de Render debe aparecer `SigueTuCaso v… escuchando…` y `Base de datos: configurada (DATABASE_URL)`.
- Hacer merge de un PR y revisar en **Events** que arrancó un deploy nuevo con ese commit.

> **Antes de cada demo:** el plan gratis de Render se duerme tras 15 minutos sin tráfico y el primer acceso tarda cerca de un minuto en despertar. Abrir `/health` 1–2 minutos antes. Neon también suspende la base tras 5 minutos sin consultas y se despierta sola con la primera.

## Cómo trabajamos
Antes de empezar, lee [AGENTS.md](AGENTS.md): flujo de trabajo, tareas de cada uno y contrato técnico.

Ver [CONTRIBUTING.md](CONTRIBUTING.md) y la [Definición de Terminado](docs/definicion-de-terminado.md).

## Versiones y rollback
| Versión | Sprint | Contenido |
|---|---|---|
| v1.0 | 1 | Registrar solicitud y consultar estado con código |
| v2.0 | 2 | Panel del técnico |

Rollback: _(se documenta en el Sprint 2)_

## Componentes reutilizados y uso de IA
| Componente / herramienta | Uso | Licencia |
|---|---|---|
| [express](https://expressjs.com/) | Servidor web y rutas | MIT |
| [pg](https://node-postgres.com/) | Cliente de PostgreSQL | MIT |
| [dotenv](https://github.com/motdotla/dotenv) | Variables de entorno desde `.env` | BSD-2-Clause |
| [morgan](https://github.com/expressjs/morgan) | Logs de peticiones HTTP | MIT |
| [jest](https://jestjs.io/) | Pruebas automatizadas (desarrollo) | MIT |
| [supertest](https://github.com/ladjs/supertest) | Pruebas de endpoints HTTP (desarrollo) | MIT |
| [pg-mem](https://github.com/oguimbal/pg-mem) | PostgreSQL en memoria para pruebas (desarrollo) | MIT |
| Claude (IA) | Apoyo en documentación, plantillas y esqueleto inicial de la app | – |
