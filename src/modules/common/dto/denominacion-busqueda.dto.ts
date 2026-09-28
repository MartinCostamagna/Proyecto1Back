import { IsOptional, IsString } from 'class-validator';

export class DenominacionBusquedaDto {

  // El `?` de TypeScript no genera metadata para class-validator: sin
  // `@IsOptional()` el decorador se evalúa también cuando el parámetro no
  // viene y la petición se rechaza con 400. Los selectores de catálogo piden
  // el listado completo omitiendo el filtro, así que la ausencia es válida.
  @IsOptional()
  @IsString()
  denominacion?: string;


}