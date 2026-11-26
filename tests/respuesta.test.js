// Pruebas de la respuesta del solicitante (SOP-44).
// Usan pg-mem con el mismo schema.sql (nunca una base real).
const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/db');
const { usarBaseEnMemoria } = require('./helpers/dbMemoria');

const CLAVE = 'clave-de-prueba';
const PNG = Buffer.from('imagen de prueba').toString('base64');

function responder(codigo, cuerpo) {
  return request(app).post(`/api/solicitudes/${codigo}/respuesta`).send(cuerpo);
}

function comoTecnico(peticion) {
  return peticion.set('X-Tecnico-Clave', CLAVE);
}

describe('POST /api/solicitudes/:codigo/respuesta (SOP-44)', () => {
  const claveOriginal = process.env.TECNICO_PASSWORD;
  let codigo;

  beforeEach(async () => {
    process.env.TECNICO_PASSWORD = CLAVE;
    await usarBaseEnMemoria();

    const creada = await request(app).post('/api/solicitudes').send({
      nombre: 'Ana Pérez',
      correo: 'ana@correo.com',
      servicio: 'VPN',
      descripcion: 'No me conecta la VPN desde la casa.',
    });
    codigo = creada.body.codigo;

    await comoTecnico(request(app).patch(`/api/tecnico/solicitudes/${codigo}/estado`))
      .send({ estado: 'Esperando tu respuesta', nota: 'Envíanos una captura del error.' });
  });

  afterAll(() => {
    db.pool = null;
    process.env.TECNICO_PASSWORD = claveOriginal;
  });

  test('guarda la respuesta con su archivo y la solicitud vuelve a "En revisión"', async () => {
    const res = await responder(codigo, {
      texto: 'Adjunto la captura.',
      archivo: { nombre: 'captura.png', tipo: 'image/png', datos: PNG },
    });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('En revisión');
    expect(res.body).not.toHaveProperty('notaTecnico');

    // El técnico la ve en su lista, sin el contenido del archivo.
    const lista = await comoTecnico(request(app).get('/api/tecnico/solicitudes'));
    const [respuesta] = lista.body.solicitudes[0].respuestas;
    expect(respuesta.texto).toBe('Adjunto la captura.');
    expect(respuesta.archivoNombre).toBe('captura.png');
    expect(respuesta).not.toHaveProperty('archivoDatos');

    // Y puede descargar el archivo tal cual se subió.
    const descarga = await comoTecnico(
      request(app).get(`/api/tecnico/solicitudes/${codigo}/respuestas/${respuesta.id}/archivo`),
    ).buffer(true);
    expect(descarga.status).toBe(200);
    expect(descarga.headers['content-type']).toContain('image/png');
    expect(descarga.body.toString()).toBe('imagen de prueba');
  });

  test('el archivo es opcional', async () => {
    const res = await responder(codigo, { texto: 'Ya lo intenté de nuevo y sigue igual.' });
    expect(res.status).toBe(201);
  });

  test('no deja responder si la solicitud no está esperando respuesta (409)', async () => {
    await responder(codigo, { texto: 'Primera respuesta.' });
    const res = await responder(codigo, { texto: 'Segunda respuesta.' });
    expect(res.status).toBe(409);
  });

  test('exige el texto y rechaza archivos de otro tipo o de más de 2 MB (400)', async () => {
    const sinTexto = await responder(codigo, { texto: '  ' });
    expect(sinTexto.status).toBe(400);
    expect(sinTexto.body.campos).toHaveProperty('texto');

    const otroTipo = await responder(codigo, {
      texto: 'Hola',
      archivo: { nombre: 'virus.exe', tipo: 'application/x-msdownload', datos: PNG },
    });
    expect(otroTipo.status).toBe(400);
    expect(otroTipo.body.campos).toHaveProperty('archivo');

    const grande = Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64');
    const muyGrande = await responder(codigo, {
      texto: 'Hola',
      archivo: { nombre: 'grande.png', tipo: 'image/png', datos: grande },
    });
    expect(muyGrande.status).toBe(400);
    expect(muyGrande.body.campos.archivo).toContain('2 MB');
  });

  test('responde 404 si el código no existe', async () => {
    const res = await responder('TK-ZZZZ', { texto: 'Hola' });
    expect(res.status).toBe(404);
  });

  test('la descarga exige la clave del técnico (401)', async () => {
    const res = await request(app).get(`/api/tecnico/solicitudes/${codigo}/respuestas/1/archivo`);
    expect(res.status).toBe(401);
  });
});
