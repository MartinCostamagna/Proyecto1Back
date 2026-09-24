import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LineaService } from './linea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { PoliticaEliminacionLinea } from '../../domain/services/politica-eliminacion-linea.service';
import { SuperlineaService } from '../../../superlinea/application/services/superlinea.service';
import { ILineaRepository } from '../../domain/interfaces/linea.repository.interface';
import { CreateLineaDto } from '../../dto/create-linea.dto';
import { UpdateLineaDto } from '../../dto/update-linea.dto';
import { Linea } from '../../domain/entities/linea.entity';

function buildEntity(linea?: Partial<Linea>): Linea {
  return {
    id: 1,
    denominacion: 'aceites',
    superlineaId: 1,
    utilizaStockMinimo: false,
    stockMinimo: 0,
    observacion: '',
    sistema: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    usuarioCreatedId: 1,
    ...linea,
  } as Linea;
}

describe('LineaService', () => {
  let service: LineaService;
  let repository: jest.Mocked<ILineaRepository>;
  let superlineaService: jest.Mocked<SuperlineaService>;
  let usuarioService: jest.Mocked<UsuarioService>;
  let politica: jest.Mocked<PoliticaEliminacionLinea>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findAllFor: jest.fn(),
      findAllListado: jest.fn(),
      findAllSinSistemaFor: jest.fn(),
      findOne: jest.fn(),
      findByDenominacionWith: jest.fn(),
      findByDenominacionFiltered: jest.fn(),
      findByIdConAuditoria: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      existsLineasActivasBySuperlinea: jest.fn(),
    } as any;

    superlineaService = {
      findEntityById: jest.fn(),
    } as any;

    usuarioService = {
      findOne: jest.fn(),
    } as any;

    politica = {
      tieneProductosActivosParaLinea: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineaService,
        { provide: 'ILineaRepository', useValue: repository },
        { provide: PoliticaEliminacionLinea, useValue: politica },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: SuperlineaService, useValue: superlineaService },
      ],
    }).compile();

    service = module.get<LineaService>(LineaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería crear la línea solo si la superlínea existe (RN-6)', async () => {
      const dto: CreateLineaDto = {
        denominacion: 'Aceites',
        superlineaId: 2,
        utilizaStockMinimo: false,
        stockMinimo: 0,
        observacion: '',
        usuarioCreatedId: 1,
        deletedAt: null,
      };
      repository.findByDenominacionWith.mockResolvedValue(null);
      superlineaService.findEntityById.mockResolvedValue({ id: 2 } as any);
      repository.create.mockResolvedValue(buildEntity());

      const result = await service.create(dto);

      expect(superlineaService.findEntityById).toHaveBeenCalledWith(2);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result.mensaje).toContain('creada');
    });

    it('debería lanzar NotFoundException si la superlínea indicada no existe (RN-6)', async () => {
      const dto: CreateLineaDto = {
        denominacion: 'Aceites',
        superlineaId: 99,
        utilizaStockMinimo: false,
        stockMinimo: 0,
        usuarioCreatedId: 1,
        deletedAt: null,
      };
      repository.findByDenominacionWith.mockResolvedValue(null);
      superlineaService.findEntityById.mockRejectedValue(
        new NotFoundException('Superlinea con ID 99 no encontrado.'),
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si la denominación ya está en uso', async () => {
      const dto: CreateLineaDto = {
        denominacion: 'Aceites',
        superlineaId: 1,
        utilizaStockMinimo: false,
        stockMinimo: 0,
        usuarioCreatedId: 1,
        deletedAt: null,
      };
      repository.findByDenominacionWith.mockResolvedValue(
        buildEntity({ id: 5, denominacion: 'aceites' }),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debería validar la superlínea cuando se cambia (RN-6)', async () => {
      const dto: UpdateLineaDto = {
        superlineaId: 3,
        utilizaStockMinimo: false,
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      superlineaService.findEntityById.mockResolvedValue({ id: 3 } as any);
      repository.update.mockResolvedValue(buildEntity({ superlineaId: 3 }));

      await service.update(1, dto);

      expect(superlineaService.findEntityById).toHaveBeenCalledWith(3);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('debería validar la nueva denominación cuando se cambia', async () => {
      const dto: UpdateLineaDto = {
        denominacion: 'Aceites refinados',
        utilizaStockMinimo: false,
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      repository.findByDenominacionWith.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        buildEntity({ denominacion: 'aceites refinados' }),
      );

      await service.update(1, dto);

      expect(repository.findByDenominacionWith).toHaveBeenCalledWith(
        'ACEITES REFINADOS',
      );
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('debería lanzar ConflictException si la nueva denominación está en uso', async () => {
      const dto: UpdateLineaDto = {
        denominacion: 'Harinas',
        utilizaStockMinimo: false,
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      repository.findByDenominacionWith.mockResolvedValue(
        buildEntity({ id: 7, denominacion: 'harinas' }),
      );

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la línea no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          1,
          { utilizaStockMinimo: false, usuarioUpdatedId: 2 } as UpdateLineaDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByDenominacionFiltered', () => {
    it('debería devolver líneas paginadas mapeadas a DTO', async () => {
      const entity = buildEntity({ denominacion: 'Aceites' });
      repository.findByDenominacionFiltered.mockResolvedValue({
        data: [entity],
        total: 1,
      });

      const result = await service.findByDenominacionFiltered('ACE', 0, 10);

      expect(repository.findByDenominacionFiltered).toHaveBeenCalledWith(
        'ACE',
        0,
        10,
        false,
      );
      expect(result.data).toEqual([
        {
          id: 1,
          denominacion: 'Aceites',
          stockMinimo: 0,
          utilizaStockMinimo: false,
          observacion: '',
          sistema: 0,
          superlineaId: 1,
          deletedAt: null,
        },
      ]);
      expect(result.total).toBe(1);
    });

    it('debería usar valores por defecto y el total desde PaginacionUtils', async () => {
      repository.findByDenominacionFiltered.mockResolvedValue({
        data: [],
        total: 25,
      });

      const result = await service.findByDenominacionFiltered('ACE');

      expect(repository.findByDenominacionFiltered).toHaveBeenCalledWith(
        'ACE',
        0,
        10,
        false,
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(25);
    });
  });

  describe('findAllFor', () => {
    it('debería devolver líneas mapeadas a DTO para la superlínea', async () => {
      const entity = buildEntity({ denominacion: 'Aceites' });
      repository.findAllFor.mockResolvedValue([entity]);

      const result = await service.findAllFor('ALIMENTOS');

      expect(repository.findAllFor).toHaveBeenCalledWith('ALIMENTOS');
      expect(result.data).toEqual([
        {
          id: 1,
          denominacion: 'Aceites',
          stockMinimo: 0,
          utilizaStockMinimo: false,
          observacion: '',
          sistema: 0,
          superlineaId: 1,
          deletedAt: null,
        },
      ]);
      expect(result.total).toBe(1);
    });

    it('debería devolver listado vacío', async () => {
      repository.findAllFor.mockResolvedValue([]);

      const result = await service.findAllFor('HIGIENE');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(1);
    });
  });

  describe('findByIdConAuditoria', () => {
    it('debería devolver la auditoría cuando existe', async () => {
      const auditoria = {
        id: 1,
        detalle: 'detalle',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        deletedAt: null,
        usuarioCreated: 'admin',
        usuarioUpdated: null,
        usuarioDeleted: null,
      };
      repository.findByIdConAuditoria.mockResolvedValue(auditoria as any);

      await expect(service.findByIdConAuditoria(1)).resolves.toEqual(auditoria);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      repository.findByIdConAuditoria.mockResolvedValue(null);

      await expect(service.findByIdConAuditoria(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findDtoById', () => {
    it('debería devolver la línea mapeada a DTO', async () => {
      const entity = buildEntity({ denominacion: 'Aceites' });
      repository.findOne.mockResolvedValue(entity);

      const result = await service.findDtoById(1);

      expect(repository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        denominacion: 'Aceites',
        stockMinimo: 0,
        utilizaStockMinimo: false,
        observacion: '',
        sistema: 0,
        superlineaId: 1,
        deletedAt: null,
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDtoById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEntityById', () => {
    it('debería devolver la entidad cuando existe', async () => {
      const entity = buildEntity({ superlineaId: 2 });
      repository.findOne.mockResolvedValue(entity);

      await expect(service.findEntityById(2)).resolves.toEqual(entity);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findEntityById(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('debería eliminar (soft delete) cuando no tiene productos activos', async () => {
      const entity = buildEntity();
      repository.findOne.mockResolvedValue(entity);
      usuarioService.findOne.mockResolvedValue({ id: 3 } as any);
      politica.tieneProductosActivosParaLinea.mockResolvedValue(false);
      repository.remove.mockResolvedValue(entity);

      const result = await service.remove(1, 3);

      expect(politica.tieneProductosActivosParaLinea).toHaveBeenCalledWith(1);
      expect(repository.remove).toHaveBeenCalledWith(entity, { id: 3 });
      expect(result.mensaje).toContain('eliminada');
    });

    it('debería lanzar NotFoundException si la línea no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 3)).rejects.toThrow(NotFoundException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(buildEntity());
      usuarioService.findOne.mockResolvedValue(null as any);

      await expect(service.remove(1, 3)).rejects.toThrow(NotFoundException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si tiene productos activos', async () => {
      repository.findOne.mockResolvedValue(buildEntity());
      usuarioService.findOne.mockResolvedValue({ id: 3 } as any);
      politica.tieneProductosActivosParaLinea.mockResolvedValue(true);

      await expect(service.remove(1, 3)).rejects.toThrow(ConflictException);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findAllListado', () => {
    it('debería devolver el listado del repositorio', async () => {
      const entities = [buildEntity()];
      repository.findAllListado.mockResolvedValue(entities);

      await expect(service.findAllListado()).resolves.toEqual(entities);
    });
  });
});