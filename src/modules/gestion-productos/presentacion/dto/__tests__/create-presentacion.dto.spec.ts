import { CreatePresentacionDto } from '../create-presentacion.dto';
import { DtoValidatorHelper } from '../../../../common/test-helpers/dto-validator.helper';

describe('CreatePresentacionDto', () => {
  describe('Validación exitosa', () => {
    it('debería ser válido con denominación y usuarioCreatedId', async () => {
      await DtoValidatorHelper.expectValidDto(CreatePresentacionDto, {
        denominacion: 'pack x6 de 500ml',
        usuarioCreatedId: 1,
      });
    });

    it('debería ser válido con observación opcional', async () => {
      await DtoValidatorHelper.expectValidDto(CreatePresentacionDto, {
        denominacion: '1l',
        observacion: 'Envase pet',
        usuarioCreatedId: 1,
      });
    });

    it('debería transformar la denominación a minúsculas', async () => {
      const dto = (
        await DtoValidatorHelper.validateDto(CreatePresentacionDto, {
          denominacion: 'PACK X6',
          usuarioCreatedId: 1,
        })
      );
      expect(dto).toHaveLength(0);
    });
  });

  describe('Validación de denominacion', () => {
    it('debería fallar si denominación está vacía', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreatePresentacionDto,
        { denominacion: '', usuarioCreatedId: 1 },
        'denominacion',
        'La denominación no puede estar vacía.',
      );
    });

    it('debería fallar si denominación supera 255 caracteres', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreatePresentacionDto,
        { denominacion: 'a'.repeat(256), usuarioCreatedId: 1 },
        'denominacion',
        'La denominación no puede superar 255 caracteres.',
      );
    });

    it('debería fallar con caracteres no permitidos', async () => {
      const errores = await DtoValidatorHelper.expectInvalidDto(
        CreatePresentacionDto,
        { denominacion: 'pack@x6!!', usuarioCreatedId: 1 },
      );
      expect(errores).toContain(
        'La denominación solo puede contener letras, números y espacios.',
      );
    });
  });

  describe('Validación de usuarioCreatedId', () => {
    it('debería fallar si usuarioCreatedId no está presente', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreatePresentacionDto,
        { denominacion: '1l' },
        'usuarioCreatedId',
        'El usuarioCreatedId es obligatorio.',
      );
    });

    it('debería fallar si usuarioCreatedId no es entero', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreatePresentacionDto,
        { denominacion: '1l', usuarioCreatedId: 1.5 },
        'usuarioCreatedId',
        'El usuarioCreatedId debe ser un número entero.',
      );
    });
  });
});