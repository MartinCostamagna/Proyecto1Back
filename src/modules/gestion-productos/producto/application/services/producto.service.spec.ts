import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ProductoService } from './producto.service';
import { LineaService } from 'src/modules/gestion-productos/linea/application/services/linea.service';
import { MarcaService } from 'src/modules/gestion-productos/marca/application/services/marca.service';
import { SuperlineaService } from 'src/modules/gestion-productos/superlinea/application/services/superlinea.service';
import { ProveedorService } from 'src/modules/organizacion/proveedor/application/services/proveedor.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { ProductoValidationService } from '../../domain/services/producto-validation.service.ts';
import { ProductoRelatedEntitiesValidator } from '../../infraestructure/validators/producto-related-entities.validator.ts';
import { ProductoUniquenessValidator } from '../../infraestructure/validators/producto-uniqueness.validator.ts';
import { UsuarioValidator } from 'src/modules/common/utils/validation/usuario-validator';
import { ProductoDeletePolicy } from '../policies/producto-delete.policy';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { UpdateProductoDto } from '../../dto/update-producto.dto';

function buildMarca(id = 1, denominacion = 'COCA') {
  return { id, denominacion, productos: [] as any[] };
}

function buildLinea(id = 1, denominacion = 'GASEOSAS') {
  return { id, denominacion, productos: [] as any[] };
}

function buildPresentacion(id = 2, denominacion = 'pack x6 de 500ml') {
  return { id, denominacion, productos: [] as any[] };
}

function buildProducto(presentacionId: number | null = 2) {
  return {
    id: 1,
    denominacion: 'coca gaseosas pack x6 de 500ml',
    marcaId: 1,
    lineaId: 1,
    presentacionId,
    stock: 5,
    codigoProveedor: 'P-001',
    sistema: 0,
    linea: { id: 1, denominacion: 'GASEOSAS' },
    marca: { id: 1, denominacion: 'COCA' },
  };
}

describe('ProductoService', () => {
  let service: ProductoService;
  let repository: jest.Mocked<any>;
  let lineaService: jest.Mocked<LineaService>;
  let marcaService: jest.Mocked<MarcaService>;
  let superlineaService: jest.Mocked<SuperlineaService>;
  let usuarioService: jest.Mocked<UsuarioService>;
  let relatedEntitiesValidator: jest.Mocked<ProductoRelatedEntitiesValidator>;
  let uniquenessValidator: jest.Mocked<ProductoUniquenessValidator>;
  let intrinsicValidationService: jest.Mocked<ProductoIntrinsicValidationService>;
  let validationService: jest.Mocked<ProductoValidationService>;
  let usuarioValidator: jest.Mocked<UsuarioValidator>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      updateEntity: jest.fn(),
      findOne: jest.fn(),
      findBy: jest.fn(),
      findByRapido: jest.fn(),
      findByDenominacionCodigoProveedorFiltered: jest.fn(),
      findByIds: jest.fn(),
      findByIdConAuditoria: jest.fn(),
      remove: jest.fn(),
      existsProductosActivosByMarca: jest.fn(),
      existsProductosActivosByLinea: jest.fn(),
    };

    lineaService = {
      findEntityById: jest.fn(),
      findAllFor: jest.fn(),
    } as any;

    marcaService = {
      findEntityById: jest.fn(),
      findAllFor: jest.fn(),
    } as any;

    superlineaService = {
      findAllFor: jest.fn(),
    } as any;

    usuarioService = {
      findOne: jest.fn(),
    } as any;

    relatedEntitiesValidator = {
      validarYObtenerEntidadesRelacionadas: jest.fn(),
    } as any;

    uniquenessValidator = {
      validarDenominacionUnica: jest.fn(),
      validarCodigoProveedorUnico: jest.fn(),
    } as any;

    intrinsicValidationService = {
      validarDatosBasicos: jest.fn(),
    } as any;

    validationService = {
      validarEntidadesRelacionadas: jest.fn(),
    } as any;

    usuarioValidator = {
      validarUsuarioExiste: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductoService,
        { provide: 'IProductoRepository', useValue: repository },
        { provide: LineaService, useValue: lineaService },
        { provide: MarcaService, useValue: marcaService },
        { provide: SuperlineaService, useValue: superlineaService },
        { provide: ProveedorService, useValue: {} },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ProductoIntrinsicValidationService, useValue: intrinsicValidationService },
        { provide: ProductoValidationService, useValue: validationService },
        { provide: ProductoRelatedEntitiesValidator, useValue: relatedEntitiesValidator },
        { provide: ProductoUniquenessValidator, useValue: uniquenessValidator },
        { provide: UsuarioValidator, useValue: usuarioValidator },
        { provide: ProductoDeletePolicy, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductoService>(ProductoService);
    usuarioValidator.validarUsuarioExiste.mockResolvedValue({ id: 1 } as any);
  });

  function setupEntidades(presentacion: any = buildPresentacion()) {
    relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas.mockResolvedValue({
      marca: buildMarca(),
      linea: buildLinea(),
      presentacion,
    });
  }

  function baseCreateDto(presentacionId?: number): CreateProductoDto {
    return {
      denominacion: '',
      utilizaStockMinimo: false,
      utilizaPack: false,
      lineaId: 1,
      marcaId: 1,
      ...(presentacionId != null ? { presentacionId } : {}),
      alicuotaIva: 21,
      usuarioCreatedId: 1,
    } as CreateProductoDto;
  }

  describe('create', () => {
    it('debería autogenerar la denominación con Marca + Línea + Presentación si viene vacía', async () => {
      setupEntidades();
      repository.create.mockResolvedValue({
        id: 1,
        denominacion: 'coca gaseosas pack x6 de 500ml',
      });

      const dto = baseCreateDto(2);
      await service.create(dto);

      expect(relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas).toHaveBeenCalledWith(1, 1, 2);
      expect(dto.denominacion).toBe('coca gaseosas pack x6 de 500ml');
      expect(uniquenessValidator.validarDenominacionUnica).toHaveBeenCalledWith('coca gaseosas pack x6 de 500ml');
      expect(repository.create).toHaveBeenCalledWith(
        dto,
        buildLinea(),
        buildMarca(),
        { id: 1 },
        buildPresentacion(),
      );
    });

    it('debería autogenerar la denominación con Marca + Línea cuando no hay presentación', async () => {
      setupEntidades(null);
      repository.create.mockResolvedValue({ id: 1, denominacion: 'coca gaseosas' });

      const dto = baseCreateDto();
      await service.create(dto);

      expect(dto.denominacion).toBe('coca gaseosas');
      expect(repository.create).toHaveBeenCalledWith(dto, buildLinea(), buildMarca(), { id: 1 }, null);
    });

    it('debería conservar la denominación provista por el usuario', async () => {
      setupEntidades(null);
      repository.create.mockResolvedValue({ id: 1, denominacion: 'promo verano' });

      const dto = baseCreateDto() as CreateProductoDto;
      dto.denominacion = 'Promo Verano';
      await service.create(dto);

      expect(dto.denominacion).toBe('Promo Verano');
      expect(uniquenessValidator.validarDenominacionUnica).toHaveBeenCalledWith('Promo Verano');
    });

    it('debería validar unicidad de código de proveedor cuando se provee', async () => {
      setupEntidades();
      repository.create.mockResolvedValue({ id: 1, denominacion: 'coca gaseosas' });

      const dto = baseCreateDto() as CreateProductoDto;
      dto.denominacion = 'con codigo';
      dto.codigoProveedor = 'XPTO';
      await service.create(dto);

      expect(uniquenessValidator.validarCodigoProveedorUnico).toHaveBeenCalledWith('XPTO', 0);
    });
  });

  describe('update', () => {
    it('debería autogenerar la denominación si viene explícitamente vacía', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      setupEntidades();
      repository.update.mockResolvedValue({
        id: 1,
        denominacion: 'coca gaseosas pack x6 de 500ml',
      });

      const dto: UpdateProductoDto = {
        denominacion: '   ',
        usuarioUpdatedId: 1,
      } as UpdateProductoDto;
      await service.update(1, dto);

      expect(dto.denominacion).toBe('coca gaseosas pack x6 de 500ml');
      expect(repository.update).toHaveBeenCalled();
    });

    it('debería conservar la denominación existente si viene ausente', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      setupEntidades();
      repository.update.mockResolvedValue({ id: 1, denominacion: 'nombre existente' });

      const dto: UpdateProductoDto = {
        usuarioUpdatedId: 1,
        updatedAt: new Date(),
      } as UpdateProductoDto;
      await service.update(1, dto);

      expect(dto.denominacion).toBeUndefined();
      expect(uniquenessValidator.validarDenominacionUnica).not.toHaveBeenCalled();
    });

    it('debería validar unicidad si viene una nueva denominación', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      setupEntidades();
      repository.update.mockResolvedValue({ id: 1, denominacion: 'nueva denom' });

      const dto: UpdateProductoDto = {
        denominacion: 'Nueva denom',
        usuarioUpdatedId: 1,
      } as UpdateProductoDto;
      await service.update(1, dto);

      expect(uniquenessValidator.validarDenominacionUnica).toHaveBeenCalledWith('Nueva denom', 1);
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { usuarioUpdatedId: 1 } as UpdateProductoDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar InternalServerErrorException si el producto no tiene línea/marca', async () => {
      repository.findOne.mockResolvedValue({ id: 1, lineaId: null, marcaId: null });

      await expect(
        service.update(1, { usuarioUpdatedId: 1 } as UpdateProductoDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('debería eliminar (soft delete) con usuario válido', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      usuarioService.findOne.mockResolvedValue({ id: 3 } as any);
      repository.remove.mockResolvedValue(buildProducto());

      const result = await service.remove(1, 3);

      expect(repository.remove).toHaveBeenCalledWith(buildProducto(), { id: 3 });
      expect(result.mensaje).toContain('eliminada');
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 3)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      usuarioService.findOne.mockResolvedValue(null as any);

      await expect(service.remove(1, 3)).rejects.toThrow(NotFoundException);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('consultas de lectura', () => {
    it('findByRapido debería mapear resultados a toBusquedaDto', async () => {
      const producto = buildProducto();
      repository.findByRapido.mockResolvedValue({ data: [{ ...producto }], total: 1 });

      const result = await service.findByRapido('COCA', false, 0, 10);

      expect(repository.findByRapido).toHaveBeenCalledWith('COCA', false, 0, 10);
      expect(result.data[0].id).toBe(1);
      expect(result.total).toBe(1);
    });

    it('findBy debería mapear resultados a toBusquedaDto', async () => {
      repository.findBy.mockResolvedValue({ data: [{ ...buildProducto() }], total: 5 });

      const result = await service.findBy('COCA', '', false, '', 0, 0, 0, 0, false, 0, 10);

      expect(repository.findBy).toHaveBeenCalledWith('COCA', '', false, '', 0, 0, 0, 0, false, 0, 10);
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(5);
    });

    it('findByDenominacionCodigoProveedorFiltered debería mapear resultados', async () => {
      repository.findByDenominacionCodigoProveedorFiltered.mockResolvedValue({
        data: [{ ...buildProducto() }],
        total: 1,
      });

      const result = await service.findByDenominacionCodigoProveedorFiltered('P-001');

      expect(repository.findByDenominacionCodigoProveedorFiltered).toHaveBeenCalledWith('P-001', 0, 10);
      expect(result.data.length).toBe(1);
    });

    it('findDtoById debería devolver el DTO mapeado', async () => {
      repository.findOne.mockResolvedValue(buildProducto());

      const result = await service.findDtoById(1);

      expect(result.id).toBe(1);
    });

    it('findDtoById debería lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDtoById(1)).rejects.toThrow(NotFoundException);
    });

    it('findEntityById debería devolver la entidad', async () => {
      repository.findOne.mockResolvedValue(buildProducto());

      await expect(service.findEntityById(1)).resolves.toEqual(buildProducto());
    });

    it('findEntityById debería lanzar NotFoundException si no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findEntityById(1)).rejects.toThrow(NotFoundException);
    });

    it('findByIdConAuditoria debería devolver la auditoría mapeada', async () => {
      repository.findByIdConAuditoria.mockResolvedValue({
        id: 1,
        denominacion: 'coca gaseosas pack x6 de 500ml',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        usuarioCreated: { denominacion: 'admin' },
        usuarioUpdated: { denominacion: 'admin' },
        usuarioDeleted: null,
      } as any);

      const result = await service.findByIdConAuditoria(1);

      expect(repository.findByIdConAuditoria).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
      expect(result.detalle).toContain('Producto');
    });

    it('findByIdConAuditoria debería lanzar NotFoundException si no existe', async () => {
      repository.findByIdConAuditoria.mockResolvedValue(null);

      await expect(service.findByIdConAuditoria(1)).rejects.toThrow(NotFoundException);
    });

    it('findByIds debería delegar en el repositorio', async () => {
      repository.findByIds.mockResolvedValue([buildProducto()]);

      await expect(service.findByIds([1, 2])).resolves.toHaveLength(1);
    });

    it('buscarMarcaDesdeProducto debería delegar en marcaService', async () => {
      marcaService.findEntityById.mockResolvedValue(buildMarca() as any);

      const result = await service.buscarMarcaDesdeProducto(5);

      expect(marcaService.findEntityById).toHaveBeenCalledWith(5);
      expect(result).toEqual(buildMarca());
    });

    it('buscarLineaDesdeProducto debería delegar en lineaService', async () => {
      lineaService.findEntityById.mockResolvedValue(buildLinea(5) as any);

      await expect(service.buscarLineaDesdeProducto(5)).resolves.toEqual(buildLinea(5));
    });

    it('findAllForLineas debería delegar en lineaService', async () => {
      lineaService.findAllFor.mockResolvedValue({ data: [], total: 0 });

      await expect(service.findAllForLineas('GA')).resolves.toEqual({ data: [], total: 0 });
    });

    it('findAllForMarcas debería delegar en marcaService', async () => {
      marcaService.findAllFor.mockResolvedValue({ data: [], total: 0 });

      await expect(service.findAllForMarcas('CO')).resolves.toEqual({ data: [], total: 0 });
    });

    it('findAllForSuperlineas debería delegar en superlineaService', async () => {
      superlineaService.findAllFor.mockResolvedValue({ data: [], total: 0 });

      await expect(service.findAllForSuperlineas('ALIMENTOS')).resolves.toEqual({ data: [], total: 0 });
    });

    it('existsProductosActivosByMarca debería delegar en el repositorio', async () => {
      repository.existsProductosActivosByMarca.mockResolvedValue(true);

      await expect(service.existsProductosActivosByMarca(1)).resolves.toBe(true);
    });

    it('existsProductosActivosByLinea debería delegar en el repositorio', async () => {
      repository.existsProductosActivosByLinea.mockResolvedValue(false);

      await expect(service.existsProductosActivosByLinea(1)).resolves.toBe(false);
    });
  });

  describe('stock', () => {
    it('incrementarStock debería sumar cantidad', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      repository.updateEntity.mockResolvedValue(undefined);

      const nuevo = await service.incrementarStock({} as any, 1, 3, 'COMPRA');

      expect(nuevo).toBe(8);
      expect(repository.updateEntity).toHaveBeenCalled();
    });

    it('decrementarStock debería restar cantidad', async () => {
      repository.findOne.mockResolvedValue(buildProducto());
      repository.updateEntity.mockResolvedValue(undefined);

      const nuevo = await service.decrementarStock({} as any, 1, 2);

      expect(nuevo).toBe(3);
    });

    it('debería asumir stock 0 si el producto no tiene stock definido', async () => {
      repository.findOne.mockResolvedValue({ ...buildProducto(), stock: null });
      repository.updateEntity.mockResolvedValue(undefined);

      const nuevo = await service.incrementarStock({} as any, 1, 4);

      expect(nuevo).toBe(4);
    });

    it('debería lanzar Error si el producto no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.incrementarStock({} as any, 1, 1)).rejects.toThrow(
        'Producto con ID 1 no encontrado',
      );
    });
  });
});