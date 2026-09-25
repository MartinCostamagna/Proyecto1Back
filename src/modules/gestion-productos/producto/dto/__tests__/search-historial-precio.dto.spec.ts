import { SearchHistorialPrecioDto } from '../search-historial-precio.dto';
import { DtoValidatorHelper } from 'src/modules/common/test-helpers/dto-validator.helper';
import { plainToClass } from 'class-transformer';

describe('SearchHistorialPrecioDto (CR-007)', () => {
  const base = { denominacion: '', skip: 0, take: 10 };

  describe('paginación', () => {
    it('debería ser válido con la paginación por defecto', async () => {
      await DtoValidatorHelper.expectValidDto(SearchHistorialPrecioDto, { denominacion: '' });
    });

    it('debería aceptar skip y take numéricos', async () => {
      await DtoValidatorHelper.expectValidDto(SearchHistorialPrecioDto, {
        denominacion: '',
        skip: 20,
        take: 25,
      });
    });

    it('debería rechazar take menor a 1', async () => {
      await DtoValidatorHelper.expectFieldError(
        SearchHistorialPrecioDto,
        { ...base, take: 0 },
        'take',
        'take debe ser un número entero mayor que 0',
      );
    });

    it('debería rechazar skip negativo', async () => {
      await DtoValidatorHelper.expectFieldError(
        SearchHistorialPrecioDto,
        { ...base, skip: -1 },
        'skip',
        'skip debe ser un número entero positivo o 0',
      );
    });

    it('debería rechazar take no numérico', async () => {
      await DtoValidatorHelper.expectFieldError(
        SearchHistorialPrecioDto,
        { ...base, take: 'muchos' },
        'take',
      );
    });
  });

  describe('filtro por producto', () => {
    it('debería ser válido sin productoId', async () => {
      await DtoValidatorHelper.expectValidDto(SearchHistorialPrecioDto, base);
    });

    it('debería aceptar un productoId numérico', async () => {
      await DtoValidatorHelper.expectValidDto(SearchHistorialPrecioDto, {
        ...base,
        productoId: 12,
      });
    });

    it('debería rechazar un productoId no entero', async () => {
      await DtoValidatorHelper.expectFieldError(
        SearchHistorialPrecioDto,
        { ...base, productoId: 1.5 },
        'productoId',
        'El productoId debe ser un número entero.',
      );
    });
  });

  describe('filtro por rango de fechas', () => {
    it('debería aceptar fechas con formato YYYY-MM-DD', async () => {
      await DtoValidatorHelper.expectValidDto(SearchHistorialPrecioDto, {
        ...base,
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
      });
    });

    it('debería rechazar una fechaDesde con formato inválido', async () => {
      await DtoValidatorHelper.expectFieldError(
        SearchHistorialPrecioDto,
        { ...base, fechaDesde: 'ayer' },
        'fechaDesde',
        'La fechaDesde debe tener formato YYYY-MM-DD.',
      );
    });

    it('debería rechazar una fechaHasta con formato inválido', async () => {
      await DtoValidatorHelper.expectFieldError(
        SearchHistorialPrecioDto,
        { ...base, fechaHasta: '25/09/2026' },
        'fechaHasta',
        'La fechaHasta debe tener formato YYYY-MM-DD.',
      );
    });
  });

  describe('filtro por motivo', () => {
    it('debería ser válido sin motivo', async () => {
      await DtoValidatorHelper.expectValidDto(SearchHistorialPrecioDto, base);
    });

    it('debería normalizar el motivo a minúsculas y sin espacios', async () => {
      const dto = plainToClass(SearchHistorialPrecioDto, {
        ...base,
        motivo: '  Aumento de PROVEEDOR  ',
      });

      expect(dto.motivo).toBe('aumento de proveedor');
    });

    it('debería dejar intacto un motivo que no es string', () => {
      // Cubre la rama "no string" del @Transform
      const dto = plainToClass(SearchHistorialPrecioDto, {
        ...base,
        motivo: 123,
      });

      expect(dto.motivo).toBe(123);
    });
  });
});
