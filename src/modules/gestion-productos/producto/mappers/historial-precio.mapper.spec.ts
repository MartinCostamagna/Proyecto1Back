import { HistorialPrecioMapper } from './historial-precio.mapper';
import { HistorialPrecio } from '../domain/entities/historial-precio.entity';

function buildHistorial(overrides: Partial<HistorialPrecio> = {}): HistorialPrecio {
  return {
    id: 1,
    precioAnterior: 100,
    precioNuevo: 150,
    motivo: 'Aumento de proveedor',
    fecha: new Date('2026-09-25T15:30:00.000Z'),
    sistema: 0,
    createdAt: new Date('2026-09-25T15:30:00.000Z'),
    updatedAt: new Date('2026-09-25T15:30:00.000Z'),
    deletedAt: undefined,
    producto: { id: 12, denominacion: 'COCA COLA 500ML', linea: { id: 3, denominacion: 'GASEOSAS' } } as any,
    usuarioCreated: { id: 4, denominacion: 'Jenifer Lopez' } as any,
    usuarioUpdated: undefined as any,
    ...overrides,
  } as HistorialPrecio;
}

describe('HistorialPrecioMapper (CR-007)', () => {
  describe('cálculo de variación', () => {
    it('debería calcular la variación absoluta y porcentual de un aumento', () => {
      const dto = HistorialPrecioMapper.toDto(buildHistorial());

      expect(dto.variacion).toBe(50);
      expect(dto.variacionPorcentaje).toBe(50);
    });

    it('debería calcular la variación de una baja como valor negativo', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ precioAnterior: 200, precioNuevo: 150 }),
      );

      expect(dto.variacion).toBe(-50);
      expect(dto.variacionPorcentaje).toBe(-25);
    });

    it('debería devolver variación 0 cuando el precio no cambió', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ precioAnterior: 100, precioNuevo: 100 }),
      );

      expect(dto.variacion).toBe(0);
      expect(dto.variacionPorcentaje).toBe(0);
    });

    it('debería devolver variaciónPorcentaje 0 y evitar división por cero si el precio anterior es 0', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ precioAnterior: 0, precioNuevo: 50 }),
      );

      expect(dto.variacion).toBe(50);
      expect(dto.variacionPorcentaje).toBe(0);
    });

    it('debería redondear a 2 decimales evitando el error de coma flotante', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ precioAnterior: 3, precioNuevo: 3.3 }),
      );

      // 0.30000000000000004 sin redondear vs 0.3 con redondeo
      expect(dto.variacion).toBe(0.3);
      expect(dto.variacionPorcentaje).toBe(10);
    });

    it('debería tolerar que el precio venga como string (columna decimal de MySQL)', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ precioAnterior: '100' as any, precioNuevo: '250' as any }),
      );

      expect(dto.precioAnterior).toBe(100);
      expect(dto.precioNuevo).toBe(250);
      expect(dto.variacion).toBe(150);
    });

    it('debería tratar null/undefined como 0 en los precios', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ precioAnterior: null as any, precioNuevo: undefined as any }),
      );

      expect(dto.precioAnterior).toBe(0);
      expect(dto.precioNuevo).toBe(0);
      expect(dto.variacion).toBe(0);
    });
  });

  describe('mapeo de relaciones y auditoría', () => {
    it('debería exponer el id y la denominación del producto', () => {
      const dto = HistorialPrecioMapper.toDto(buildHistorial());

      expect(dto.id).toBe(1);
      expect(dto.productoId).toBe(12);
      expect(dto.productoDenominacion).toBe('COCA COLA 500ML');
      expect(dto.productoLinea).toBe('GASEOSAS');
    });

    it('debería exponer el nombre del usuario que hizo el cambio', () => {
      const dto = HistorialPrecioMapper.toDto(buildHistorial());

      expect(dto.usuarioDenominacion).toBe('Jenifer Lopez');
    });

    it('debería usar "Sistema" cuando no hay usuario registrado', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ usuarioCreated: undefined }),
      );

      expect(dto.usuarioDenominacion).toBe('Sistema');
    });

    it('debería devolver strings vacíos cuando el producto no trae relaciones', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ producto: undefined as any }),
      );

      expect(dto.productoId).toBe(0);
      expect(dto.productoDenominacion).toBe('');
      expect(dto.productoLinea).toBe('');
    });

    it('debería propagar el motivo del cambio', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ motivo: 'Error de carga en el proveedor' }),
      );

      expect(dto.motivo).toBe('Error de carga en el proveedor');
    });
  });

  describe('mapeo de la fecha', () => {
    it('debería serializar la fecha a ISO 8601', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ fecha: new Date('2026-09-25T15:30:00.000Z') }),
      );

      expect(dto.fecha).toBe('2026-09-25T15:30:00.000Z');
    });

    it('debería convertir a string cuando la fecha no es un objeto Date', () => {
      const dto = HistorialPrecioMapper.toDto(
        buildHistorial({ fecha: '2026-01-15 10:00:00' as any }),
      );

      expect(dto.fecha).toBe('2026-01-15 10:00:00');
    });
  });
});
