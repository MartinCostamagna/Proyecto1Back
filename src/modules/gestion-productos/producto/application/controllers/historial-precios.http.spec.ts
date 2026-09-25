import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductoController } from './producto.controller';
import { ProductoService } from '../services/producto.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';
import { NormalizeDenominacionPipe } from 'src/modules/common/pipes/normalize-denominations.pipe';
import { NormalizeCodigoProveedorPipe } from 'src/modules/common/pipes/normalize-codigo-proveedor.pipe';
import { NormalizeDenominacionSearchPipe } from 'src/modules/common/pipes/normalize-denominations-search.pipe';

// El proyecto no tiene esModuleInterop, así que el default import de
// supertest no se puede usar en runtime.
const request = require('supertest');

/**
 * CR-007 — e2e del endpoint de lectura del historial de precios.
 *
 * Se levanta la capa HTTP real (Supertest) con el MISMO ValidationPipe
 * global que usa main.ts, para verificar el contrato del endpoint:
 * prefijo /api, validación de query params y forma de la respuesta.
 */
describe('CR-007 — GET /api/producto/historial-precios (e2e)', () => {
  let app: INestApplication;
  let service: { findHistorialBy: jest.Mock; actualizarPreciosMasivos: jest.Mock };

  const REGISTRO = {
    id: 1,
    productoId: 12,
    productoDenominacion: 'COCA COLA 500ML',
    productoLinea: 'GASEOSAS',
    precioAnterior: 100,
    precioNuevo: 150,
    variacion: 50,
    variacionPorcentaje: 50,
    fecha: '2026-09-25T15:30:00.000Z',
    motivo: 'Aumento de proveedor',
    usuarioDenominacion: 'Admin',
  };

  beforeEach(async () => {
    service = {
      findHistorialBy: jest.fn().mockResolvedValue({ data: [REGISTRO], total: 1 }),
      actualizarPreciosMasivos: jest.fn().mockResolvedValue({ mensaje: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductoController],
      providers: [
        { provide: ProductoService, useValue: service },
        NormalizeDenominacionPipe,
        NormalizeCodigoProveedorPipe,
        NormalizeDenominacionSearchPipe,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    // Mismo pipe global que en main.ts
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('contrato del endpoint', () => {
    it('debería estar montado en GET /api/producto/historial-precios', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10 })
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].productoDenominacion).toBe('COCA COLA 500ML');
    });

    it('NO debería ser capturado por la ruta /api/producto/:id', async () => {
      // Si el orden de rutas fuera incorrecto, "historial-precios" se
      // interpretaría como un id y el ParseIntPipe fallaría con 400.
      const res = await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10 });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('message', 'Validation failed (numeric id is expected)');
    });

    it('debería devolver una lista vacía sin 404 cuando no hay registros', async () => {
      service.findHistorialBy.mockResolvedValue({ data: [], total: 0 });

      const res = await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10 })
        .expect(200);

      expect(res.body).toEqual({ data: [], total: 0 });
    });
  });

  describe('validación de la query (reglas del CR)', () => {
    it('debería rechazar take=0', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 0 })
        .expect(400);
    });

    it('debería rechazar take negativo', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: -5 })
        .expect(400);
    });

    it('debería rechazar skip negativo', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: -1, take: 10 })
        .expect(400);
    });

    it('debería rechazar una fechaDesde con formato inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10, fechaDesde: 'ayer' })
        .expect(400);
    });

    it('debería rechazar una fechaHasta con formato inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10, fechaHasta: '30-09-2026' })
        .expect(400);
    });

    it('debería rechazar un productoId no numérico', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10, productoId: 'abc' })
        .expect(400);
    });

    it('debería rechazar un parámetro desconocido (whitelist estricta)', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10, parametroInventado: 'x' })
        .expect(400);
    });
  });

  describe('propagación de filtros al servicio', () => {
    it('debería enviar la paginación al servicio', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 20, take: 25 })
        .expect(200);

      const filtros = service.findHistorialBy.mock.calls[0][0];
      expect(filtros.skip).toBe(20);
      expect(filtros.take).toBe(25);
    });

    it('debería enviar el filtro de producto al servicio', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10, productoId: 7 })
        .expect(200);

      expect(service.findHistorialBy.mock.calls[0][0].productoId).toBe(7);
    });

    it('debería enviar el rango de fechas al servicio', async () => {
      await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10, fechaDesde: '2026-09-01', fechaHasta: '2026-09-30' })
        .expect(200);

      const filtros = service.findHistorialBy.mock.calls[0][0];
      expect(filtros.fechaDesde).toBe('2026-09-01');
      expect(filtros.fechaHasta).toBe('2026-09-30');
    });

    it('debería aplicar la paginación por defecto si no viene en la query', async () => {
      await request(app.getHttpServer()).get('/api/producto/historial-precios').expect(200);

      const filtros = service.findHistorialBy.mock.calls[0][0];
      expect(filtros.skip).toBe(0);
      expect(filtros.take).toBe(10);
    });
  });

  describe('expone precioAnterior y precioNuevo como números (no strings)', () => {
    it('debería devolver los precios serializados como número', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/producto/historial-precios')
        .query({ skip: 0, take: 10 })
        .expect(200);

      const registro = res.body.data[0];
      expect(typeof registro.precioAnterior).toBe('number');
      expect(typeof registro.precioNuevo).toBe('number');
      expect(typeof registro.variacion).toBe('number');
      expect(typeof registro.variacionPorcentaje).toBe('number');
    });
  });
});
