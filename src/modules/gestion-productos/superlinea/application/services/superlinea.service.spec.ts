import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SuperlineaService } from './superlinea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { PoliticaEliminacionSuperlinea } from '../../domain/services/politica-eliminacion-superlinea.service';
import { ISuperlineaRepository } from '../../domain/interfaces/superlinea.repository.interface';
import { CreateSuperlineaDto } from '../../dto/create-superlinea.dto';
import { UpdateSuperlineaDto } from '../../dto/update-superlinea.dto';
import { Superlinea } from '../../domain/entities/superlinea.entity';

function buildEntity(superlinea?: Partial<Superlinea>): Superlinea {
  return {
    id: 1,
    denominacion: 'ALIMENTOS',
    observacion: '',
    sistema: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    usuarioCreatedId: 1,
    ...superlinea,
  } as Superlinea;
}

describe('SuperlineaService', () => {
  let service: SuperlineaService;
  let repository: jest.Mocked<ISuperlineaRepository>;
  let usuarioService: jest.Mocked<UsuarioService>;
  let politica: jest.Mocked<PoliticaEliminacionSuperlinea>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findBy: jest.fn(),
      findAllListado: jest.fn(),
      findAllFor: jest.fn(),
      findByIdConAuditoria: jest.fn(),
      findOne: jest.fn(),
      findByDenominacionWith: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    usuarioService = {
      findOne: jest.fn(),
    } as any;

    politica = {
      tieneLineasActivasParaSuperlinea: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperlineaService,
        { provide: 'ISuperlineaRepository', useValue: repository },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: PoliticaEliminacionSuperlinea, useValue: politica },
      ],
    }).compile();

    service = module.get<SuperlineaService>(SuperlineaService);
  });

  describe('create', () => {
    it('debería crear la superlínea cuando la denominación no existe', async () => {
      const dto: CreateSuperlineaDto = {
        denominacion: 'alimentos',
        observacion: 'categoria de alimentos',
        usuarioCreatedId: 1,
        deletedAt: null,
      };
      repository.findByDenominacionWith.mockResolvedValue(null);
      repository.create.mockResolvedValue(
        buildEntity({ denominacion: 'ALIMENTOS' }),
      );

      const result = await service.create(dto);

      expect(repository.findByDenominacionWith).toHaveBeenCalledWith(
        'alimentos',
      );
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        mensaje:
          'Superlinea creada con éxito con denominacion: ALIMENTOS',
      });
    });

    it('debería lanzar ConflictException si la denominación ya está en uso por otra superlínea', async () => {
      const dto: CreateSuperlineaDto = {
        denominacion: 'LIMPIEZA',
        usuarioCreatedId: 1,
        deletedAt: null,
      };
      repository.findByDenominacionWith.mockResolvedValue(
        buildEntity({ id: 9, denominacion: 'LIMPIEZA' }),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findEntityById / findDtoById', () => {
    it('debería devolver la entidad cuando existe', async () => {
      const entity = buildEntity();
      repository.findOne.mockResolvedValue(entity);

      await expect(service.findEntityById(1)).resolves.toEqual(entity);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findEntityById(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería devolver el DTO mapeado cuando existe', async () => {
      const entity = buildEntity({ denominacion: 'BEBIDAS' });
      repository.findOne.mockResolvedValue(entity);

      await expect(service.findDtoById(1)).resolves.toEqual({
        id: 1,
        denominacion: 'BEBIDAS',
        observacion: '',
        sistema: 0,
        deletedAt: null,
      });
    });

    it('debería lanzar NotFoundException en findDtoById si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDtoById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debería actualizar la denominación y observación', async () => {
      const dto: UpdateSuperlineaDto = {
        denominacion: 'HIGIENE',
        observacion: 'actualizado',
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      repository.findByDenominacionWith.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        buildEntity({ denominacion: 'HIGIENE', observacion: 'actualizado' }),
      );

      const result = await service.update(1, dto);

      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result.mensaje).toContain('HIGIENE');
    });

    it('debería lanzar NotFoundException si la superlínea no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { usuarioUpdatedId: 2 } as UpdateSuperlineaDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si es una superlínea de sistema', async () => {
      repository.findOne.mockResolvedValue(buildEntity({ sistema: 1 }));

      await expect(
        service.update(1, { usuarioUpdatedId: 2 } as UpdateSuperlineaDto),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si la nueva denominación ya está en uso', async () => {
      const dto: UpdateSuperlineaDto = {
        denominacion: 'ALIMENTOS',
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      repository.findByDenominacionWith.mockResolvedValue(
        buildEntity({ id: 8, denominacion: 'ALIMENTOS' }),
      );

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('findAllFor', () => {
    it('debería devolver superlíneas mapeadas a DTO', async () => {
      const entity = buildEntity({ denominacion: 'ALIMENTOS' });
      repository.findAllFor.mockResolvedValue([entity]);

      const result = await service.findAllFor('ALIMENTOS');

      expect(repository.findAllFor).toHaveBeenCalledWith('ALIMENTOS');
      expect(result.data).toEqual([
        {
          id: 1,
          denominacion: 'ALIMENTOS',
          observacion: '',
          sistema: 0,
          deletedAt: null,
        },
      ]);
      expect(result.total).toBe(1);
    });
  });

  describe('findAllListado', () => {
    it('debería devolver el listado del repositorio', async () => {
      const entities = [buildEntity()];
      repository.findAllListado.mockResolvedValue(entities);

      await expect(service.findAllListado()).resolves.toEqual(entities);
    });
  });

  describe('findBy', () => {
    it('debería devolver resultados paginados mapeados a DTO', async () => {
      const entity = buildEntity({ denominacion: 'LIMPIEZA' });
      repository.findBy.mockResolvedValue({ data: [entity], total: 1 });

      const result = await service.findBy('LIM', 0, 10, false);

      expect(repository.findBy).toHaveBeenCalledWith('LIM', 0, 10, false);
      expect(result.data).toEqual([
        {
          id: 1,
          denominacion: 'LIMPIEZA',
          observacion: '',
          sistema: 0,
          deletedAt: null,
        },
      ]);
      expect(result.total).toBe(1);
    });

    it('debería usar valores por defecto para skip/take/incluirEliminados', async () => {
      repository.findBy.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findBy('LIM');

      expect(repository.findBy).toHaveBeenCalledWith('LIM', 0, 10, false);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('remove', () => {
    it('debería eliminar (soft delete) cuando no tiene líneas activas', async () => {
      const entity = buildEntity();
      repository.findOne.mockResolvedValue(entity);
      politica.tieneLineasActivasParaSuperlinea.mockResolvedValue(false);
      usuarioService.findOne.mockResolvedValue({ id: 3 } as any);
      repository.remove.mockResolvedValue(entity);

      const result = await service.remove(1, 3);

      expect(politica.tieneLineasActivasParaSuperlinea).toHaveBeenCalledWith(1);
      expect(repository.remove).toHaveBeenCalledWith(entity, { id: 3 });
      expect(result.mensaje).toContain('eliminada');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 3)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si es de sistema', async () => {
      repository.findOne.mockResolvedValue(buildEntity({ sistema: 1 }));

      await expect(service.remove(1, 3)).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar ConflictException si tiene líneas activas', async () => {
      repository.findOne.mockResolvedValue(buildEntity());
      politica.tieneLineasActivasParaSuperlinea.mockResolvedValue(true);

      await expect(service.remove(1, 3)).rejects.toThrow(ConflictException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(buildEntity());
      politica.tieneLineasActivasParaSuperlinea.mockResolvedValue(false);
      usuarioService.findOne.mockResolvedValue(null as any);

      await expect(service.remove(1, 3)).rejects.toThrow(NotFoundException);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findByIdConAuditoria', () => {
    it('debería lanzar NotFoundException si la auditoría no existe', async () => {
      repository.findByIdConAuditoria.mockResolvedValue(null);

      await expect(service.findByIdConAuditoria(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});