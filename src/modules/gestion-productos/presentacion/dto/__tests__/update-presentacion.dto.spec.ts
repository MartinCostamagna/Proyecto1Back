import { UpdatePresentacionDto } from '../update-presentacion.dto';
import { DtoValidatorHelper } from '../../../../common/test-helpers/dto-validator.helper';

describe('UpdatePresentacionDto', () => {
  describe('Validación exitosa', () => {
    it('debería ser válido solo con usuarioUpdatedId (parcial)', async () => {
      await DtoValidatorHelper.expectValidDto(UpdatePresentacionDto, {
        usuarioUpdatedId: 1,
      });
    });

    it('debería ser válido con denominación y observación', async () => {
      await DtoValidatorHelper.expectValidDto(UpdatePresentacionDto, {
        denominacion: '800ml',
        observacion: 'nueva',
        usuarioUpdatedId: 1,
      });
    });
  });

  describe('Validación de usuarioUpdatedId', () => {
    it('debería fallar si usuarioUpdatedId no está presente', async () => {
      await DtoValidatorHelper.expectFieldError(
        UpdatePresentacionDto,
        { denominacion: '1l' },
        'usuarioUpdatedId',
        'El usuarioUpdatedId es obligatorio.',
      );
    });

    it('debería fallar si usuarioUpdatedId no es entero', async () => {
      await DtoValidatorHelper.expectFieldError(
        UpdatePresentacionDto,
        { denominacion: '1l', usuarioUpdatedId: 'x' },
        'usuarioUpdatedId',
        'El usuarioUpdatedId debe ser un número entero.',
      );
    });
  });

  describe('Validación de denominación', () => {
    it('debería fallar si denominación contiene caracteres no permitidos', async () => {
      const errores = await DtoValidatorHelper.expectInvalidDto(
        UpdatePresentacionDto,
        { denominacion: 'pack@x6!!', usuarioUpdatedId: 1 },
      );
      expect(errores).toContain(
        'La denominación solo puede contener letras, números y espacios.',
      );
    });
  });
});