import { Logger } from '@nestjs/common';
import { Superlinea } from '../domain/entities/superlinea.entity';
import { SuperlineaDto } from '../dto/superlinea.dto';

export class SuperlineaMapper {
  private static readonly logger = new Logger(SuperlineaMapper.name);

  static toDto(entity: Superlinea): SuperlineaDto {
    return {
      id: entity.id,
      denominacion: entity.denominacion,
      observacion: entity.observacion ?? '',
      sistema: entity.sistema,
      deletedAt: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    };
  }
}