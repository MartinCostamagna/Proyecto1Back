import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropProductoPack1790367684411 implements MigrationInterface {
  name = 'DropProductoPack1790367684411'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`producto\` DROP COLUMN \`utilizaPack\``);
    await queryRunner.query(`ALTER TABLE \`producto\` DROP COLUMN \`cantidadPorPack\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`producto\` ADD \`utilizaPack\` tinyint NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE \`producto\` ADD \`cantidadPorPack\` int NULL`);
  }
}
