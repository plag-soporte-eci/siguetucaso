# Definición de Terminado (DoD) – SigueTuCaso

Una historia de usuario está **Terminada** solo si cumple TODO lo siguiente:

## Funciona
- [ ] Cumple todos sus criterios de aceptación en Jira.
- [ ] Se probó manualmente el recorrido de la historia en el entorno de demo.

## Está verificada
- [ ] Llegó a `main` mediante un Pull Request aprobado por **otro** integrante.
- [ ] La rama y el PR incluyen la clave de Jira (`SOP-X`).
- [ ] El CI (GitHub Actions) está en verde.
- [ ] La funcionalidad principal de la historia tiene al menos una prueba automatizada.
- [ ] No hay contraseñas, claves ni archivos `.env` en el código.

## Está disponible para la demostración
- [ ] Está desplegada en el entorno de demo.
- [ ] El README está actualizado si cambió cómo se ejecuta o configura el proyecto.
- [ ] La tarjeta está en la columna **Hecho** en Jira.

> Si una historia no cumple algún punto, **no está terminada** y no cuenta para el sprint.
> Acordada por el equipo el 10/11/2026 por el grupo de WhatsApp del equipo. Integrantes: Juan Sebastián Ortega Muñoz (Product Owner), Sebastián Albarracín Silva (Frontend), David Salomón Baena Rubio (DevOps), Manuel David Robayo (Scrum Master), Nicolas Toro (Backend). Cambios a esta DoD se registran abajo.

## Historial de cambios
| Fecha | Cambio | Motivo (retro / review) |
|---|---|---|
| | Versión inicial | Definida antes del Sprint 1 |
| 10/11/2026 | Acuerdo del equipo | Cierre del Sprint 0 |
