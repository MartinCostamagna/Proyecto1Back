import { SuperlineaMapper } from './superlinea.mapper';
import { Superlinea } from '../domain/entities/superlinea.entity';

function buildEntity(superlinea?: Partial<Superlinea>): Superlinea {
  return {
    id: 1,
    denominacion: 'ALIMENTOS',
    observacion: 'categoria de alimentos',
    sistema: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    usuarioCreatedId: 1,
    ...superlinea,
  } as Superlinea;
}

describe('SuperlineaMapper', () => {
  describe('toDto', () => {
    it('debería mapear los campos de la entidad', () => {
      const dto = SuperlineaMapper.toDto(buildEntity());

      expect(dto).toEqual({
        id: 1,
        denominacion: 'ALIMENTOS',
        observacion: 'categoria de alimentos',
        sistema: 0,
        deletedAt: null,
      });
    });

    it('debería mapear observacion vacía como cadena vacía', () => {
      const dto = SuperlineaMapper.toDto(buildEntity({ observacion: undefined }));

      expect(dto.observacion).toBe('');
    });

    it('debería formatear deletedAt como ISO cuando existe', () => {
      const deletedAt = new Date('2026-02-01');
      const dto = SuperlineaMapper.toDto(buildEntity({ deletedAt }));

      expect(dto.deletedAt).toBe(deletedAt.toISOString());
    });
  });
});