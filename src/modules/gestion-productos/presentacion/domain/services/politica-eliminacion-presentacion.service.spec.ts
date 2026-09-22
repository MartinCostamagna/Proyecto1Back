import { Test, TestingModule } from '@nestjs/testing';
import { PoliticaEliminacionPresentacion } from './politica-eliminacion-presentacion.service';
import { IProductoRepository } from '../../../producto/domain/interfaces/producto.repository-interface';

describe('PoliticaEliminacionPresentacion', () => {
  let politica: PoliticaEliminacionPresentacion;
  let productoRepository: jest.Mocked<IProductoRepository>;

  beforeEach(async () => {
    productoRepository = {
      existsProductosActivosByPresentacion: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliticaEliminacionPresentacion,
        { provide: 'IProductoRepository', useValue: productoRepository },
      ],
    }).compile();

    politica = module.get<PoliticaEliminacionPresentacion>(
      PoliticaEliminacionPresentacion,
    );
  });

  it('debería devolver true cuando existen productos activos para la presentación', async () => {
    productoRepository.existsProductosActivosByPresentacion.mockResolvedValue(
      true,
    );

    await expect(politica.tieneProductosActivosParaPresentacion(5)).resolves.toBe(
      true,
    );
    expect(
      productoRepository.existsProductosActivosByPresentacion,
    ).toHaveBeenCalledWith(5);
  });

  it('debería devolver false cuando no hay productos activos', async () => {
    productoRepository.existsProductosActivosByPresentacion.mockResolvedValue(
      false,
    );

    await expect(politica.tieneProductosActivosParaPresentacion(5)).resolves.toBe(
      false,
    );
  });
});