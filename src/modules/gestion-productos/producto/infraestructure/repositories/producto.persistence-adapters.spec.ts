import { ProductoPersistenceAdapter } from './producto.persistence-adapters';
import { Producto } from '../../domain/entities/producto.entity';

function buildQueryMock() {
  const calls: any[] = [];
  const query = {
    leftJoinAndSelect: jest.fn(() => query),
    andWhere: jest.fn((condition: string, params?: any) => {
      calls.push({ type: 'andWhere', condition, params });
      return query;
    }),
    orderBy: jest.fn(() => query),
    skip: jest.fn(() => query),
    take: jest.fn(() => query),
    getManyAndCount: jest.fn(() => Promise.resolve([[], 0])),
    _calls: calls,
  };
  return query;
}

function buildAdapter(query: any) {
  const repository: any = { createQueryBuilder: jest.fn(() => query) };
  const dataSource: any = {};
  const uow: any = {};
  return new ProductoPersistenceAdapter(repository, dataSource, uow);
}

describe('ProductoPersistenceAdapter.findBy (CR-004)', () => {
  it('debería aplicar una condición AND por token y OR entre campos', async () => {
    const query = buildQueryMock();
    const adapter = buildAdapter(query);

    await adapter.findBy('COCA 500', '', false, '', 0, 0, 0, 0, false, 0, 10);

    const where = query._calls.find((c) => c.type === 'andWhere');
    expect(where).toBeDefined();
    expect(
      query.leftJoinAndSelect.mock.calls.some((c) =>
        c[0].includes('linea.superlinea'),
      ),
    ).toBe(true);
    expect(where.condition).toContain('AND');
    expect(where.condition).toContain('UPPER(producto.denominacion)');
    expect(where.condition).toContain('UPPER(marca.denominacion)');
    expect(where.condition).toContain('UPPER(linea.denominacion)');
    expect(where.condition).toContain('UPPER(presentacion.denominacion)');
    expect(where.condition).not.toContain('superlinea.denominacion');
    expect(where.params).toEqual({
      denominacion_0: '%COCA%',
      denominacion_1: '%500%',
    });
    expect(where.condition.indexOf('AND')).toBeGreaterThan(-1);
    expect(where.condition.indexOf('OR')).toBeGreaterThan(-1);
  });

  it('debería tratar un solo token sin saltar el filtro', async () => {
    const query = buildQueryMock();
    const adapter = buildAdapter(query);

    const result = await adapter.findBy('gaseosa', '', false, '', 0, 0, 0, 0, false, 0, 10);

    const where = query._calls.find((c) => c.type === 'andWhere');
    expect(where.params).toEqual({ denominacion_0: '%GASEOSA%' });
    expect(result.total).toBe(0);
  });

  it('no debería generar condiciones de tokens si la denominación es vacía', async () => {
    const query = buildQueryMock();
    const adapter = buildAdapter(query);

    await adapter.findBy('', '', false, '', 0, 0, 0, 0, false, 0, 10);

    const tokenCall = query._calls.find(
      (c) => c.type === 'andWhere' && c.condition.includes('denominacion_0'),
    );
    expect(tokenCall).toBeUndefined();
  });

  it('debería filtrar por superlinea_id vía join a superlinea', async () => {
    const query = buildQueryMock();
    const adapter = buildAdapter(query);

    await adapter.findBy('', '', false, '', 0, 0, 3, 0, false, 0, 10);

    const superlineaCall = query._calls.find(
      (c) => c.type === 'andWhere' && c.condition.includes('superlinea.id'),
    );
    expect(superlineaCall).toBeDefined();
    expect(superlineaCall.params).toEqual({ superlinea_id: 3 });
  });
});