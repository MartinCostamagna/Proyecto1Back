import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperLinea1790206834114 implements MigrationInterface {
  name = 'AddSuperLinea1790206834114'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== 1) TABLA super_linea ==========
    await queryRunner.query(
      `CREATE TABLE \`super_linea\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`denominacion\` varchar(255) NOT NULL,
        \`observacion\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`usuarioCreatedId\` int NULL,
        \`usuarioDeletedId\` int NULL,
        \`usuarioUpdatedId\` int NULL,
        \`sistema\` int NOT NULL DEFAULT '0',
        UNIQUE INDEX \`IDX_9e4184946b687e188250ddefea\` (\`denominacion\`, \`deletedAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );

    // ========== 2) SEED inicial de superlíneas ==========
    await queryRunner.query(
      `INSERT INTO \`super_linea\` (\`denominacion\`, \`observacion\`, \`usuarioCreatedId\`, \`sistema\`) VALUES
        ('GENERAL', NULL, 1, 0),
        ('ALIMENTOS', NULL, 1, 0),
        ('BEBIDAS', NULL, 1, 0),
        ('LIMPIEZA', NULL, 1, 0),
        ('HIGIENE', NULL, 1, 0)`,
    );

    // ========== 3) Columna FK (nullable para poder backfill) ==========
    await queryRunner.query(`ALTER TABLE \`linea\` ADD \`super_linea_id\` int NULL`);

    // ========== 4) Backfill: asignar todas las líneas existentes a 'GENERAL' ==========
    await queryRunner.query(
      `UPDATE \`linea\` \`l\`
        JOIN \`super_linea\` \`s\` ON \`s\`.\`denominacion\` = 'GENERAL' AND \`s\`.\`deletedAt\` IS NULL
        SET \`l\`.\`super_linea_id\` = \`s\`.\`id\``,
    );

    // ========== 5) Obligatoria: NOT NULL ==========
    await queryRunner.query(`ALTER TABLE \`linea\` MODIFY \`super_linea_id\` int NOT NULL`);

    // ========== 6) FK ==========
    await queryRunner.query(
      `ALTER TABLE \`linea\` ADD CONSTRAINT \`FK_c92ad68fd9cef3017f0ba7d1155\`
        FOREIGN KEY (\`super_linea_id\`) REFERENCES \`super_linea\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`linea\` DROP FOREIGN KEY \`FK_c92ad68fd9cef3017f0ba7d1155\``);
    await queryRunner.query(`ALTER TABLE \`linea\` DROP COLUMN \`super_linea_id\``);
    await queryRunner.query(`DROP TABLE \`super_linea\``);
  }
}
