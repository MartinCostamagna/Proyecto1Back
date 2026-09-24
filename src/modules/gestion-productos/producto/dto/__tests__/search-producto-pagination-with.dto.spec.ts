import 'reflect-metadata';
import { SearchProductoPaginationWithDto } from '../search-producto-pagination-with.dto';
import { DtoValidatorHelper } from '../../../../common/test-helpers/dto-validator.helper';

describe('SearchProductoPaginationWithDto', () => {
  describe('Validación exitosa', () => {
    it('debería ser válido solo con los valores por defecto de skip/take', async () => {
      await DtoValidatorHelper.expectValidDto(
        SearchProductoPaginationWithDto,
        {},
      );
    });

    it('debería aceptar superlineaId numérico', async () => {
      await DtoValidatorHelper.expectValidDto(
        SearchProductoPaginationWithDto,
        { superlineaId: 1 },
      );
    });

    it('debería aceptar una búsqueda completa (CR-004)', async () => {
      await DtoValidatorHelper.expectValidDto(
        SearchProductoPaginationWithDto,
        {
          denominacion: 'COCA 500',
          superlineaId: 1,
          lineaId: 2,
          marcaId: 3,
          proveedorId: 4,
          skip: 0,
          take: 10,
        },
      );
    });

    it('debería interpretar skips y takes como números (strings)', async () => {
      await DtoValidatorHelper.expectValidDto(
        SearchProductoPaginationWithDto,
        { skip: '5', take: '20' },
      );
    });

    it('debería interpretar codProveedorExacto booleano (string "true")', async () => {
      await DtoValidatorHelper.expectValidDto(
        SearchProductoPaginationWithDto,
        { codProveedorExacto: 'true' },
      );
    });
  });

  describe('Validación de superlineaId (RN-14)', () => {
    it('debería rechazar superlineaId no numérico', async () => {
      const mensajes = await DtoValidatorHelper.expectInvalidDto(
        SearchProductoPaginationWithDto,
        { superlineaId: 'no-numero' },
      );
      expect(mensajes.some((m) => m.includes('integer'))).toBe(true);
    });

    it('debería rechazar superlineaId decimal', async () => {
      const mensajes = await DtoValidatorHelper.expectInvalidDto(
        SearchProductoPaginationWithDto,
        { superlineaId: 1.5 },
      );
      expect(mensajes.some((m) => m.includes('integer'))).toBe(true);
    });
  });

  describe('Validación de paginación', () => {
    it('debería rechazar skip negativo', async () => {
      const mensajes = await DtoValidatorHelper.expectInvalidDto(
        SearchProductoPaginationWithDto,
        { skip: -1 },
      );
      expect(mensajes.some((m) => m.includes('positivo'))).toBe(true);
    });

    it('debería rechazar take menor a 1', async () => {
      const mensajes = await DtoValidatorHelper.expectInvalidDto(
        SearchProductoPaginationWithDto,
        { take: 0 },
      );
      expect(mensajes.some((m) => m.includes('mayor'))).toBe(true);
    });
  });
});