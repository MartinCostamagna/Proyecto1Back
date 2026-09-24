import { CreateSuperlineaDto } from './create-superlinea.dto';
import { UpdateSuperlineaDto } from './update-superlinea.dto';
import { DtoValidatorHelper } from '../../../common/test-helpers/dto-validator.helper';

describe('CreateSuperlineaDto', () => {
  describe('Validación exitosa', () => {
    it('debería ser válido con denominación y usuarioCreatedId', async () => {
      await DtoValidatorHelper.expectValidDto(CreateSuperlineaDto, {
        denominacion: 'ALIMENTOS',
        usuarioCreatedId: 1,
      });
    });

    it('debería ser válido con observación opcional', async () => {
      await DtoValidatorHelper.expectValidDto(CreateSuperlineaDto, {
        denominacion: 'Bebidas',
        observacion: 'Todo tipo de bebidas',
        usuarioCreatedId: 1,
      });
    });

    it('debería ser válido con deletedAt opcional', async () => {
      await DtoValidatorHelper.expectValidDto(CreateSuperlineaDto, {
        denominacion: 'Limpieza',
        usuarioCreatedId: 1,
        deletedAt: null,
      });
    });
  });

  describe('Validación de denominacion', () => {
    it('debería fallar si denominación está vacía', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreateSuperlineaDto,
        { denominacion: '', usuarioCreatedId: 1 },
        'denominacion',
        'La denominación no puede estar vacía.',
      );
    });

    it('debería superar 255 caracteres', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreateSuperlineaDto,
        { denominacion: 'a'.repeat(256), usuarioCreatedId: 1 },
        'denominacion',
        'La denominación no puede superar 255 caracteres.',
      );
    });

    it('debería fallar con caracteres no permitidos', async () => {
      const errores = await DtoValidatorHelper.expectInvalidDto(
        CreateSuperlineaDto,
        { denominacion: 'ALIMENTOS@#', usuarioCreatedId: 1 },
      );
      expect(errores).toContain(
        'La denominación solo puede contener letras, números y espacios.',
      );
    });
  });

  describe('Validación de usuarioCreatedId', () => {
    it('debería fallar si usuarioCreatedId no está presente', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreateSuperlineaDto,
        { denominacion: 'ALIMENTOS' },
        'usuarioCreatedId',
        'El usuarioCreatedId es obligatorio.',
      );
    });

    it('debería fallar si usuarioCreatedId no es entero', async () => {
      await DtoValidatorHelper.expectFieldError(
        CreateSuperlineaDto,
        { denominacion: 'ALIMENTOS', usuarioCreatedId: 1.5 },
        'usuarioCreatedId',
        'El usuarioCreatedId debe ser un número entero.',
      );
    });
  });
});

describe('UpdateSuperlineaDto', () => {
  it('debería ser válido con usuarioUpdatedId', async () => {
    await DtoValidatorHelper.expectValidDto(UpdateSuperlineaDto, {
      denominacion: 'Alimentos',
      usuarioUpdatedId: 2,
      updatedAt: new Date(),
    });
  });

  it('debería fallar si usuarioUpdatedId no está presente', async () => {
    await DtoValidatorHelper.expectFieldError(
      UpdateSuperlineaDto,
      { denominacion: 'Alimentos', updatedAt: new Date() },
      'usuarioUpdatedId',
      'El usuarioUpdatedId es obligatorio.',
    );
  });

  it('debería fallar si usuarioUpdatedId no es entero', async () => {
    await DtoValidatorHelper.expectFieldError(
      UpdateSuperlineaDto,
      { denominacion: 'Alimentos', usuarioUpdatedId: 2.5 },
      'usuarioUpdatedId',
      'El usuarioUpdatedId debe ser un número entero.',
    );
  });
});