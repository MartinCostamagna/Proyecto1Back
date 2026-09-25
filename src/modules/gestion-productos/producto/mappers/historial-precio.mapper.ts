import { HistorialPrecio } from '../domain/entities/historial-precio.entity';
import { HistorialPrecioDto } from '../dto/historial-precio.dto';

/**
 * Redondea a 2 decimales evitando el error de coma flotante
 * (ej: 0.30000000000000004 -> 0.3).
 */
const round2 = (value: number): number => Math.round(value * 100) / 100;

export class HistorialPrecioMapper {
  static toDto(entity: HistorialPrecio): HistorialPrecioDto {
    const precioAnterior = Number(entity.precioAnterior ?? 0);
    const precioNuevo = Number(entity.precioNuevo ?? 0);
    const variacion = round2(precioNuevo - precioAnterior);
    const variacionPorcentaje =
      precioAnterior > 0 ? round2((variacion / precioAnterior) * 100) : 0;

    return {
      id: entity.id,
      productoId: entity.producto?.id ?? 0,
      productoDenominacion: entity.producto?.denominacion ?? '',
      productoLinea: entity.producto?.linea?.denominacion ?? '',
      precioAnterior,
      precioNuevo,
      variacion,
      variacionPorcentaje,
      fecha: entity.fecha instanceof Date ? entity.fecha.toISOString() : String(entity.fecha),
      motivo: entity.motivo,
      usuarioDenominacion: entity.usuarioCreated?.denominacion ?? 'Sistema',
    };
  }
}
