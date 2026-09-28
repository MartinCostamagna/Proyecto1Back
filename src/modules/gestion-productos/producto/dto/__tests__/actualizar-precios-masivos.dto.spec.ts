import { ActualizarPreciosMasivosDto, TipoActualizacionPrecio } from '../actualizar-precios-masivos.dto';
import { DtoValidatorHelper } from 'src/modules/common/test-helpers/dto-validator.helper';

describe('ActualizarPreciosMasivosDto — CR-007', () => {
  const base = {
    tipo: TipoActualizacionPrecio.PORCENTAJE,
    valor: 10,
    usuarioId: 7,
    motivo: 'Aumento de lista de precios',
  };

  describe('motivo del cambio (regla de negocio CR-007)', () => {
    it('debería ser válido cuando el motivo viene informado', async () => {
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, base);
    });

    it('debería ser inválido si el motivo no viene', async () => {
      const { motivo, ...sinMotivo } = base;
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        sinMotivo,
        'motivo',
        'El motivo del cambio de precio es obligatorio.',
      );
    });

    it('debería ser inválido si el motivo es una cadena vacía', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, motivo: '' },
        'motivo',
        'El motivo del cambio de precio es obligatorio.',
      );
    });

    it('debería ser inválido si el motivo solo tiene espacios', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, motivo: '   ' },
        'motivo',
        'El motivo del cambio de precio no puede tener solo espacios.',
      );
    });

    it('debería ser inválido si el motivo no es texto', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, motivo: 123 },
        'motivo',
      );
    });
  });

  describe('tipo de ajuste', () => {
    it('debería aceptar PORCENTAJE', async () => {
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, base);
    });

    it('debería aceptar MONTO', async () => {
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, {
        ...base,
        tipo: TipoActualizacionPrecio.MONTO,
      });
    });

    it('debería rechazar un tipo desconocido', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, tipo: 'OTRO' },
        'tipo',
      );
    });
  });

  describe('valores y alcance', () => {
    it('debería rechazar un usuarioId menor a 1', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, usuarioId: 0 },
        'usuarioId',
      );
    });

    it('debería rechazar un valor de ajuste no numérico', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, valor: 'diez' },
        'valor',
      );
    });

    it('debería permitir línea, marca y superlínea como filtros de alcance', async () => {
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, {
        ...base,
        lineaId: 3,
      });
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, {
        ...base,
        marcaId: 4,
      });
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, {
        ...base,
        superlineaId: 2,
      });
    });

    it('debería permitir los tres filtros de alcance combinados', async () => {
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, {
        ...base,
        marcaId: 4,
        lineaId: 3,
        superlineaId: 2,
      });
    });

    it('debería rechazar un filtro de alcance no numérico', async () => {
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, marcaId: 'coca' },
        'marcaId',
      );
      await DtoValidatorHelper.expectFieldError(
        ActualizarPreciosMasivosDto,
        { ...base, superlineaId: 'alimentos' },
        'superlineaId',
      );
    });

    it('debería permitir un valor negativo en MONTO (descuentos)', async () => {
      await DtoValidatorHelper.expectValidDto(ActualizarPreciosMasivosDto, {
        ...base,
        tipo: TipoActualizacionPrecio.MONTO,
        valor: -50,
      });
    });
  });
});
