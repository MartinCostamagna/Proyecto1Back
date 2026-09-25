import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Producto } from './producto.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { MonetarioColumn } from 'src/modules/common/decorators/monetario-column.decorator';

@Entity('historial_precio')
export class HistorialPrecio {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @MonetarioColumn()
  precioAnterior: number;

  @ApiProperty()
  @MonetarioColumn()
  precioNuevo: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @ApiProperty()
  @CreateDateColumn()
  fecha: Date;

  @Index()
  @ManyToOne(() => Producto, (producto) => producto.historialPrecios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int', default: 0 })
  sistema: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_created_id' })
  usuarioCreated: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_updated_id' })
  usuarioUpdated: Usuario;
}
