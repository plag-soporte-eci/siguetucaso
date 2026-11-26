# Cómo colaboramos

## Ramas
- `main` está protegida: nadie sube cambios directo, todo entra por Pull Request.
- Una rama por historia o tarea de Jira, con su clave:
  - `feature/SOP-44-respuesta-solicitante`
  - `fix/SOP-20-codigo-duplicado`
  - `chore/SOP-31-ci`
  - `docs/SOP-46-readme-y-documentacion`
- Se crea la rama desde `main` actualizado y se borra después del merge (automático).

## Commits
Mensaje corto en español que empiece con la clave de Jira:
```
SOP-11 agrega POST /api/solicitudes con validaciones
```

## Pull Requests
1. Abrir el PR hacia `main` con la clave de Jira en el título: `SOP-11 Registrar una solicitud`.
2. Llenar la plantilla del PR.
3. Pedir revisión a **otro integrante** (no a uno mismo), según la tabla de la sección 4.4 de [AGENTS.md](AGENTS.md).
4. El revisor deja al menos un comentario útil (pregunta, sugerencia o verificación hecha).
5. Merge solo con 1 aprobación + CI en verde. Usamos **Squash and merge**.
6. Mover la tarjeta en Jira: Por hacer → En curso → En revisión (PR) → Finalizado.

Acuerdo Lean: un PR no debe esperar más de **24 h** por revisión.

## Pruebas
- `npm test` debe pasar en local antes de abrir el PR.
- Cada historia trae al menos una prueba automatizada (Jest + Supertest + pg-mem). Nunca se desactiva una prueba para que pase el CI.

## Secretos
- Nunca subir `.env`, contraseñas ni claves. Usar `.env.example` con nombres de variables sin valores.
- Las claves que necesite el CI van en **GitHub → Settings → Secrets and variables → Actions**.

## Definición de Terminado
Ver [docs/definicion-de-terminado.md](docs/definicion-de-terminado.md).
