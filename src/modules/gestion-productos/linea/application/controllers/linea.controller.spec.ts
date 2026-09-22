import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LineaController } from './linea.controller';
import { LineaService } from '../services/linea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { PoliticaEliminacionLinea } from '../../domain/services/politica-eliminacion-linea.service';

describe('LineaController', () => {
  let controller: LineaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineaController],
      providers: [
        LineaService,
        { provide: 'ILineaRepository', useValue: {} },
        { provide: PoliticaEliminacionLinea, useValue: {} },
        { provide: UsuarioService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'IUsuarioRepository', useValue: {} },
      ],
    }).compile();

    controller = module.get<LineaController>(LineaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});