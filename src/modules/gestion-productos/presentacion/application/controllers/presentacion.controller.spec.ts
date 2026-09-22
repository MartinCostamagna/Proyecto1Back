import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PresentacionController } from './presentacion.controller';
import { PresentacionService } from '../services/presentacion.service';
import { CreatePresentacionDto } from '../../dto/create-presentacion.dto';
import { UpdatePresentacionDto } from '../../dto/update-presentacion.dto';

describe('PresentacionController', () => {
  let controller: PresentacionController;
  let service: jest.Mocked<PresentacionService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAllFor: jest.fn(),
      findBy: jest.fn(),
      findDtoById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByIdConAuditoria: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresentacionController],
      providers: [
        { provide: PresentacionService, useValue: service },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'IUsuarioRepository', useValue: {} },
      ],
    }).compile();

    controller = module.get<PresentacionController>(PresentacionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create debería delegar en el servicio', async () => {
    const dto: CreatePresentacionDto = {
      denominacion: 'pack x6',
      usuarioCreatedId: 1,
    };
    service.create.mockResolvedValue({ mensaje: 'ok' } as any);

    await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAllPresentacionesFor debería delegar en el servicio', async () => {
    service.findAllFor.mockResolvedValue({ data: [], total: 1 });

    const resultado = await controller.findAllPresentacionesFor({
      denominacion: '500ml',
    } as any);

    expect(service.findAllFor).toHaveBeenCalledWith('500ml');
    expect(resultado).toEqual({ data: [], total: 1 });
  });

  it('findAllPresentacionesFor debería usar cadena vacía si denominación no viene', async () => {
    service.findAllFor.mockResolvedValue({ data: [], total: 1 });

    await controller.findAllPresentacionesFor({} as any);

    expect(service.findAllFor).toHaveBeenCalledWith('');
  });

  it('findByDenominacionFiltered debería delegar en el servicio', async () => {
    service.findBy.mockResolvedValue({ data: [], total: 0 });

    await controller.findByDenominacionFiltered({
      denominacion: '1',
      skip: 0,
      take: 10,
      incluirEliminados: false,
    } as any);

    expect(service.findBy).toHaveBeenCalledWith('1', 0, 10, false);
  });

  it('findByDenominacionFiltered debería usar cadena vacía si denominación no viene', async () => {
    service.findBy.mockResolvedValue({ data: [], total: 0 });

    await controller.findByDenominacionFiltered({} as any);

    expect(service.findBy).toHaveBeenCalledWith('', undefined, undefined, undefined);
  });

  it('findOne debería delegar en el servicio', async () => {
    service.findDtoById.mockResolvedValue({} as any);

    await controller.findOne(1);

    expect(service.findDtoById).toHaveBeenCalledWith(1);
  });

  it('update debería delegar en el servicio', async () => {
    const dto: UpdatePresentacionDto = { usuarioUpdatedId: 1, updatedAt: new Date() };
    service.update.mockResolvedValue({ mensaje: 'ok' } as any);

    await controller.update(1, dto);

    expect(service.update).toHaveBeenCalledWith(1, dto);
  });

  it('remove debería delegar en el servicio con usuarioId', async () => {
    service.remove.mockResolvedValue({ mensaje: 'ok' } as any);

    await controller.remove(1, 3);

    expect(service.remove).toHaveBeenCalledWith(1, 3);
  });

  it('findByIdConAuditoria debería delegar en el servicio', async () => {
    service.findByIdConAuditoria.mockResolvedValue({} as any);

    await controller.findByIdConAuditoria(1);

    expect(service.findByIdConAuditoria).toHaveBeenCalledWith(1);
  });
});