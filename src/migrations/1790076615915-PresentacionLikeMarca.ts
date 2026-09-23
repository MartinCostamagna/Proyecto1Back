import { MigrationInterface, QueryRunner } from "typeorm";

export class PresentacionLikeMarca1790076615915 implements MigrationInterface {
    name = 'PresentacionLikeMarca1790076615915'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`presentacion\` (\`id\` int NOT NULL AUTO_INCREMENT, \`denominacion\` varchar(255) NOT NULL, \`observacion\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`usuarioCreatedId\` int NULL, \`usuarioDeletedId\` int NULL, \`usuarioUpdatedId\` int NULL, \`sistema\` int NOT NULL DEFAULT '0', UNIQUE INDEX \`IDX_presentacion_denominacion_deletedAt\` (\`denominacion\`, \`deletedAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('pack x12 de 0.5ml', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('500ml', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('pack x6', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('1l', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('800ml', NULL, 0)`);

        await queryRunner.query(`ALTER TABLE \`producto\` ADD \`presentacion_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`producto\` ADD CONSTRAINT \`FK_producto_presentacion\` FOREIGN KEY (\`presentacion_id\`) REFERENCES \`presentacion\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`producto\` DROP FOREIGN KEY \`FK_producto_presentacion\``);
        await queryRunner.query(`ALTER TABLE \`producto\` DROP COLUMN \`presentacion_id\``);
        await queryRunner.query(`DROP TABLE \`presentacion\``);
    }

}