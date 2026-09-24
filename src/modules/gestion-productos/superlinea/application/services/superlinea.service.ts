import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ensureNotSistemaEntity } from 'src/modules/common/utils/atrituto-sistema';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { PaginacionUtils } from 'src/modules/common/utils/pagination/paginacion-utils';
import { MessageFrontUtils } from 'src/modules/common/utils/message/message-front.util';
import { ISuperlineaRepository } from '../../domain/interfaces/superlinea.repository.interface';
import { UpdateSuperlineaDto } from '../../dto/update-superlinea.dto';
import { CreateSuperlineaDto } from '../../dto/create-superlinea.dto';
import { SuperlineaDto } from '../../dto/superlinea.dto';
import { SuperlineaMapper } from '../../mappers/superlinea.mapper';
import { PoliticaEliminacionSuperlinea } from '../../domain/services/politica-eliminacion-superlinea.service';
import { Superlinea } from '../../domain/entities/superlinea.entity';

@Injectable()
export class SuperlineaService {
  private readonly logger = new Logger(SuperlineaService.name);
  constructor(
    @Inject('ISuperlineaRepository')
    private readonly repository: ISuperlineaRepository,
    private readonly usuarioService: UsuarioService,
    private readonly validacionesService: PoliticaEliminacionSuperlinea,
  ) {}

  private readonly ENTITY_NAME = 'Superlinea';

  async create(dto: CreateSuperlineaDto) {
    this.logger.log(
      `Creando una nueva ${this.ENTITY_NAME} con denominación: ${dto.denominacion}`,
    );
    await this.checkDenominacionExists(dto.denominacion, 0);
    const entity = await this.repository.create(dto);

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'creada',
    );
  }

  async update(id: number, dto: UpdateSuperlineaDto) {
    this.logger.log(`Actualizando  ${this.ENTITY_NAME} con ID: ${id}`);
    const superlinea = await this.findEntityById(id);
    ensureNotSistemaEntity(superlinea, this.ENTITY_NAME);

    if (dto.denominacion)
      await this.checkDenominacionExists(dto.denominacion, id);

    const entity = await this.repository.update(id, dto);

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'editada',
    );
  }

  async findAllFor(
    denominacion: string,
  ): Promise<{ data: SuperlineaDto[]; total: number }> {
    const result = await this.repository.findAllFor(denominacion);
    const data: SuperlineaDto[] = result.map((superlinea) =>
      SuperlineaMapper.toDto(superlinea),
    );
    return {
      data,
      total: 1,
    };
  }

  async findAllListado(): Promise<Superlinea[]> {
    return this.repository.findAllListado();
  }

  async findBy(
    denominacion: string,
    skip = 0,
    take = 10,
    incluirEliminados = false,
  ): Promise<{ data: SuperlineaDto[]; total: number }> {
    this.logger.log(
      `Buscando ${this.ENTITY_NAME}s: ${denominacion} skip=${skip}, take=${take}`,
    );
    const result = await this.repository.findBy(
      denominacion,
      skip,
      take,
      incluirEliminados,
    );
    const data: SuperlineaDto[] = result.data.map((superlinea) =>
      SuperlineaMapper.toDto(superlinea),
    );
    return {
      data,
      total: PaginacionUtils.totalItems(result.total),
    };
  }

  async findDtoById(id: number) {
    const entity = await this.findEntityById(id);
    return SuperlineaMapper.toDto(entity);
  }

  async findEntityById(id: number) {
    const entity = await this.repository.findOne(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return entity;
  }

  async remove(id: number, usuarioId: number) {
    const entity = await this.repository.findOne(id);

    if (!entity) {
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    }

    ensureNotSistemaEntity(entity, this.ENTITY_NAME);

    const tieneLineasActivas =
      await this.validacionesService.tieneLineasActivasParaSuperlinea(id);

    if (tieneLineasActivas) {
      throw new ConflictException(
        'No se puede eliminar la superlínea porque está asociada a líneas activas.',
      );
    }

    const usuario = await this.usuarioService.findOne(usuarioId);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }
    await this.repository.remove(entity, usuario);

    return MessageFrontUtils.createSimple(
      this.ENTITY_NAME,
      entity.denominacion,
      'eliminada',
    );
  }

  private async checkDenominacionExists(denominacion: string, id: number) {
    const exists = await this.repository.findByDenominacionWith(denominacion);
    if (exists && exists.id !== id) {
      this.logger.warn(
        `${this.ENTITY_NAME} Conflicto: denominación ya está en uso: ${denominacion}`,
      );
      throw new ConflictException('Denominación ya en uso o esta eliminada.');
    }
  }

  async findByIdConAuditoria(id: number) {
    const entity = await this.repository.findByIdConAuditoria(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return entity;
  }
}