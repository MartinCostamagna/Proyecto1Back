import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreatePresentacionDto } from './create-presentacion.dto';

export class UpdatePresentacionDto extends PartialType(CreatePresentacionDto) {
  updatedAt: Date;

  @IsNotEmpty({ message: 'El usuarioUpdatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioUpdatedId debe ser un número entero.' })
  usuarioUpdatedId: number;
}