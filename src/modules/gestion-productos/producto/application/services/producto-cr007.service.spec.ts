import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { ActualizarPreciosMasivosDto, TipoActualizacionPrecio } from '../../dto/actualizar-precios-masivos.dto';
import { HistorialPrecioDto } from '../../dto/historial-precio.dto';

/**
 * CR-007 — Historial de precios
 *
 * Cubre las reglas de negocio del CR, no solo el endpoint:
 *  1. El precio de venta DEBE ser > 0 (regla del CR).
 *  2. El precio se calcula como costo + costo * (margen / 100).
 *  3. Todo cambio de precio exige un motivo.
 *  4. El motivo queda normalizado (trim) en el historial.
 *  5. Si el precio no cambia, NO se genera historial ni se exige motivo.
 *  6. El producto y su historial se persisten en la misma operación transaccional.
 *  7. El cambio masivo exige motivo y solo registra los productos que cambiaron.
 */
describe('CR-007 — ProductoService (reglas de negocio del historial de precios)', () => {
  let service: ProductoService;
  let repository: jest.Mocked<any>;
  let usuarioService: jest.Mocked<UsuarioService>;
  let relatedEntitiesValidator: jest.Mocked<ProductoRelatedEntitiesValidator>;
  let uniquenessValidator: jest.Mocked<ProductoUniquenessValidator>;
  let usuarioValidator: jest.Mocked<UsuarioValidator>;

  const USUARIO = { id: 4 } as any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      updateConHistorialPrecio: jest.fn(),
      updateEntity: jest.fn(),
      findOne: jest.fn(),
      findBy: jest.fn(),
      findByRapido: jest.fn(),
      findByDenominacionCodigoProveedorFiltered: jest.fn(),
      findByIds: jest.fn(),
      findByIdConAuditoria: jest.fn(),
      findAllByFilters: jest.fn(),
      saveMasivos: jest.fn(),
      saveMasivosConHistorial: jest.fn(),
      findHistorialBy: jest.fn(),
      remove: jest.fn(),
      existsProductosActivosByMarca: jest.fn(),
      existsProductosActivosByLinea: jest.fn(),
    } as any;

    relatedEntitiesValidator = {
      validarYObtenerEntidadesRelacionadas: jest.fn().mockResolvedValue({
        marca: { id: 1, denominacion: 'COCA' },
        linea: { id: 1, denominacion: 'GASEOSAS' },
        presentacion: null,
      }),
    } as any;

    uniquenessValidator = {
      validarDenominacionUnica: jest.fn(),
      validarCodigoProveedorUnico: jest.fn(),
    } as any;

    usuarioValidator = {
      validarUsuarioExiste: jest.fn().mockResolvedValue(USUARIO),
    } as any;

    usuarioService = { findOne: jest.fn().mockResolvedValue(USUARIO) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductoService,
        { provide: 'IProductoRepository', useValue: repository },
        { provide: LineaService, useValue: { findEntityById: jest.fn(), findAllFor: jest.fn() } },
        { provide: MarcaService, useValue: { findEntityById: jest.fn(), findAllFor: jest.fn() } },
        { provide: SuperlineaService, useValue: { findAllFor: jest.fn() } },
        { provide: ProveedorService, useValue: {} },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ProductoIntrinsicValidationService, useValue: { validarDatosBasicos: jest.fn() } },
        { provide: ProductoValidationService, useValue: { validarEntidadesRelacionadas: jest.fn() } },
        { provide: ProductoRelatedEntitiesValidator, useValue: relatedEntitiesValidator },
        { provide: ProductoUniquenessValidator, useValue: uniquenessValidator },
        { provide: UsuarioValidator, useValue: usuarioValidator },
        { provide: ProductoDeletePolicy, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductoService>(ProductoService);
  });

  /** Producto base con precio 100 y costo 100 (margen 0). */
  const producto = (over: Record<string, any> = {}) => ({
    id: 12,
    denominacion: 'coca gaseosas 500ml',
    marcaId: 1,
    lineaId: 1,
    costo: 100,
    precio: 100,
    porcentaje: 0,
    ...over,
  });

  // ==================================================================
  // REGLA 1 — El precio de venta debe ser > 0
  // ==================================================================
  describe('Regla 1: el precio de venta debe ser estrictamente mayor a 0', () => {
    it('debería rechazar un precio explícitamente 0', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { precio: 0, motivo: 'x', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar un precio negativo', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { precio: -50, motivo: 'x', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow('El precio resultante debe ser estrictamente mayor a 0.');
    });

    it('debería rechazar un costo 0 con margen 0 (precio calculado = 0)', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { costo: 0, porcentaje: 0, motivo: 'x', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow('El precio resultante debe ser estrictamente mayor a 0.');
    });

    it('debería NO tocar la persistencia cuando el precio es inválido', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { precio: -1, motivo: 'x', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow();
      expect(repository.updateConHistorialPrecio).not.toHaveBeenCalled();
    });

    it('debería aceptar un precio decimal positivo', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 0.01 }));

      await expect(
        service.update(12, { precio: 0.01, motivo: 'Ajuste fino', usuarioUpdatedId: 4 } as any),
      ).resolves.toBeDefined();
    });
  });

  // ==================================================================
  // REGLA 2 — El precio se calcula como costo + costo * (margen / 100)
  // ==================================================================
  describe('Regla 2: cálculo del precio a partir de costo y margen', () => {
    it('debería calcular precio = costo + costo * (margen / 100)', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 150 }));

      const dto: UpdateProductoDto = {
        costo: 100,
        porcentaje: 50,
        motivo: 'Aumento de margen',
        usuarioUpdatedId: 4,
      } as UpdateProductoDto;

      await service.update(12, dto);

      expect(dto.precio).toBe(150);
    });

    it('debería respetar el precio explícito del DTO por sobre el cálculo', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 999 }));

      const dto: UpdateProductoDto = {
        costo: 100,
        porcentaje: 50,
        precio: 999,
        motivo: 'Precio manual',
        usuarioUpdatedId: 4,
      } as UpdateProductoDto;

      await service.update(12, dto);

      expect(dto.precio).toBe(999);
    });

    it('debería conservar el costo y margen actuales si el DTO no los manda', async () => {
      repository.findOne.mockResolvedValue(producto({ costo: 80, precio: 80, porcentaje: 0 }));
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 80 }));

      const dto: UpdateProductoDto = {
        denominacion: 'solo denominacion',
        usuarioUpdatedId: 4,
      } as UpdateProductoDto;

      await service.update(12, dto);

      expect(dto.precio).toBe(80);
    });
  });

  // ==================================================================
  // REGLA 3 — Todo cambio de precio exige motivo
  // ==================================================================
  describe('Regla 3: el motivo es obligatorio cuando cambia el precio', () => {
    it('debería rechazar el cambio de precio si no viene motivo', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { precio: 150, usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow('Debe especificar un motivo obligatorio para el cambio de precio.');
    });

    it('debería rechazar el motivo vacío', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { precio: 150, motivo: '', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar el motivo con solo espacios', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { precio: 150, motivo: '     ', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar el cambio de precio calculado sin motivo', async () => {
      repository.findOne.mockResolvedValue(producto());

      await expect(
        service.update(12, { costo: 100, porcentaje: 50, usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow('Debe especificar un motivo obligatorio para el cambio de precio.');
    });
  });

  // ==================================================================
  // REGLA 4 — El motivo se normaliza (trim) al guardarse
  // ==================================================================
  describe('Regla 4: el motivo se normaliza antes de persistirse', () => {
    it('debería guardar el motivo sin espacios sobrantes', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 150 }));

      await service.update(12, {
        precio: 150,
        motivo: '   Aumento de proveedor   ',
        usuarioUpdatedId: 4,
      } as any);

      expect(repository.updateConHistorialPrecio).toHaveBeenCalledWith(
        12,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        USUARIO,
        null,
        expect.objectContaining({ motivo: 'Aumento de proveedor' }),
      );
    });
  });

  // ==================================================================
  // REGLA 5 — Sin cambio de precio no hay historial ni motivo
  // ==================================================================
  describe('Regla 5: sin cambio de precio no se genera historial', () => {
    it('debería pasar historial null cuando el precio no varía (y no exigir motivo)', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockResolvedValue(producto());

      const result = await service.update(12, { usuarioUpdatedId: 4 } as any);

      expect(repository.updateConHistorialPrecio).toHaveBeenCalledWith(
        12,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        USUARIO,
        null,
        null,
      );
      expect(result.mensaje).toContain('editada');
    });

    it('NO debería generar historial fantasma por error de coma flotante', async () => {
      // 3 + 3 * (10 / 100) = 3.3000000000000003 en IEEE-754, no 3.3.
      // MySQL guarda 3.3 (decimal), así que la comparación estricta "!=="
      // detectaba un cambio inexistente y exigía un motivo al usuario.
      repository.findOne.mockResolvedValue(producto({ costo: 3, precio: 3.3, porcentaje: 10 }));
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ costo: 3, precio: 3.3, porcentaje: 10 }));

      await service.update(12, { usuarioUpdatedId: 4 } as any);

      expect(repository.updateConHistorialPrecio).toHaveBeenCalledWith(
        12,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        USUARIO,
        null,
        null,
      );
    });

    it('debería seguir detectando un cambio real por debajo de ese margen', async () => {
      repository.findOne.mockResolvedValue(producto({ costo: 100, precio: 100.00002, porcentaje: 0 }));
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 100 }));

      await service.update(12, { motivo: 'Redondeo', usuarioUpdatedId: 4 } as any);

      // Diferencia = 0.00002 > tolerancia 0.00001 => sí es un cambio
      expect(repository.updateConHistorialPrecio).toHaveBeenCalledWith(
        12,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        USUARIO,
        null,
        { precioAnterior: 100.00002, precioNuevo: 100, motivo: 'Redondeo' },
      );
    });

    it('NO debería exigir motivo por una diferencia menor a la tolerancia', async () => {
      // Diferencia = 0.000001 < tolerancia 0.00001
      repository.findOne.mockResolvedValue(producto({ costo: 100, precio: 100.000001, porcentaje: 0 }));
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 100 }));

      await expect(service.update(12, { usuarioUpdatedId: 4 } as any)).resolves.toBeDefined();
    });
  });

  // ==================================================================
  // REGLA 6 — Producto + historial en la misma operación
  // ==================================================================
  describe('Regla 6: el historial se persiste junto con el producto', () => {
    it('debería enviar precioAnterior y precioNuevo correctos al historial', async () => {
      repository.findOne.mockResolvedValue(producto({ precio: 100 }));
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 175 }));

      await service.update(12, {
        precio: 175,
        motivo: 'Recosto',
        usuarioUpdatedId: 4,
      } as any);

      expect(repository.updateConHistorialPrecio).toHaveBeenCalledWith(
        12,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        USUARIO,
        null,
        { precioAnterior: 100, precioNuevo: 175, motivo: 'Recosto' },
      );
    });

    it('debería propagar el error si la persistencia transaccional falla (producto NO queda a medio actualizar)', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockRejectedValue(new Error('fallo de escritura'));

      await expect(
        service.update(12, { precio: 150, motivo: 'x', usuarioUpdatedId: 4 } as any),
      ).rejects.toThrow('fallo de escritura');
    });

    it('no debería usar el save directo del historial (quedaría fuera de la transacción)', async () => {
      repository.findOne.mockResolvedValue(producto());
      repository.updateConHistorialPrecio.mockResolvedValue(producto({ precio: 150 }));

      await service.update(12, { precio: 150, motivo: 'x', usuarioUpdatedId: 4 } as any);

      // El historial solo puede grabarse a través de la operación transaccional
      expect(repository.saveMasivosConHistorial).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  // ==================================================================
  // REGLA 7 — Cambio masivo
  // ==================================================================
  describe('Regla 7: cambio masivo de precios', () => {
    const dtoMasivo = (over: Partial<ActualizarPreciosMasivosDto> = {}) =>
      ({
        tipo: TipoActualizacionPrecio.PORCENTAJE,
        valor: 10,
        usuarioId: 4,
        motivo: 'Aumento de lista',
        ...over,
      }) as ActualizarPreciosMasivosDto;

    it('debería rechazar el cambio masivo sin motivo', async () => {
      await expect(
        service.actualizarPreciosMasivos(dtoMasivo({ motivo: '' })),
      ).rejects.toThrow('Debe especificar un motivo obligatorio para el cambio de precio.');
      expect(repository.saveMasivosConHistorial).not.toHaveBeenCalled();
    });

    it('debería rechazar el cambio masivo con motivo de solo espacios', async () => {
      await expect(
        service.actualizarPreciosMasivos(dtoMasivo({ motivo: '  ' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería marcar el precio previo SOLO en los productos cuyo precio cambia', async () => {
      repository.findAllByFilters.mockResolvedValue([
        { id: 1, precio: 100 },
        { id: 2, precio: 100 },
      ] as any);
      repository.saveMasivosConHistorial.mockResolvedValue([]);

      // valor 0 => el precio no cambia en ninguno
      await service.actualizarPreciosMasivos(dtoMasivo({ valor: 0 }));

      const productos = repository.saveMasivosConHistorial.mock.calls[0][0];
      expect(productos.every((p: any) => p.precioHistorialRegistrado === undefined)).toBe(true);
    });

    it('debería registrar el precio previo en cada producto que efectivamente cambia', async () => {
      repository.findAllByFilters.mockResolvedValue([
        { id: 1, precio: 100 },
        { id: 2, precio: 200 },
      ] as any);
      repository.saveMasivosConHistorial.mockResolvedValue([]);

      await service.actualizarPreciosMasivos(dtoMasivo({ valor: 10 }));

      const productos = repository.saveMasivosConHistorial.mock.calls[0][0];
      expect(productos[0].precio).toBe(110);
      expect(productos[0].precioHistorialRegistrado).toBe(100);
      expect(productos[1].precio).toBe(220);
      expect(productos[1].precioHistorialRegistrado).toBe(200);
    });

    it('debería pasar el motivo (normalizado) y el usuario a la operación transaccional', async () => {
      repository.findAllByFilters.mockResolvedValue([{ id: 1, precio: 100 }] as any);
      repository.saveMasivosConHistorial.mockResolvedValue([]);

      await service.actualizarPreciosMasivos(dtoMasivo({ motivo: '  Lista mayo  ' }));

      expect(repository.saveMasivosConHistorial).toHaveBeenCalledWith(
        expect.any(Array),
        USUARIO,
        'Lista mayo',
      );
    });

    it('debería aplicar MONTO con signo negativo como descuento', async () => {
      repository.findAllByFilters.mockResolvedValue([{ id: 1, precio: 100 }] as any);
      repository.saveMasivosConHistorial.mockResolvedValue([]);

      await service.actualizarPreciosMasivos(
        dtoMasivo({ tipo: TipoActualizacionPrecio.MONTO, valor: -30 }),
      );

      const productos = repository.saveMasivosConHistorial.mock.calls[0][0];
      expect(productos[0].precio).toBe(70);
      expect(productos[0].precioHistorialRegistrado).toBe(100);
    });

    it('debería truncar a 0 sin dejar precio negativo, y sin marcar historial', async () => {
      repository.findAllByFilters.mockResolvedValue([{ id: 1, precio: 10 }] as any);
      repository.saveMasivosConHistorial.mockResolvedValue([]);

      await service.actualizarPreciosMasivos(
        dtoMasivo({ tipo: TipoActualizacionPrecio.MONTO, valor: -50 }),
      );

      const productos = repository.saveMasivosConHistorial.mock.calls[0][0];
      expect(productos[0].precio).toBe(0);
    });

    it('debería rechazar si el usuario del cambio masivo no existe', async () => {
      usuarioService.findOne.mockResolvedValue(null as any);

      await expect(service.actualizarPreciosMasivos(dtoMasivo())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería rechazar un tipo de actualización inválido', async () => {
      await expect(
        service.actualizarPreciosMasivos(dtoMasivo({ tipo: 'OTRO' as any })),
      ).rejects.toThrow();
    });
  });

  // ==================================================================
  // Consulta del historial
  // ==================================================================
  describe('Consulta del historial', () => {
    it('debería delegar los filtros en el repositorio y devolver data/total', async () => {
      const data: HistorialPrecioDto[] = [
        {
          id: 1,
          productoId: 12,
          productoDenominacion: 'COCA',
          productoLinea: 'GASEOSAS',
          precioAnterior: 100,
          precioNuevo: 150,
          variacion: 50,
          variacionPorcentaje: 50,
          fecha: '2026-09-25T15:30:00.000Z',
          motivo: 'Aumento',
          usuarioDenominacion: 'Admin',
        },
      ];
      repository.findHistorialBy.mockResolvedValue({ data, total: 1 });

      const filtros = { denominacion: 'coca', motivo: 'aumento', skip: 0, take: 10 } as any;
      const result = await service.findHistorialBy(filtros);

      expect(repository.findHistorialBy).toHaveBeenCalledWith(filtros);
      expect(result.total).toBe(1);
      expect(result.data[0].variacion).toBe(50);
    });
  });
});
