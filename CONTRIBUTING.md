# Cómo colaboramos

## Ramas
- `main` está protegida: nadie sube cambios directo, todo entra por Pull Request.
- Una rama por historia o tarea de Jira, con su clave:
  - `feature/SOP-12-formulario-solicitud`
  - `fix/SOP-20-codigo-duplicado`
  - `chore/SOP-5-configurar-ci`
- Se crea la rama desde `main` actualizado y se borra después del merge (automático).

## Commits
Mensaje corto en español que empiece con la clave de Jira:
```
SOP-12 agrega validación de campos obligatorios
```

## Pull Requests
1. Abrir el PR hacia `main` con la clave de Jira en el título: `SOP-12 Formulario de solicitud`.
2. Llenar la plantilla del PR.
3. Pedir revisión a **otro integrante** (no a uno mismo).
4. El revisor deja al menos un comentario útil (pregunta, sugerencia o verificación hecha).
5. Merge solo con 1 aprobación + CI en verde. Usamos **Squash and merge**.
6. Mover la tarjeta en Jira: En progreso → En revisión (PR) → Hecho.

Acuerdo Lean: un PR no debe esperar más de **24 h** por revisión.

## Secretos
- Nunca subir `.env`, contraseñas ni claves. Usar `.env.example` con nombres de variables sin valores.
- Las claves que necesite el CI van en **GitHub → Settings → Secrets and variables → Actions**.

## Definición de Terminado
Ver [docs/definicion-de-terminado.md](docs/definicion-de-terminado.md).
