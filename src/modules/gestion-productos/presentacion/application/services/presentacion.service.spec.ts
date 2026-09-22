import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PresentacionService } from './presentacion.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { PoliticaEliminacionPresentacion } from '../../domain/services/politica-eliminacion-presentacion.service';
import { IPresentacionRepository } from '../../domain/interfaces/presentacion.repository.interface';
import { CreatePresentacionDto } from '../../dto/create-presentacion.dto';
import { UpdatePresentacionDto } from '../../dto/update-presentacion.dto';
import { Presentacion } from '../../domain/entities/presentacion.entity';

function buildEntity(presentacion?: Partial<Presentacion>): Presentacion {
  return {
    id: 1,
    denominacion: 'pack x6 de 500ml',
    observacion: '',
    sistema: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    usuarioCreatedId: 1,
    ...presentacion,
  } as Presentacion;
}

describe('PresentacionService', () => {
  let service: PresentacionService;
  let repository: jest.Mocked<IPresentacionRepository>;
  let usuarioService: jest.Mocked<UsuarioService>;
  let politica: jest.Mocked<PoliticaEliminacionPresentacion>;

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
      tieneProductosActivosParaPresentacion: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresentacionService,
        { provide: 'IPresentacionRepository', useValue: repository },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: PoliticaEliminacionPresentacion, useValue: politica },
      ],
    }).compile();

    service = module.get<PresentacionService>(PresentacionService);
  });

  describe('create', () => {
    it('debería crear la presentación cuando la denominación no existe', async () => {
      const dto: CreatePresentacionDto = {
        denominacion: 'Pack X6 De 500Ml',
        observacion: 'caja de 6',
        usuarioCreatedId: 1,
      };
      repository.findByDenominacionWith.mockResolvedValue(null);
      repository.create.mockResolvedValue(
        buildEntity({ denominacion: 'pack x6 de 500ml' }),
      );

      const result = await service.create(dto);

      expect(repository.findByDenominacionWith).toHaveBeenCalledWith(
        'Pack X6 De 500Ml',
      );
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        mensaje:
          'Presentación creada con éxito con denominacion: pack x6 de 500ml',
      });
    });

    it('debería lanzar ConflictException si la denominación ya está en uso por otra presentación', async () => {
      const dto: CreatePresentacionDto = {
        denominacion: '1l',
        usuarioCreatedId: 1,
      };
      repository.findByDenominacionWith.mockResolvedValue(
        buildEntity({ id: 9, denominacion: '1l' }),
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

      await expect(service.findEntityById(1)).rejects.toThrow(NotFoundException);
    });

    it('debería devolver el DTO mapeado cuando existe', async () => {
      const entity = buildEntity({ denominacion: '2.25l' });
      repository.findOne.mockResolvedValue(entity);

      await expect(service.findDtoById(1)).resolves.toEqual({
        id: 1,
        denominacion: '2.25l',
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
      const dto: UpdatePresentacionDto = {
        denominacion: 'pack x12',
        observacion: 'actualizado',
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      repository.findByDenominacionWith.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        buildEntity({ denominacion: 'pack x12', observacion: 'actualizado' }),
      );

      const result = await service.update(1, dto);

      expect(repository.update).toHaveBeenCalledWith(1, dto);
      expect(result.mensaje).toContain('pack x12');
    });

    it('debería lanzar NotFoundException si la presentación no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { usuarioUpdatedId: 2 } as UpdatePresentacionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si es una presentación de sistema', async () => {
      repository.findOne.mockResolvedValue(buildEntity({ sistema: 1 }));

      await expect(
        service.update(1, { usuarioUpdatedId: 2 } as UpdatePresentacionDto),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si la nueva denominación ya está en uso', async () => {
      const dto: UpdatePresentacionDto = {
        denominacion: '800ml',
        usuarioUpdatedId: 2,
        updatedAt: new Date(),
      };
      repository.findOne.mockResolvedValue(buildEntity());
      repository.findByDenominacionWith.mockResolvedValue(
        buildEntity({ id: 8, denominacion: '800ml' }),
      );

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('findAllFor', () => {
    it('debería devolver presentaciones mapeadas a DTO', async () => {
      const entity = buildEntity({ denominacion: '500ml' });
      repository.findAllFor.mockResolvedValue([entity]);

      const result = await service.findAllFor('500');

      expect(repository.findAllFor).toHaveBeenCalledWith('500');
      expect(result.data).toEqual([
        {
          id: 1,
          denominacion: '500ml',
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
      const entity = buildEntity({ denominacion: '1l' });
      repository.findBy.mockResolvedValue({ data: [entity], total: 1 });

      const result = await service.findBy('1', 0, 10, false);

      expect(repository.findBy).toHaveBeenCalledWith('1', 0, 10, false);
      expect(result.data).toEqual([
        {
          id: 1,
          denominacion: '1l',
          observacion: '',
          sistema: 0,
          deletedAt: null,
        },
      ]);
      expect(result.total).toBe(1);
    });

    it('debería usar valores por defecto para skip/take/incluirEliminados', async () => {
      repository.findBy.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findBy('1');

      expect(repository.findBy).toHaveBeenCalledWith('1', 0, 10, false);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('remove', () => {
    it('debería eliminar (soft delete) cuando no tiene productos activos', async () => {
      const entity = buildEntity();
      repository.findOne.mockResolvedValue(entity);
      politica.tieneProductosActivosParaPresentacion.mockResolvedValue(false);
      usuarioService.findOne.mockResolvedValue({ id: 3 } as any);
      repository.remove.mockResolvedValue(entity);

      const result = await service.remove(1, 3);

      expect(politica.tieneProductosActivosParaPresentacion).toHaveBeenCalledWith(1);
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

    it('debería lanzar ConflictException si tiene productos activos', async () => {
      repository.findOne.mockResolvedValue(buildEntity());
      politica.tieneProductosActivosParaPresentacion.mockResolvedValue(true);

      await expect(service.remove(1, 3)).rejects.toThrow(ConflictException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(buildEntity());
      politica.tieneProductosActivosParaPresentacion.mockResolvedValue(false);
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