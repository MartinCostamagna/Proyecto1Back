import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

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
        description: 'ID de la línea sobre la cual aplicar el ajuste. Si no se envía, se aplica a todos los productos.',
    })
    @IsOptional()
    @IsNumber()
    lineaId?: number;

    @ApiProperty({
        example: 7,
        description: 'ID del usuario que ejecuta la actualización masiva.',
    })
    @IsNumber()
    @Min(1)
    usuarioId: number;
}
