import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';

export class CreateProductoDto {
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

  @IsOptional()
  @IsString()
  observacion?: string;

  // si no tiene poner vacio
  @IsOptional()
  @IsString()
  codigoProveedor?: string;

  @IsOptional()
  @IsString()
  codigoBarra?: string;

  @IsOptional()
  @IsString()
  codigoReferencia?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsBoolean()
  utilizaStockMinimo: boolean;

  @IsOptional()
  @IsInt({message: 'El stock minimo debe ser un numero entero.'})
  @Min(0,{message: 'El stock minimo no puede ser negativo.'})
  stockMinimo?: number;

  @IsOptional()
  @IsInt({message: 'El stock debe ser un numero entero.'})
  @Min(0, { message: 'El stock actual no puede ser negativo.' })  
  stock?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  costoEnDolar?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  destacado?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  envioGratis?: boolean;

  @IsOptional()
  @IsNumber({}, {message: 'El costo debe ser un valor numerico.'})
  @Min(0, { message: 'El costo no puede ser un valor negativo.' })
  costo?: number;

  @IsBoolean()
  utilizaPack: boolean;

  @IsOptional()
  @IsInt({message: 'La cantidad por pack debe ser un numero entero.'})
  @Min(1, { message: 'La cantidad por pack no puede ser menor a 1.' })
  cantidadPorPack?: number;

  @IsOptional()
  @IsNumber({},{message: 'El costo en dólares debe ser un número.'})
  @Min(0, { message: 'El costo en dólares no puede ser negativo.' })
  costoDolar?: number;

  @IsNotEmpty({ message: 'La linea es obligatoria.' })
  @IsInt({ message: 'La linea  debe ser un número entero.' })
  lineaId: number;


  @IsNotEmpty({ message: 'La marca es obligatoria.' })
  @IsInt({ message: 'La marca  debe ser un número entero.' })
  marcaId: number;


  @IsOptional()
  @IsInt({ message: 'La presentacion debe ser un número entero.' })
  presentacionId?: number;


  @IsOptional()
  @IsNumber({},{message: 'El porcentaje debe ser un valor numérico.'})
  @Min(0, { message: 'El porcentaje de margen no puede ser negativo.' })
  porcentaje?: number;

  @IsOptional()
  @IsNumber({},{message: 'El precio debe ser un valor numérico.'})
  @Min(0, { message: 'El precio no puede ser negativo.' })
  precio: number;

  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto.' })
  motivo?: string;

  createdAt?: Date;

  @IsEnum(AlicuotaIva, {
    message:
      'tipo debe ser ALICUOTA_0  ALICUOTA_105, ALICUOTA_21, ALICUOTA_27,',
  })
  @Transform(({ value }) => {
    // Si el valor es un string, lo convierte al valor numérico del enum
    if (typeof value === 'string') {
      return AlicuotaIva[value.toUpperCase() as keyof typeof AlicuotaIva];
    }
    return value;
  })
  alicuotaIva: AlicuotaIva;

  @IsNotEmpty({ message: 'El usuarioCreatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioCreatedId debe ser un número entero.' })
  usuarioCreatedId: number;


}
