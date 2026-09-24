import { Injectable, Logger } from '@nestjs/common';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';
import { CreateSuperlineaDto } from '../../dto/create-superlinea.dto';
import { UpdateSuperlineaDto } from '../../dto/update-superlinea.dto';
import { Superlinea } from '../../domain/entities/superlinea.entity';
import { ISuperlineaRepository } from '../../domain/interfaces/superlinea.repository.interface';
import { SuperlineaPersistenceAdapter } from './superlinea.persistence-adapter';

@Injectable()
export class SuperlineaRepository implements ISuperlineaRepository {
  private readonly logger = new Logger(SuperlineaRepository.name);

  constructor(
    private readonly persistenceService: SuperlineaPersistenceAdapter,
  ) {}

  async create(data: CreateSuperlineaDto): Promise<Superlinea> {
    this.logger.log(`Creando una nueva Superlinea`);
    return this.persistenceService.create(data);
  }

  async findBy(
    denominacion: string,
    skip: number,
    take: number,
    incluirEliminados: boolean,
  ): Promise<{ data: Superlinea[]; total: number }> {
    return this.persistenceService.findBy(
      denominacion,
      skip,
      take,
      incluirEliminados,
    );
  }

  async findAllListado(): Promise<Superlinea[]> {
    return this.persistenceService.findAllListado();
  }

  async findAllFor(denominacion: string): Promise<Superlinea[]> {
    return this.persistenceService.findAllFor(denominacion);
  }

  async findByIdConAuditoria(id: number): Promise<AuditoriaDto | null> {
    return this.persistenceService.findByIdConAuditoria(id);
  }

  async findOne(id: number): Promise<Superlinea | null> {
    return this.persistenceService.findOne(id);
  }

  async findByDenominacionWith(denominacion: string): Promise<Superlinea | null> {
    return this.persistenceService.findByDenominacionWith(denominacion);
  }

  async update(
    id: number,
    data: UpdateSuperlineaDto,
  ): Promise<Superlinea> {
    return this.persistenceService.update(id, data);
  }

  async remove(data: Superlinea, usuario: Usuario): Promise<Superlinea> {
    return this.persistenceService.remove(data, usuario);
  }
}