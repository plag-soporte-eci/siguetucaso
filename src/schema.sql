CREATE TABLE IF NOT EXISTS solicitudes (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  correo          TEXT NOT NULL,
  servicio        TEXT NOT NULL,
  descripcion     TEXT NOT NULL,
  desde_cuando    TEXT,
  que_intento     TEXT,
  estado          TEXT NOT NULL DEFAULT 'Recibida',
  responsable     TEXT,
  nota_tecnico    TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Respuestas del solicitante cuando el técnico le pide algo ("Esperando tu respuesta").
-- El adjunto es opcional y se guarda en base64 (máx. 2 MB) para no depender de otro servicio.
CREATE TABLE IF NOT EXISTS respuestas (
  id              SERIAL PRIMARY KEY,
  solicitud_id    INTEGER NOT NULL REFERENCES solicitudes(id),
  texto           TEXT NOT NULL,
  archivo_nombre  TEXT,
  archivo_tipo    TEXT,
  archivo_datos   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
