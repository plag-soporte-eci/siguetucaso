// Pruebas del formulario de reporte (SOP-38, parte frontend de SOP-11).
// Se prueban las funciones de public/js/index.js y que la página se sirva.
const request = require('supertest');
const app = require('../src/app');
const {
  SERVICIOS,
  limpiarDatos,
  validarFormulario,
} = require('../public/js/index');

// Datos válidos de ejemplo; cada prueba cambia solo lo que necesita.
const valido = {
  nombre: 'Ana Pérez',
  correo: 'ana@correo.com',
  servicio: 'VPN',
  descripcion: 'No me conecta la VPN desde la casa.',
};

describe('index.html', () => {
  test('la página principal muestra el formulario con sus campos', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="form-solicitud"');
    ['nombre', 'correo', 'servicio', 'descripcion', 'desdeCuando', 'queIntento'].forEach(
      (campo) => expect(res.text).toContain(`name="${campo}"`)
    );
    expect(res.text).toContain('js/index.js');
  });

  test('usa exactamente los servicios del contrato (sección 7.2)', () => {
    expect(SERVICIOS).toEqual([
      'Plataforma académica',
      'Correo institucional',
      'WiFi / red',
      'VPN',
      'Equipo / computador',
      'Otro',
    ]);
  });
});

describe('limpiarDatos', () => {
  test('quita espacios y no envía los opcionales vacíos', () => {
    const datos = limpiarDatos({ ...valido, nombre: '  Ana  ', desdeCuando: '   ', queIntento: '' });

    expect(datos.nombre).toBe('Ana');
    expect(datos).not.toHaveProperty('desdeCuando');
    expect(datos).not.toHaveProperty('queIntento');
  });

  test('conserva los opcionales cuando tienen texto', () => {
    const datos = limpiarDatos({ ...valido, desdeCuando: 'ayer', queIntento: 'reinicié' });

    expect(datos.desdeCuando).toBe('ayer');
    expect(datos.queIntento).toBe('reinicié');
  });
});

describe('validarFormulario', () => {
  test('no hay errores con datos válidos (sin opcionales)', () => {
    expect(validarFormulario(limpiarDatos(valido))).toEqual({});
  });

  test('marca cada campo obligatorio vacío', () => {
    const errores = validarFormulario(limpiarDatos({}));

    expect(Object.keys(errores).sort()).toEqual(['correo', 'descripcion', 'nombre', 'servicio']);
  });

  test('rechaza un correo inválido', () => {
    const errores = validarFormulario(limpiarDatos({ ...valido, correo: 'ana@correo' }));

    expect(errores.correo).toBeDefined();
  });

  test('rechaza un servicio que no está en la lista', () => {
    const errores = validarFormulario(limpiarDatos({ ...valido, servicio: 'Impresora' }));

    expect(errores.servicio).toBeDefined();
  });

  test('acepta 1000 caracteres de descripción y rechaza 1001', () => {
    expect(validarFormulario({ ...valido, descripcion: 'a'.repeat(1000) })).toEqual({});
    expect(validarFormulario({ ...valido, descripcion: 'a'.repeat(1001) }).descripcion).toBeDefined();
  });
});
