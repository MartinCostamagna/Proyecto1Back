import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class PresentacionDto {
  @ApiProperty({ example: 1, description: 'ID de la presentación' })
  @Type(() => Number)
  @IsInt()
  id: number;

  @ApiProperty({ example: 'pack x6 de 500ml' })
  @IsString()
  denominacion: string;

  @ApiProperty({ example: '', description: 'Observaciones varias sobre la presentación' })
  @IsString()
  observacion: string;

  @ApiProperty({ example: 1, description: 'de sistema no se puede editar ni eliminar' })
  @Type(() => Number)
  @IsInt()
  sistema: number;

  @ApiProperty({ example: null, description: 'Fecha de eliminación (null si está activa)', nullable: true })
  @IsOptional()
  deletedAt: string | null;
}