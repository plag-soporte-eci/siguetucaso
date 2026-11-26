<div align="center">

# SigueTuCaso

**Reporta tu problema de TI una sola vez y consulta en qué va, sin iniciar sesión.**

[![CI](https://github.com/plag-soporte-eci/siguetucaso/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/plag-soporte-eci/siguetucaso/actions/workflows/ci.yml)
[![Versión](https://img.shields.io/github/v/release/plag-soporte-eci/siguetucaso?label=versi%C3%B3n)](https://github.com/plag-soporte-eci/siguetucaso/releases)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue)](LICENSE)

[**Probar la demo**](https://siguetucaso.onrender.com) · [Consultar un caso](https://siguetucaso.onrender.com/consultar.html) · [Panel del técnico](https://siguetucaso.onrender.com/tecnico.html) · [Tablero Jira](https://plag-soporte-eci.atlassian.net/jira/software/projects/SOP/boards/1)

Proyecto final de **Pensamiento Lean y Agile** · Escuela Colombiana de Ingeniería Julio Garavito

</div>

---

## Tabla de contenido
- [El problema](#el-problema)
- [Qué hace](#qué-hace)
- [Cómo se ve](#cómo-se-ve)
- [Cómo funciona](#cómo-funciona)
- [Ejecutarlo en tu computador](#ejecutarlo-en-tu-computador)
- [API](#api)
- [Stack y estructura](#stack-y-estructura)
- [Despliegue (Render + Neon)](#despliegue-render--neon)
- [Operación: logs, salud y rollback](#operación-logs-salud-y-rollback)
- [Seguridad (DevSecOps)](#seguridad-devsecops)
- [Versiones](#versiones)
- [Equipo y forma de trabajo](#equipo-y-forma-de-trabajo)
- [Componentes reutilizados y uso de IA](#componentes-reutilizados-y-uso-de-ia)

## El problema
En las entrevistas con quienes piden soporte TI encontramos que **nadie sabe en qué va su solicitud**. Cada persona insiste unas dos veces por caso, el técnico recibe de 5 a 10 mensajes de "¿en qué va mi caso?" al día y algunos casos se pierden.

| Indicador | Antes | Meta |
|---|---|---|
| Tiempo para conocer el estado de una solicitud | 3 a 4 horas | **menos de 30 segundos** |

## Qué hace

**Quien pide soporte (sin cuenta ni contraseña)**
- Reporta su problema en un formulario corto y guiado.
- Recibe un **código de seguimiento** (`TK-7QH4`) que puede copiar con un toque.
- Consulta con ese código en qué va su caso, quién lo atiende y si el técnico le pide algo.
- Responde lo que le piden, con texto y un archivo opcional (imagen o PDF).

**El técnico (con una clave)**
- Ve **todas las solicitudes en un solo lugar**, de la más reciente a la más antigua, con un contador de abiertas.
- Filtra por estado, asigna responsable y cambia el estado.
- Pide información con el estado **"Esperando tu respuesta"** y una nota, y recibe la respuesta en el mismo panel.

### Decisiones de océano azul
| Acción | Decisión |
|---|---|
| Eliminar | El inicio de sesión del solicitante |
| Reducir | El formulario: solo los campos necesarios |
| Crear | El código de seguimiento y el estado "Esperando tu respuesta" con nota |

## Cómo se ve

| Reportar | Consultar y responder | Panel del técnico |
|---|---|---|
| ![Formulario para reportar un problema](docs/capturas/reportar.jpg) | ![Consulta de una solicitud que espera la respuesta del solicitante](docs/capturas/consultar.jpg) | ![Panel del técnico con las solicitudes y sus estados](docs/capturas/panel-tecnico.jpg) |

El diseño sigue la identidad visual de DiNNo (crema, petróleo y naranja, fuente Plus Jakarta Sans), está pensado primero para celular y tiene modo oscuro automático.

## Cómo funciona

```mermaid
flowchart LR
  A[Solicitante reporta] -->|recibe TK-XXXX| B(Recibida)
  B --> C(En revisión)
  C -->|el técnico pide algo| D(Esperando tu respuesta)
  D -->|el solicitante responde| C
  C --> E(Resuelta)
```

1. **Reportar:** en la página principal se llena el formulario y aparece el código con el botón **Copiar**.
2. **Consultar:** en [`/consultar.html`](https://siguetucaso.onrender.com/consultar.html) se escribe el código y se ve la línea de pasos del estado.
3. **Atender:** en [`/tecnico.html`](https://siguetucaso.onrender.com/tecnico.html) el técnico entra con su clave, asigna responsable y cambia el estado.
4. **Responder:** si el técnico pide algo, el solicitante lo ve al consultar y responde ahí mismo; la solicitud vuelve sola a "En revisión".

> La demo usa el plan gratis de Render: si nadie la ha abierto en 15 minutos, la primera carga tarda cerca de un minuto en despertar.

## Ejecutarlo en tu computador

**Requisitos:** Node.js 20 o superior (`node -v`) y npm. PostgreSQL es opcional.

```bash
git clone https://github.com/plag-soporte-eci/siguetucaso.git
cd siguetucaso
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:3000. `npm run dev` reinicia el servidor al guardar cambios; `npm start` lo corre en modo normal.

**Variables de entorno** (en `.env`, que nunca se sube al repositorio):

| Variable | Para qué |
|---|---|
| `PORT` | Puerto local (por defecto 3000) |
| `DATABASE_URL` | Conexión a PostgreSQL. Si queda vacía, la app arranca igual y lo indica en el log |
| `TECNICO_PASSWORD` | Clave del panel del técnico |

Los valores reales se piden al equipo por privado.

**Pruebas:**
```bash
npm test
```
Usan Jest, Supertest y una base PostgreSQL en memoria (pg-mem), así que no necesitan una base real. Las mismas pruebas corren en GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) en cada push y Pull Request; un PR con pruebas en rojo no se puede integrar.

**Verificar que está viva:**
```bash
curl http://localhost:3000/health
```
```json
{ "status": "ok", "version": "2.1.0", "db": "ok", "time": "2026-11-26T15:00:00.000Z" }
```
`db` puede ser `ok` (la base responde), `sin configurar` (no hay `DATABASE_URL`) o `error` (la base no responde). `version` sale de `package.json` y confirma qué versión está desplegada.

## API
Todas las respuestas son JSON. Los errores llegan como `{ "error": "mensaje" }` y los de validación agregan `campos` con el mensaje de cada campo.

**Públicas (sin login)**

| Método y ruta | Qué hace |
|---|---|
| `POST /api/solicitudes` | Registra una solicitud y devuelve su código |
| `GET /api/solicitudes/:codigo` | Consulta el estado (nunca devuelve nombre ni correo) |
| `POST /api/solicitudes/:codigo/respuesta` | El solicitante responde lo que le pidió el técnico |
| `GET /health` | Estado de la app y de la base |

**Del técnico** (exigen el encabezado `X-Tecnico-Clave`)

| Método y ruta | Qué hace |
|---|---|
| `GET /api/tecnico/solicitudes?estado=` | Lista todas las solicitudes y cuántas están abiertas |
| `GET /api/tecnico/solicitudes/:codigo` | Detalle completo de una solicitud |
| `PATCH /api/tecnico/solicitudes/:codigo/estado` | Cambia el estado (con nota si es "Esperando tu respuesta") |
| `PATCH /api/tecnico/solicitudes/:codigo/responsable` | Asigna quién atiende |
| `GET /api/tecnico/solicitudes/:codigo/respuestas/:id/archivo` | Descarga el archivo que adjuntó el solicitante |

El contrato completo, con cuerpos, respuestas y errores, está en la [sección 7 de AGENTS.md](AGENTS.md#7-contrato-técnico-obligatorio-para-todos-y-para-la-ia).

## Stack y estructura

| Tecnología | Por qué |
|---|---|
| Node.js 20 LTS + Express | Un solo lenguaje en todo el proyecto y un servidor web mínimo y muy documentado |
| HTML, CSS y JavaScript planos | Sin frameworks ni compilación: fácil de entender y servido directo por Express |
| PostgreSQL (Neon) + `pg` | Base relacional gratis en la nube; `pg` es el cliente estándar de Node |
| dotenv y morgan | Configuración desde `.env` sin secretos en el código, y logs de cada petición |
| Jest, Supertest y pg-mem | Pruebas de la API sin levantar el servidor ni usar una base real |

```
src/
  app.js                       crea la app de Express (sin listen, para las pruebas)
  server.js                    arranca el servidor y crea las tablas
  db.js                        conexión a PostgreSQL
  constantes.js                estados y servicios
  schema.sql                   tablas solicitudes y respuestas
  services/                    código de seguimiento y validación de respuestas
  repositories/solicitudes.js  todas las consultas SQL
  middleware/tecnicoAuth.js    valida la clave del técnico
  routes/                      health, API pública y API del técnico
public/
  index.html                   reportar un problema
  consultar.html               consultar por código y responder
  tecnico.html                 panel del técnico
  styles.css, js/              estilos y un archivo JS por página
  fonts/                       fuente Plus Jakarta Sans
tests/                         una prueba por historia
```

## Despliegue (Render + Neon)
La demo corre gratis en **Render** (la app) y **Neon** (la base PostgreSQL). Cada merge a `main` se despliega solo, pero solo si el CI quedó en verde.

<details>
<summary><strong>Paso a paso para configurarlo</strong></summary>

**Dependencias:** cuenta en [Neon](https://console.neon.tech) y en [Render](https://dashboard.render.com), y que la app de GitHub de Render tenga acceso al repositorio `plag-soporte-eci/siguetucaso` (si no aparece, lo aprueba un admin de la organización).

### 1. Base de datos en Neon
1. **New project** → nombre `siguetucaso`, región **AWS US East (N. Virginia)**, la misma zona de Render.
2. En **Connect** copiar la cadena **pooled** (el host termina en `-pooler`):
   `postgresql://usuario:clave@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
3. Esa cadena **no se pega en ningún archivo del repositorio**: solo en Render y, si quieres probar con base real, en tu `.env` local.

Las tablas no se crean a mano: las crea `src/initDb.js` al arrancar la app.

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
   | `TECNICO_PASSWORD` | Clave del panel del técnico |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `20` (la misma versión del CI) |

   `PORT` no se configura: Render la pone sola.
4. **Create Web Service** y esperar el primer deploy.
5. **Settings → Health Checks → Path:** `/health`. Render no pasa tráfico a un deploy nuevo que no responda.
6. **Settings → Build & Deploy → Auto-Deploy:** **After CI Checks Pass**, para que nunca se despliegue un commit con el CI en rojo.

### 3. Verificar
- `https://<servicio>.onrender.com/health` debe responder `"status": "ok"` y `"db": "ok"`.
- En **Logs** debe aparecer `SigueTuCaso v… escuchando…` y `Base de datos: configurada (DATABASE_URL)`.
- Después de un merge, en **Events** debe aparecer un deploy nuevo con ese commit.

**Antes de cada demo:** abrir `/health` uno o dos minutos antes. Render se duerme tras 15 minutos sin tráfico y Neon suspende la base tras 5 minutos sin consultas; ambos despiertan solos.

</details>

## Operación: logs, salud y rollback

<details>
<summary><strong>Logs</strong></summary>

- **Dónde verlos:** Render → servicio → **Logs** (en vivo y con buscador). Los deploys y los rollbacks aparecen en **Events**.
- **Qué registra la app:**
  - Al arrancar: `SigueTuCaso v<versión> escuchando en …` y si la base está configurada (nunca imprime la cadena de conexión).
  - Cada petición: método, ruta, código de respuesta y tiempo. Ejemplo: `GET /health 200 5.0 ms`.
  - Errores de la base: `Error al verificar la base de datos: <mensaje>`.
- **Sin claves en los logs:** morgan no registra encabezados (la clave del técnico viaja en `X-Tecnico-Clave`) y ningún log imprime `DATABASE_URL` ni `TECNICO_PASSWORD`.
- **Aviso conocido al arrancar:** `SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'`. Lo imprime la librería `pg` por el `sslmode=require` de Neon; no es un error y la conexión es segura. Desaparece si en Render se usa `sslmode=verify-full` en `DATABASE_URL`.

</details>

<details>
<summary><strong>Salud</strong></summary>

- `GET /health` responde `status`, `version`, `db` y `time`.
- Render lo consulta cada pocos segundos. Si un deploy nuevo no responde, no le pasa tráfico y deja funcionando la versión anterior.
- `/health` responde 200 aunque la base falle: la app sigue viva, pero `db: "error"` significa que hay que revisar Neon.

</details>

<details>
<summary><strong>Rollback: volver a la última versión que funcionaba</strong></summary>

1. **Detectar el fallo:** health check en rojo, `db: "error"` o una `version` inesperada en `/health`, o errores en **Logs**.
2. **Volver atrás:** Render → servicio → **Deploys** → elegir el último deploy bueno → **Rollback** → confirmar. Reutiliza el build anterior, así que tarda poco.
3. **Verificar:** abrir `/health` y confirmar que `version` volvió a la anterior. Para eso cada release sube la versión en `package.json`.
4. **Corregir:** rama `fix/SOP-X-…` → PR → CI en verde → merge.
5. **Reactivar el auto-deploy:** el rollback desde Render **apaga el auto-deploy**. Después del merge de la corrección, volver a **Settings → Build & Deploy → Auto-Deploy: After CI Checks Pass**.
6. **Registrar:** comentario en la tarjeta de Jira con qué falló, a qué versión se volvió y cómo se corrigió.

El rollback devuelve el código, no los datos: las solicitudes guardadas en Neon se mantienen. Las tablas se crean con `CREATE TABLE IF NOT EXISTS`, así que volver a una versión anterior no rompe la base.

</details>

<details>
<summary><strong>Simulacro de rollback (18 de noviembre de 2026)</strong></summary>

Se volvió de la v1.0.0 al deploy anterior (`7f459c6`, versión `0.1.0`) y luego se regresó a la v1.0.0 (`06bdf69`). Los tiempos van desde el clic en **Rollback** hasta que `/health` mostró la versión esperada.

| Hora | De → a | Tiempo | Evidencia |
|---|---|---|---|
| 4:44 p. m. | `1.0.0` → `0.1.0` (deploy `7f459c6`) | ≈ 42 s (4:44:52 → 4:45:34) | Capturas en SOP-34 (Jira) |
| 4:46 p. m. | `0.1.0` → `1.0.0` (deploy `06bdf69`) | ≈ 28 s (4:46:32 → 4:47:00) | Capturas en SOP-34 (Jira) |

- En ambos casos `/health` respondió `"status": "ok"` y `"db": "ok"`: el rollback cambia el código, no los datos.
- Búsqueda de `TECNICO` en los logs: sin resultados (ninguna clave expuesta).

</details>

## Seguridad (DevSecOps)
La seguridad se revisa en cada Pull Request, igual que las pruebas:

| Control | Dónde | Qué hace |
|---|---|---|
| Permisos mínimos | `ci.yml` | El token del CI solo puede leer el código |
| `npm audit` | CI, job **Seguridad** | Falla si una dependencia de producción tiene una vulnerabilidad alta o crítica |
| gitleaks | CI, job **Seguridad** + `.gitleaks.toml` | Busca contraseñas, tokens y cadenas de conexión en todo el historial, incluida la `DATABASE_URL` de Neon |
| Dependabot | `.github/dependabot.yml` | Cada lunes abre PRs para actualizar npm y GitHub Actions |
| Cabeceras de seguridad | `src/app.js` | Sin `X-Powered-By`; con `nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: no-referrer` |

Para revisar lo mismo en tu computador antes de abrir el PR: `npm audit --omit=dev` y, si tienes [gitleaks](https://github.com/gitleaks/gitleaks) instalado, `gitleaks git . --config .gitleaks.toml`.

Cómo reportar una vulnerabilidad y la lista completa de controles: [SECURITY.md](SECURITY.md).

## Versiones
| Versión | Sprint | Contenido |
|---|---|---|
| [v1.0.0](https://github.com/plag-soporte-eci/siguetucaso/releases/tag/v1.0.0) | 1 · Registro y consulta | Formulario guiado, código de seguimiento con botón Copiar y consulta pública del estado |
| [v2.0.0](https://github.com/plag-soporte-eci/siguetucaso/releases/tag/v2.0.0) | 2 · Gestión del técnico | Panel del técnico: lista centralizada, cambio de estado, nota "Esperando tu respuesta" y responsable |
| [v2.1.0](https://github.com/plag-soporte-eci/siguetucaso/releases/tag/v2.1.0) | Cierre | Respuesta del solicitante con archivo, rediseño con la identidad de DiNNo y documentación final |

## Equipo y forma de trabajo
| Integrante | Rol |
|---|---|
| Juan Sebastián Ortega Muñoz | Product Owner + Developer |
| Sebastián Albarracín Silva | Scrum Master + Developer Frontend |
| Nicolas Toro | Developer · Backend y calidad |
| David Salomón Baena Rubio | Developer · DevOps |

Trabajamos con Scrum y Kanban en [Jira](https://plag-soporte-eci.atlassian.net/jira/software/projects/SOP/boards/1): cada tarea tiene su clave `SOP-X`, que va en la rama, en los commits y en el Pull Request. `main` está protegida: todo entra por PR, con la revisión de otro integrante y el CI en verde.

- [AGENTS.md](AGENTS.md): guía del equipo, tareas de cada uno y contrato técnico.
- [CONTRIBUTING.md](CONTRIBUTING.md): ramas, commits y Pull Requests.
- [Definición de Terminado](docs/definicion-de-terminado.md).

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
| [gitleaks](https://github.com/gitleaks/gitleaks) | Búsqueda de secretos en el CI (binario oficial, sin licencia de pago) | MIT |
| Dependabot (GitHub) | Actualización automática de dependencias | – |
| [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) | Fuente de la interfaz, guardada en `public/fonts/` | SIL OFL 1.1 |
| Claude (IA) | Apoyo en documentación, plantillas y esqueleto inicial de la app | – |

## Licencia
[MIT](LICENSE) © 2026 plag-soporte-eci
