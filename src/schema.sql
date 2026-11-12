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
