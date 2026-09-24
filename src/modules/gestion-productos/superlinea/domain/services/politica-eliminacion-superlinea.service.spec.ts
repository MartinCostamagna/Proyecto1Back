import { Test, TestingModule } from '@nestjs/testing';
import { PoliticaEliminacionSuperlinea } from './politica-eliminacion-superlinea.service';
import { ILineaRepository } from '../../../linea/domain/interfaces/linea.repository.interface';

describe('PoliticaEliminacionSuperlinea', () => {
  let politica: PoliticaEliminacionSuperlinea;
  let lineaRepository: jest.Mocked<ILineaRepository>;

  beforeEach(async () => {
    lineaRepository = {
      existsLineasActivasBySuperlinea: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliticaEliminacionSuperlinea,
        { provide: 'ILineaRepository', useValue: lineaRepository },
      ],
    }).compile();

    politica = module.get<PoliticaEliminacionSuperlinea>(
      PoliticaEliminacionSuperlinea,
    );
  });

  it('debería devolver true cuando existen líneas activas para la superlínea', async () => {
    lineaRepository.existsLineasActivasBySuperlinea.mockResolvedValue(true);

    await expect(politica.tieneLineasActivasParaSuperlinea(5)).resolves.toBe(
      true,
    );
    expect(lineaRepository.existsLineasActivasBySuperlinea).toHaveBeenCalledWith(
      5,
    );
  });

  it('debería devolver false cuando no hay líneas activas', async () => {
    lineaRepository.existsLineasActivasBySuperlinea.mockResolvedValue(false);

    await expect(politica.tieneLineasActivasParaSuperlinea(5)).resolves.toBe(
      false,
    );
  });
});