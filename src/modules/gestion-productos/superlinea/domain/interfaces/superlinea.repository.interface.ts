import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';
import { CreateSuperlineaDto } from '../../dto/create-superlinea.dto';
import { UpdateSuperlineaDto } from '../../dto/update-superlinea.dto';
import { Superlinea } from '../entities/superlinea.entity';

export interface ISuperlineaRepository {
  create(data: CreateSuperlineaDto): Promise<Superlinea>;

  findBy(
    denominacion: string,
    skip: number,
    take: number,
    incluirEliminados: boolean,
  ): Promise<{ data: Superlinea[]; total: number }>;

  findAllListado(): Promise<Superlinea[]>;

  findAllFor(denominacion: string): Promise<Superlinea[]>;

  findByIdConAuditoria(id: number): Promise<AuditoriaDto | null>;

  findOne(id: number): Promise<Superlinea | null>;

  findByDenominacionWith(denominacion: string): Promise<Superlinea | null>;

  update(id: number, data: UpdateSuperlineaDto): Promise<Superlinea>;

  remove(data: Superlinea, usuario: Usuario): Promise<Superlinea>;
}