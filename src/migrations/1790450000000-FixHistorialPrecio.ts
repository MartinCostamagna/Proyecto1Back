import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixHistorialPrecio1790450000000 implements MigrationInterface {
  name = 'FixHistorialPrecio1790450000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CR-007: la columna `productoId` es una duplicacion huerfana en camelCase
    // que la entidad nunca escribe. Al ser NOT NULL sin default hacia fallar
    // todos los INSERT del historial con STRICT_TRANS_TABLES.
    await queryRunner.query(`ALTER TABLE \`historial_precio\` DROP COLUMN \`productoId\``);

    // La FK real (`producto_id`) pasa a ser obligatoria.
    await queryRunner.query(`ALTER TABLE \`historial_precio\` MODIFY \`producto_id\` int NOT NULL`);

    // Tipos alineados con lo que declara la entidad HistorialPrecio.
    await queryRunner.query(
      `ALTER TABLE \`historial_precio\` MODIFY \`motivo\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historial_precio\` MODIFY \`fecha\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`historial_precio\` MODIFY \`fecha\` timestamp NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historial_precio\` MODIFY \`motivo\` text`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historial_precio\` MODIFY \`producto_id\` int NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`historial_precio\` ADD \`productoId\` int NOT NULL DEFAULT '0'`);
  }
}
