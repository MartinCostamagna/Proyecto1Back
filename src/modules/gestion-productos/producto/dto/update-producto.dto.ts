import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './create-producto.dto';
import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  // Opcional: si viene vacía o ausente, el servicio la autogenera
  // a partir de Marca + Línea + Presentación (CR-005).
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'La denominación debe ser una cadena de texto.' }) // Valida que sea string
  @MaxLength(255, { message: 'La denominación no puede superar los 255 caracteres.' })
  @Matches(/^[\w áéíóúÁÉÍÓÚñÑ.\-/%]*$/, {
    message: 'La denominación contiene caracteres inválidos',
  })
  denominacion?: string;

  @IsNotEmpty({ message: 'El usuarioUpdatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioUpdatedId debe ser un número entero.' })
  usuarioUpdatedId: number;

  // CR-007: Motivo del cambio de precio (opcional en el DTO, el servicio valida si es requerido)
  @IsOptional()
  @IsString({ message: 'El motivo debe ser una cadena de texto.' })
  @MaxLength(255, { message: 'El motivo no puede superar los 255 caracteres.' })
  motivo?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El costo debe ser un número.' })
  costo?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El porcentaje debe ser un número.' })
  porcentaje?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número.' })
  precio?: number;

  updatedAt: Date;
  
}