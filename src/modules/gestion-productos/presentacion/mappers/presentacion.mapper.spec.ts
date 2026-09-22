import { PresentacionMapper } from './presentacion.mapper';
import { Presentacion } from '../domain/entities/presentacion.entity';

function buildEntity(presentacion?: Partial<Presentacion>): Presentacion {
  return {
    id: 1,
    denominacion: 'pack x6 de 500ml',
    observacion: 'caja de 6',
    sistema: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    usuarioCreatedId: 1,
    ...presentacion,
  } as Presentacion;
}

describe('PresentacionMapper', () => {
  describe('toDto', () => {
    it('debería mapear los campos de la entidad', () => {
      const dto = PresentacionMapper.toDto(buildEntity());

      expect(dto).toEqual({
        id: 1,
        denominacion: 'pack x6 de 500ml',
        observacion: 'caja de 6',
        sistema: 0,
        deletedAt: null,
      });
    });

    it('debería mapear observacion vacía como cadena vacía', () => {
      const dto = PresentacionMapper.toDto(buildEntity({ observacion: undefined }));

      expect(dto.observacion).toBe('');
    });

    it('debería formatear deletedAt como ISO cuando existe', () => {
      const deletedAt = new Date('2026-02-01');
      const dto = PresentacionMapper.toDto(buildEntity({ deletedAt }));

      expect(dto.deletedAt).toBe(deletedAt.toISOString());
    });
  });
});