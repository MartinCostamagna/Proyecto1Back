import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Producto } from './producto.entity';

@Entity('historial_precio')
export class HistorialPrecio {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column('decimal', { precision: 10, scale: 2 })
  precioAnterior: number;

  @ApiProperty()
  @Column('decimal', { precision: 10, scale: 2 })
  precioNuevo: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @ApiProperty()
  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Producto, (producto) => producto.historialPrecios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;
}