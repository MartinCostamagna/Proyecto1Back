import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SuperlineaController } from './application/controllers/superlinea.controller';
import { Superlinea } from './domain/entities/superlinea.entity';
import { SuperlineaPersistenceAdapter } from './infraestructure/repositories/superlinea.persistence-adapter';
import { SuperlineaRepository } from './infraestructure/repositories/superlinea.repository';
import { SuperlineaService } from './application/services/superlinea.service';
import { PoliticaEliminacionSuperlinea } from './domain/services/politica-eliminacion-superlinea.service';
import { TypeOrmUnitOfWork } from 'src/modules/common/unit-of-work/type-orm-unit-of-works1';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { UsuarioModule } from 'src/modules/gestion-usuario/usuario/usuario.module';
import { LineaModule } from '../linea/linea.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Superlinea]),
    UsuarioModule,
    forwardRef(() => LineaModule),
  ],
  controllers: [SuperlineaController],
  providers: [
    SuperlineaService,
    SuperlineaPersistenceAdapter,
    PoliticaEliminacionSuperlinea,
    {
      provide: 'ISuperlineaRepository',
      useClass: SuperlineaRepository,
    },
    {
      provide: 'UnitOfWork',
      useFactory: (dataSource: DataSource): IUnitOfWork => {
        return new TypeOrmUnitOfWork(dataSource);
      },
      inject: [DataSource],
    },
  ],
  exports: [TypeOrmModule, SuperlineaService, 'ISuperlineaRepository'],
})
export class SuperlineaModule {}