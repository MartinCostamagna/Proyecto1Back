import { Inject, Injectable } from '@nestjs/common';
import { ILineaRepository } from '../../../linea/domain/interfaces/linea.repository.interface';

@Injectable()
export class PoliticaEliminacionSuperlinea {
  constructor(
    @Inject('ILineaRepository')
    private readonly lineaRepository: ILineaRepository,
  ) {}

  async tieneLineasActivasParaSuperlinea(
    superlineaId: number,
  ): Promise<boolean> {
    return this.lineaRepository.existsLineasActivasBySuperlinea(superlineaId);
  }
}