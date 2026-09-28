import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export enum TipoActualizacionPrecio {
    PORCENTAJE = 'PORCENTAJE',
    MONTO = 'MONTO',
}

export class ActualizarPreciosMasivosDto {
    @ApiProperty({
        enum: TipoActualizacionPrecio,
        example: TipoActualizacionPrecio.PORCENTAJE,
        description: 'Tipo de ajuste: porcentaje o monto fijo.',
    })
    @IsEnum(TipoActualizacionPrecio)
    tipo: TipoActualizacionPrecio;

    @ApiProperty({
        example: 10,
        description: 'Valor del ajuste. Para porcentaje, 10 representa +10%. Para monto, +10 o -10 representa incremento o descuento.',
    })
    @IsNumber()
    valor: number;

    @ApiPropertyOptional({
        example: 5,
        description: 'ID de la línea sobre la cual aplicar el ajuste. Se puede combinar con marcaId y superlineaId; los filtros enviados se aplican en conjunto.',
    })
    @IsOptional()
    @IsNumber()
    lineaId?: number;

    @ApiPropertyOptional({
        example: 3,
        description: 'ID de la marca sobre la cual aplicar el ajuste. Se puede combinar con lineaId y superlineaId.',
    })
    @IsOptional()
    @IsNumber()
    marcaId?: number;

    @ApiPropertyOptional({
        example: 2,
        description: 'ID de la superlínea sobre la cual aplicar el ajuste. Se alcanza a través de la línea de cada producto.',
    })
    @IsOptional()
    @IsNumber()
    superlineaId?: number;

    @ApiProperty({
        example: 7,
        description: 'ID del usuario que ejecuta la actualización masiva.',
    })
    @IsNumber()
    @Min(1)
    usuarioId: number;

    @ApiProperty({
        example: 'Aumento general por Actualización de listas de precios',
        description: 'CR-007: motivo obligatorio del cambio de precio. Queda registrado en el historial de cada producto afectado.',
    })
    @IsString()
    @IsNotEmpty({ message: 'El motivo del cambio de precio es obligatorio.' })
    @Matches(/\S/, {
        message: 'El motivo del cambio de precio no puede tener solo espacios.',
    })
    @MaxLength(255)
    motivo: string;
}
