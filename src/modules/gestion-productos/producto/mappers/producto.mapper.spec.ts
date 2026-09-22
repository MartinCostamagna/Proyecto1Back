import { ProductoMapper } from './producto.mapper';
import { Producto } from '../domain/entities/producto.entity';
import { Presentacion } from '../../presentacion/domain/entities/presentacion.entity';
import { UpdatePrecioDto } from '../dto/update-precio.dto';

function buildEntity(presentacion?: Partial<Presentacion> | null): Producto {
  return {
    id: 1,
    denominacion: 'COCA COLA',
    observacion: 'lata',
    codigoProveedor: 'P-001',
    codigoReferencia: 'REF-001',
    codigoBarra: '123',
    stock: 10,
    costo: 100,
    precio: 150,
    alicuotaIva: 21,
    porcentaje: 0,
    costoEnDolar: false,
    costoDolar: 0,
    cotizacionDolar: 0,
    precioDolar: 0,
    destacado: false,
    envioGratis: false,
    utilizaStockMinimo: false,
    stockMinimo: 0,
    utilizaPack: false,
    cantidadPorPack: 0,
    sistema: 0,
    ubicacion: 'A1',
    linea: { id: 1, denominacion: 'GASEOSAS' },
    marca: { id: 1, denominacion: 'COCA' } as never,
    presentacion:
      presentacion === null
        ? null
        : ({
            id: 2,
            denominacion: 'pack x6 de 500ml',
            ...presentacion,
          } as Presentacion),
  } as unknown as Producto;
}

function buildEntityConCamposNulos(): Producto {
  return {
    id: 2,
    denominacion: 'PRODUCTO SIN DATOS',
    observacion: null,
    codigoProveedor: null,
    codigoReferencia: null,
    codigoBarra: null,
    stock: null,
    costo: null,
    precio: null,
    alicuotaIva: null,
    porcentaje: null,
    costoEnDolar: null,
    costoDolar: null,
    cotizacionDolar: null,
    precioDolar: null,
    destacado: null,
    envioGratis: null,
    utilizaStockMinimo: null,
    stockMinimo: null,
    utilizaPack: null,
    cantidadPorPack: null,
    sistema: 0,
    ubicacion: null,
    linea: { id: 1, denominacion: 'GASEOSAS' } as never,
    marca: { id: 1, denominacion: 'COCA' } as never,
    presentacion: null,
  } as unknown as Producto;
}

describe('ProductoMapper - presentacion', () => {
  describe('toDto', () => {
    it('debería incluir la presentación con su denominación', () => {
      const dto = ProductoMapper.toDto(buildEntity());

      expect(dto.presentacion).toEqual({
        id: 2,
        denominacion: 'pack x6 de 500ml',
      });
    });

    it('debería devolver undefined cuando el producto no tiene presentación', () => {
      const dto = ProductoMapper.toDto(buildEntity(null));

      expect(dto.presentacion).toBeUndefined();
    });

    it('debería aplicar valores por defecto a campos nulos/ausentes', () => {
      const dto = ProductoMapper.toDto(buildEntityConCamposNulos());

      expect(dto.observacion).toBe('');
      expect(dto.codigoProveedor).toBe('');
      expect(dto.codigoBarra).toBe('');
      expect(dto.stock).toBe(0);
      expect(dto.costo).toBe(0);
      expect(dto.precio).toBe(0);
      expect(dto.porcentaje).toBe(0);
      expect(dto.costoEnDolar).toBe(false);
      expect(dto.costoDolar).toBe(0);
      expect(dto.precioDolar).toBe(0);
      expect(dto.destacado).toBe(false);
      expect(dto.envioGratis).toBe(false);
      expect(dto.ubicacion).toBe('');
      expect(dto.utilizaStockMinimo).toBe(false);
      expect(dto.stockMinimo).toBe(0);
      expect(dto.utilizaPack).toBe(false);
      expect(dto.cantidadPorPack).toBe(0);
      expect(dto.codigoReferencia).toBe('');
      expect(dto.cotizacionDolar).toBe(0);
    });
  });

  describe('toBusquedaDto', () => {
    it('debería incluir la presentación (regresión de search-by)', () => {
      const dto = ProductoMapper.toBusquedaDto(buildEntity());

      expect(dto.presentacion).toEqual({
        id: 2,
        denominacion: 'pack x6 de 500ml',
      });
    });

    it('debería devolver undefined cuando el producto no tiene presentación', () => {
      const dto = ProductoMapper.toBusquedaDto(buildEntity(null));

      expect(dto.presentacion).toBeUndefined();
    });

    it('debería calcular precio y alicuota con valores por defecto', () => {
      const dto = ProductoMapper.toBusquedaDto(buildEntityConCamposNulos());

      expect(dto.precio).toBe(0);
      expect(dto.alicuota).toBe(0);
      expect(dto.precioConIva).toBe(0);
      expect(dto.costo).toBe(0);
      expect(dto.observacion).toBe('');
      expect(dto.ubicacion).toBe('');
      expect(dto.cantidadPorPack).toBe(0);
      expect(dto.codigoProveedor).toBe('');
      expect(dto.codigoReferencia).toBe('');
    });
  });

  describe('mapPrecios', () => {
    it('debería mapear los precios y registrar el usuario que actualizó', () => {
      const entity = buildEntity(null);
      const dto: UpdatePrecioDto = {
        costo: 120,
        costoDolar: 1,
        cotizacionDolar: 85,
      } as UpdatePrecioDto;
      const usuario = { id: 5 } as any;

      ProductoMapper.mapPrecios(entity, dto, usuario);

      expect(entity.costo).toBe(120);
      expect(entity.costoDolar).toBe(1);
      expect(entity.cotizacionDolar).toBe(85);
      expect(entity.fechaCosto).toBeInstanceOf(Date);
      expect(entity.fechaCostoDolar).toBeInstanceOf(Date);
      expect(entity.usuarioUpdated).toBe(usuario);
    });
  });
});