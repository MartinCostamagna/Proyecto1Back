import { NotFoundException } from '@nestjs/common';
import { ProductoPersistenceAdapter } from './producto.persistence-adapters';
import { Producto } from '../../domain/entities/producto.entity';
import { HistorialPrecio } from '../../domain/entities/historial-precio.entity';

/**
 * CR-007 — Capa de infraestructura del historial de precios.
 *
 * Se verifica que el historial se persiste dentro de la MISMA transacción que
 * el producto (mismo QueryRunner / EntityManager), que ante un fallo se hace
 * rollback, y que la consulta del historial arma los filtros y el orden esperados.
 */

function buildHistorialQueryMock(rows: any[] = [], total = 0) {
  const calls: any[] = [];
  const record = (type: string, extra: any) => calls.push({ type, ...extra });
  const query: any = {
    leftJoinAndSelect: jest.fn(() => query),
    where: jest.fn((condition: string, params?: any) => {
      record('where', { condition, params });
      return query;
    }),
    andWhere: jest.fn((condition: string, params?: any) => {
      record('andWhere', { condition, params });
      return query;
    }),
    orderBy: jest.fn((col: string, dir: string) => {
      record('orderBy', { col, dir });
      return query;
    }),
    addOrderBy: jest.fn((col: string, dir: string) => {
      record('addOrderBy', { col, dir });
      return query;
    }),
    skip: jest.fn((n: number) => {
      record('skip', { n });
      return query;
    }),
    take: jest.fn((n: number) => {
      record('take', { n });
      return query;
    }),
    getCount: jest.fn(() => Promise.resolve(total)),
    getMany: jest.fn(() => Promise.resolve(rows)),
    _calls: calls,
  };
  return query;
}

/**
 * DataSource mock completo: el decorador @Transactional() construye un
 * TypeOrmUnitOfWork real sobre este dataSource, por lo que se puede
 * observar la apertura y el cierre de la transacción.
 */
function buildDataSource(historialQuery: any) {
  const productoRepo: any = { findOne: jest.fn(), save: jest.fn((e) => Promise.resolve(e)) };
  const historialRepo: any = { create: jest.fn((d) => ({ ...d })), save: jest.fn() };

  const manager: any = {
    getRepository: jest.fn((entity: any) =>
      entity === HistorialPrecio ? historialRepo : productoRepo,
    ),
  };

  const queryRunner: any = {
    connect: jest.fn(() => Promise.resolve()),
    startTransaction: jest.fn(() => Promise.resolve()),
    commitTransaction: jest.fn(() => Promise.resolve()),
    rollbackTransaction: jest.fn(() => Promise.resolve()),
    release: jest.fn(() => Promise.resolve()),
    manager,
  };

  const dataSource: any = {
    createQueryRunner: jest.fn(() => queryRunner),
    getRepository: jest.fn((entity: any) =>
      entity === HistorialPrecio ? { createQueryBuilder: () => historialQuery } : productoRepo,
    ),
    manager,
  };

  return { dataSource, queryRunner, manager, productoRepo, historialRepo };
}

function buildAdapter(historialQuery?: any) {
  const q = historialQuery ?? buildHistorialQueryMock();
  const ds = buildDataSource(q);
  const repository: any = { createQueryBuilder: jest.fn(() => q) };
  const uow: any = { getRepository: jest.fn() };
  const adapter = new ProductoPersistenceAdapter(repository, ds.dataSource, uow);
  return { adapter, ...ds, historialQuery: q };
}

describe('CR-007 — ProductoPersistenceAdapter (historial de precios)', () => {
  // ==================================================================
  // Lectura del historial
  // ==================================================================
  describe('findHistorialBy — construcción de la consulta', () => {
    it('debería filtrar siempre por los registros no eliminados', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ denominacion: '', skip: 0, take: 10 } as any);

      const where = q._calls.find((c) => c.condition?.includes('historial.deletedAt IS NULL'));
      expect(where).toBeDefined();
    });

    it('debería hacer join a producto, linea y usuario', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ denominacion: '', skip: 0, take: 10 } as any);

      const joins = q.leftJoinAndSelect.mock.calls.map((c) => c[0]);
      expect(joins).toContain('historial.producto');
      expect(joins).toContain('producto.linea');
      expect(joins).toContain('historial.usuarioCreated');
    });

    it('debería filtrar por productoId cuando viene informado', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ productoId: 12, skip: 0, take: 10 } as any);

      const call = q._calls.find((c) => c.condition?.includes('historial.producto.id'));
      expect(call.params).toEqual({ productoId: 12 });
    });

    it('NO debería filtrar por productoId si viene null o undefined', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ productoId: null, skip: 0, take: 10 } as any);

      expect(q._calls.find((c) => c.condition?.includes('historial.producto.id'))).toBeUndefined();
    });

    it('debería filtrar por denominación del producto con LIKE', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ denominacion: 'coca', skip: 0, take: 10 } as any);

      const call = q._calls.find((c) => c.condition?.includes('producto.denominacion LIKE'));
      expect(call.params).toEqual({ denominacion: '%coca%' });
    });

    it('NO debería filtrar por denominación si viene vacía o con espacios', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ denominacion: '   ', skip: 0, take: 10 } as any);

      expect(q._calls.find((c) => c.condition?.includes('denominacion'))).toBeUndefined();
    });

    it('debería filtrar por motivo con LIKE', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ motivo: 'proveedor', skip: 0, take: 10 } as any);

      const call = q._calls.find((c) => c.condition?.includes('historial.motivo LIKE'));
      expect(call.params).toEqual({ motivo: '%proveedor%' });
    });

    it('debería hacer inclusivos los límites del rango de fechas', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
        skip: 0,
        take: 10,
      } as any);

      const desde = q._calls.find((c) => c.condition?.includes('historial.fecha >='));
      const hasta = q._calls.find((c) => c.condition?.includes('historial.fecha <='));
      expect(desde.params).toEqual({ fechaDesde: '2026-09-01 00:00:00' });
      expect(hasta.params).toEqual({ fechaHasta: '2026-09-30 23:59:59' });
    });

    it('debería ordenar por fecha descendente y luego por id descendente', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ skip: 0, take: 10 } as any);

      expect(q._calls.find((c) => c.type === 'orderBy')).toMatchObject({
        col: 'historial.fecha',
        dir: 'DESC',
      });
      expect(q._calls.find((c) => c.type === 'addOrderBy')).toMatchObject({
        col: 'historial.id',
        dir: 'DESC',
      });
    });

    it('debería aplicar skip y take', async () => {
      const { adapter, historialQuery: q } = buildAdapter();

      await adapter.findHistorialBy({ skip: 40, take: 20 } as any);

      expect(q.skip).toHaveBeenCalledWith(40);
      expect(q.take).toHaveBeenCalledWith(20);
    });

    it('debería devolver data mapeada y el total', async () => {
      const q = buildHistorialQueryMock(
        [
          {
            id: 1,
            precioAnterior: 100,
            precioNuevo: 150,
            motivo: 'Aumento',
            fecha: new Date('2026-09-25T15:30:00.000Z'),
            producto: { id: 3, denominacion: 'COCA', linea: { id: 1, denominacion: 'GASEOSAS' } },
            usuarioCreated: { id: 4, denominacion: 'Admin' },
          },
        ],
        1,
      );
      const { adapter } = buildAdapter(q);

      const result = await adapter.findHistorialBy({ skip: 0, take: 10 } as any);

      expect(result.total).toBe(1);
      expect(result.data[0].productoDenominacion).toBe('COCA');
      expect(result.data[0].variacion).toBe(50);
      expect(result.data[0].usuarioDenominacion).toBe('Admin');
    });
  });

  // ==================================================================
  // Escritura transaccional del producto + historial
  // ==================================================================
  describe('updateConHistorialPrecio — producto e historial en la MISMA transacción', () => {
    const LINEA = { id: 1, denominacion: 'GASEOSAS' } as any;
    const MARCA = { id: 1, denominacion: 'COCA' } as any;
    const USUARIO = { id: 4, denominacion: 'Admin' } as any;
    const HISTORIAL = { precioAnterior: 100, precioNuevo: 150, motivo: 'Aumento' };

    it('debería abrir una transacción', async () => {
      const { adapter, queryRunner, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue({ id: 12, denominacion: 'COCA' });

      await adapter.updateConHistorialPrecio(12, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, HISTORIAL);

      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
    });

    it('debería confirmar la transacción cuando todo sale bien', async () => {
      const { adapter, queryRunner, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue({ id: 12, denominacion: 'COCA' });

      await adapter.updateConHistorialPrecio(12, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, HISTORIAL);

      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('debería obtener AMBAS entidades desde el mismo EntityManager de la transacción', async () => {
      const { adapter, manager, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue({ id: 12 });

      await adapter.updateConHistorialPrecio(12, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, HISTORIAL);

      expect(manager.getRepository).toHaveBeenCalledWith(Producto);
      expect(manager.getRepository).toHaveBeenCalledWith(HistorialPrecio);
    });

    it('debería persistir el registro con precio anterior, nuevo, motivo, producto y usuario', async () => {
      const { adapter, historialRepo, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue({ id: 12 });
      productoRepo.save.mockImplementation((e) => Promise.resolve({ ...e, id: 12 }));

      await adapter.updateConHistorialPrecio(12, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, HISTORIAL);

      expect(historialRepo.save).toHaveBeenCalledTimes(1);
      const registro = historialRepo.create.mock.calls[0][0];
      expect(registro.precioAnterior).toBe(100);
      expect(registro.precioNuevo).toBe(150);
      expect(registro.motivo).toBe('Aumento');
      expect(registro.producto).toMatchObject({ id: 12 });
      expect(registro.usuarioCreated).toBe(USUARIO);
    });

    it('NO debería escribir historial cuando el objeto historial es null', async () => {
      const { adapter, historialRepo, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue({ id: 12 });

      await adapter.updateConHistorialPrecio(12, { precio: 100 } as any, LINEA, MARCA, USUARIO, null, null);

      expect(historialRepo.save).not.toHaveBeenCalled();
      expect(historialRepo.create).not.toHaveBeenCalled();
    });

    it('debería asignar la línea, marca y usuario de actualización al producto', async () => {
      const { adapter, productoRepo } = buildAdapter();
      const entity: any = { id: 12 };
      productoRepo.findOne.mockResolvedValue(entity);

      await adapter.updateConHistorialPrecio(12, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, null);

      expect(entity.linea).toBe(LINEA);
      expect(entity.marca).toBe(MARCA);
      expect(entity.usuarioUpdated).toBe(USUARIO);
    });

    it('debería hacer ROLLBACK si el guardado del historial falla (el producto no queda a medio actualizar)', async () => {
      const { adapter, queryRunner, historialRepo, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue({ id: 12 });
      historialRepo.save.mockRejectedValue(new Error('fallo de escritura del historial'));

      await expect(
        adapter.updateConHistorialPrecio(12, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, HISTORIAL),
      ).rejects.toThrow('fallo de escritura del historial');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar NotFoundException y hacer rollback si el producto no existe', async () => {
      const { adapter, queryRunner, historialRepo, productoRepo } = buildAdapter();
      productoRepo.findOne.mockResolvedValue(null);

      await expect(
        adapter.updateConHistorialPrecio(999, { precio: 150 } as any, LINEA, MARCA, USUARIO, null, HISTORIAL),
      ).rejects.toThrow(NotFoundException);

      expect(historialRepo.save).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ==================================================================
  // Cambio masivo transaccional
  // ==================================================================
  describe('saveMasivosConHistorial — cambio masivo transaccional', () => {
    const USUARIO = { id: 4 } as any;

    it('debería abrir y confirmar una única transacción', async () => {
      const { adapter, queryRunner } = buildAdapter();
      const productos = [{ id: 1, precio: 110, precioHistorialRegistrado: 100 }] as any;

      await adapter.saveMasivosConHistorial(productos, USUARIO, 'Aumento');

      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debería guardar un registro de historial por cada producto que cambió', async () => {
      const { adapter, historialRepo } = buildAdapter();
      const productos = [
        { id: 1, precio: 110, precioHistorialRegistrado: 100 },
        { id: 2, precio: 220, precioHistorialRegistrado: 200 },
      ] as any;

      await adapter.saveMasivosConHistorial(productos, USUARIO, 'Aumento');

      expect(historialRepo.save).toHaveBeenCalledTimes(1);
      expect(historialRepo.save.mock.calls[0][0]).toHaveLength(2);
    });

    it('NO debería escribir historial si ningún producto cambió de precio', async () => {
      const { adapter, historialRepo } = buildAdapter();
      const productos = [
        { id: 1, precio: 100 },
        { id: 2, precio: 200 },
      ] as any;

      await adapter.saveMasivosConHistorial(productos, USUARIO, 'Sin efecto');

      expect(historialRepo.save).not.toHaveBeenCalled();
    });

    it('debería propagar el motivo y el usuario a cada registro', async () => {
      const { adapter, historialRepo } = buildAdapter();
      const productos = [{ id: 1, precio: 110, precioHistorialRegistrado: 100 }] as any;

      await adapter.saveMasivosConHistorial(productos, USUARIO, 'Lista mayo');

      const registro = historialRepo.create.mock.calls[0][0];
      expect(registro.precioAnterior).toBe(100);
      expect(registro.precioNuevo).toBe(110);
      expect(registro.motivo).toBe('Lista mayo');
      expect(registro.usuarioCreated).toBe(USUARIO);
    });

    it('debería devolver los productos guardados', async () => {
      const { adapter } = buildAdapter();
      const productos = [{ id: 1, precio: 110, precioHistorialRegistrado: 100 }] as any;

      const result = await adapter.saveMasivosConHistorial(productos, USUARIO, 'x');

      expect(result).toEqual(productos);
    });

    it('debería hacer ROLLBACK si falla el guardado del historial', async () => {
      const { adapter, queryRunner, historialRepo } = buildAdapter();
      historialRepo.save.mockRejectedValue(new Error('fallo'));

      await expect(
        adapter.saveMasivosConHistorial([{ id: 1, precio: 2, precioHistorialRegistrado: 1 }] as any, USUARIO, 'x'),
      ).rejects.toThrow('fallo');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });
});
