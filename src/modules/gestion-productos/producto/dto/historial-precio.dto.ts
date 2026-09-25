import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class HistorialPrecioDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  id: number;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  productoId: number;

  @ApiProperty({ example: 'COCA COLA GASEOSA 500ML' })
  @IsString()
  productoDenominacion: string;

  @ApiProperty({ example: 'BEBIDAS' })
  @IsString()
  productoLinea: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  precioAnterior: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  precioNuevo: number;

  @ApiProperty({ example: 50, description: 'Diferencia absoluta (precioNuevo - precioAnterior)' })
  @IsNumber()
  variacion: number;

  @ApiProperty({
    example: 50,
    description: 'Variación porcentual respecto del precio anterior',
  })
  @IsNumber()
  variacionPorcentaje: number;

  @ApiProperty({ example: '2026-09-25T15:30:00.000Z' })
  fecha: string;

  @ApiProperty({ example: 'Aumento de proveedor' })
  @IsNotEmpty()
  @IsString()
  motivo: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  usuarioDenominacion: string;
}
