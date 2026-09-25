import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationWithDenominacionDto } from 'src/modules/common/dto/busquedas/pagination-with-denominacion.dto';

export class SearchHistorialPrecioDto extends PaginationWithDenominacionDto {
  @ApiPropertyOptional({ example: 12, description: 'Filtra el historial de un producto puntual' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El productoId debe ser un número entero.' })
  productoId?: number;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Desde (inclusive), formato YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({}, { message: 'La fechaDesde debe tener formato YYYY-MM-DD.' })
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Hasta (inclusive), formato YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({}, { message: 'La fechaHasta debe tener formato YYYY-MM-DD.' })
  fechaHasta?: string;

  @ApiPropertyOptional({ example: 'proveedor', description: 'Filtra por texto del motivo' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  motivo?: string;

  @ApiPropertyOptional({ example: 0, description: 'Cantidad máxima de elementos a retornar' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El take debe ser un número entero.' })
  @Min(1, { message: 'take debe ser un número entero mayor que 0' })
  take: number = 10;

  @ApiPropertyOptional({ example: 0, description: 'Cantidad de elementos a omitir' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El skip debe ser un número entero.' })
  @Min(0, { message: 'skip debe ser un número entero positivo o 0' })
  skip: number = 0;
}
