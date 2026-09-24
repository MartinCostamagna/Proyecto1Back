import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Transactional } from 'src/modules/common/decorators/transactional.decoratos';
import { DatabaseConnectionException } from 'src/modules/common/exceptions/database-connection.exception';
import { EntityNotFoundException } from 'src/modules/common/exceptions/entity-notFound-exceptions';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';
import { FechaUtils } from 'src/modules/common/utils/date/fecha-utils';
import { handleDatabaseError } from 'src/modules/common/query-builders/database-error.helper';
import { BasePersistenceAdapter } from 'src/modules/common/persistence/base-persistence.adapter';
import { QueryBuilderHelper } from 'src/modules/common/query-builders/query-builder-helpers';
import { CreateSuperlineaDto } from '../../dto/create-superlinea.dto';
import { UpdateSuperlineaDto } from '../../dto/update-superlinea.dto';
import { Superlinea } from '../../domain/entities/superlinea.entity';
import { ISuperlineaRepository } from '../../domain/interfaces/superlinea.repository.interface';

@Injectable()
export class SuperlineaPersistenceAdapter
  extends BasePersistenceAdapter<Superlinea>
  implements ISuperlineaRepository
{
  private readonly logger = new Logger(SuperlineaPersistenceAdapter.name);

  protected readonly ALIAS = 'superlinea';

  constructor(
    @InjectRepository(Superlinea)
    repository: Repository<Superlinea>,
    private readonly dataSource: DataSource,
    @Inject('UnitOfWork') public readonly uow: IUnitOfWork,
  ) {
    super(repository);
  }

  @Transactional()
  async create(data: CreateSuperlineaDto): Promise<Superlinea> {
    const repo = this.uow.getRepository(Superlinea);
    try {
      const nuevaEntity = repo.create({
        denominacion: data.denominacion,
        observacion: data.observacion,
        usuarioCreatedId: data.usuarioCreatedId,
      });
      return await repo.save(nuevaEntity);
    } catch (error) {
      this.logger.error(`Error al crear Superlinea: `, error);
      throw new DatabaseConnectionException(
        'Error al guardar en la base de datos.',
      );
    }
  }

  async findBy(
    denominacion: string,
    skip = 0,
    take = 10,
    incluirEliminados = false,
  ): Promise<{ data: Superlinea[]; total: number }> {
    try {
      const query = this.baseQuery(incluirEliminados);

      if (denominacion) {
        query.andWhere(
          `UPPER(${this.ALIAS}.denominacion) LIKE :denominacion`,
          {
            denominacion: `%${denominacion.toUpperCase()}%`,
          },
        );
      }

      QueryBuilderHelper.applyOrder(query, this.ALIAS, 'denominacion', 'ASC');

      QueryBuilderHelper.applyPagination(query, skip, take);

      const [data, total] = await query.getManyAndCount();

      return { data, total };
    } catch (error) {
      handleDatabaseError(this.logger, 'findBy', error);
    }
  }

  async findAllListado(): Promise<Superlinea[]> {
    try {
      const query = this.baseQuery();
      QueryBuilderHelper.applyOrder(query, this.ALIAS, 'denominacion', 'ASC');
      return await query.getMany();
    } catch (error) {
      handleDatabaseError(this.logger, 'findAllListado', error);
    }
  }

  async findAllFor(denominacion: string): Promise<Superlinea[]> {
    try {
      const query = this.baseQuery().andWhere(
        `UPPER(${this.ALIAS}.denominacion) LIKE :denominacion`,
        {
          denominacion: `%${denominacion.toUpperCase()}%`,
        },
      );
      QueryBuilderHelper.applyOrder(query, this.ALIAS, 'denominacion', 'ASC');
      return await query.getMany();
    } catch (error) {
      handleDatabaseError(this.logger, 'findAllFor', error);
    }
  }

  async findByIdConAuditoria(id: number): Promise<AuditoriaDto | null> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) return null;

      return {
        id: entity.id,
        detalle: `Superlinea ${entity.denominacion}`,
        createdAt: entity.createdAt
          ? FechaUtils.formatFechaHora(entity.createdAt)
          : '',
        updatedAt: entity.updatedAt
          ? FechaUtils.formatFechaHora(entity.updatedAt)
          : '',
        deletedAt: entity.deletedAt
          ? FechaUtils.formatFechaHora(entity.deletedAt)
          : '',
        usuarioCreated: '',
        usuarioUpdated: '',
        usuarioDeleted: '',
      };
    } catch (error) {
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async findOne(id: number): Promise<Superlinea | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!entity) {
        throw new EntityNotFoundException('Entidad no encontrada.');
      }
      return entity;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  @Transactional()
  async update(id: number, data: UpdateSuperlineaDto): Promise<Superlinea> {
    const repo = this.uow.getRepository(Superlinea);
    try {
      const entity = await repo.findOne({ where: { id } });
      if (!entity) {
        throw new EntityNotFoundException('Entidad no encontrada.');
      }

      if (data.denominacion !== undefined) entity.denominacion = data.denominacion;
      if (data.observacion !== undefined) entity.observacion = data.observacion;
      if (data.usuarioUpdatedId !== undefined)
        entity.usuarioUpdatedId = data.usuarioUpdatedId;

      return await repo.save(entity);
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error al actualizar Superlinea: `);
      throw new DatabaseConnectionException(
        'Error al guardar en la base de datos.',
      );
    }
  }

  async findByDenominacionWith(denominacion: string): Promise<Superlinea | null> {
    try {
      const normalizada = denominacion.trim().toUpperCase();

      const entity = await this.repository
        .createQueryBuilder('superlinea')
        .withDeleted()
        .where('UPPER(superlinea.denominacion) = :denominacion', {
          denominacion: normalizada,
        })
        .getOne();

      if (!entity) {
        this.logger.log(
          `No encontrada superlinea (ni activa ni eliminada): ${normalizada}`,
        );
        return null;
      }

      return entity;
    } catch (error) {
      handleDatabaseError(this.logger, 'findByDenominacionWith', error);
    }
  }

  @Transactional()
  async remove(data: Superlinea, usuario: Usuario): Promise<Superlinea> {
    const repo = this.uow.getRepository(Superlinea);
    try {
      data.deletedAt = new Date();
      data.usuarioDeletedId = usuario.id;
      return await repo.save(data);
    } catch (error) {
      this.logger.error(`Error al eliminar Superlinea: `);
      throw new DatabaseConnectionException(
        'Error al guardar en la base de datos.',
      );
    }
  }
}