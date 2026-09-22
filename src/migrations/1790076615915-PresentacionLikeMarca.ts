import { MigrationInterface, QueryRunner } from "typeorm";

export class PresentacionLikeMarca1790076615915 implements MigrationInterface {
    name = 'PresentacionLikeMarca1790076615915'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`presentacion\` ADD \`denominacion\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` ADD \`observacion\` text NULL`);

        await queryRunner.query(`UPDATE \`presentacion\` SET \`denominacion\` = 'pack x12 de 0.5ml' WHERE \`id\` = 1`);

        await queryRunner.query(`DELETE FROM \`presentacion\` WHERE \`id\` <> 1`);

        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('500ml', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('pack x6', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('1l', NULL, 0)`);
        await queryRunner.query(`INSERT INTO \`presentacion\` (\`denominacion\`, \`observacion\`, \`sistema\`) VALUES ('800ml', NULL, 0)`);

        await queryRunner.query(`ALTER TABLE \`presentacion\` MODIFY \`denominacion\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` DROP COLUMN \`tipo\``);
        await queryRunner.query(`ALTER TABLE \`presentacion\` DROP COLUMN \`quantity\``);
        await queryRunner.query(`ALTER TABLE \`presentacion\` DROP COLUMN \`volumen\``);
        await queryRunner.query(`ALTER TABLE \`presentacion\` DROP COLUMN \`unidad\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_presentacion_denominacion_deletedAt\` ON \`presentacion\` (\`denominacion\`, \`deletedAt\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_presentacion_denominacion_deletedAt\` ON \`presentacion\``);
        await queryRunner.query(`ALTER TABLE \`presentacion\` ADD \`tipo\` varchar(20) NOT NULL DEFAULT 'pack'`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` ADD \`quantity\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` ADD \`volumen\` decimal(12,3) NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` ADD \`unidad\` varchar(20) NULL`);
        await queryRunner.query(`UPDATE \`presentacion\` SET \`tipo\` = 'pack', \`quantity\` = NULL, \`volumen\` = NULL, \`unidad\` = NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` MODIFY \`denominacion\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`presentacion\` DROP COLUMN \`observacion\``);
        await queryRunner.query(`ALTER TABLE \`presentacion\` DROP COLUMN \`denominacion\``);
    }

}