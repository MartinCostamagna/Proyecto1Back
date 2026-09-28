import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `historial_precio`, que ninguna migracion anterior creaba.
 *
 * La tabla existia en el entorno de desarrollo porque se genero a mano con
 * `synchronize`, pero en una base limpia `1790450000000-FixHistorialPrecio`
 * fallaba en su primer ALTER con ER_NO_SUCH_TABLE y cortaba toda la cadena de
 * migraciones.
 *
 * El timestamp 1790449999999 la ubica justo antes de FixHistorialPrecio, de
 * modo que la tabla nace en el estado que ese script espera y sus ALTER siguen
 * siendo validos. Se crea en estado "pre-Fix":
 *   - `fecha` timestamp NOT NULL      -> Fix la pasa a datetime(6)
 *   - `motivo` text                    -> Fix la pasa a varchar(255) NOT NULL
 *   - `producto_id` nullable           -> Fix la vuelve NOT NULL
 *   - `productoId` duplicacion huerfana -> Fix la elimina
 *
 * El `IF NOT EXISTS` la hace idempotente: en bases donde la tabla ya existe no
 * altera nada.
 */
export class CreateHistorialPrecio1790449999999 implements MigrationInterface {
  name = 'CreateHistorialPrecio1790449999999'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`historial_precio\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`fecha\` timestamp NOT NULL,
  \`precioAnterior\` decimal(15,5) NOT NULL DEFAULT '0.00000',
  \`precioNuevo\` decimal(15,5) NOT NULL DEFAULT '0.00000',
  \`motivo\` text,
  \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`deletedAt\` timestamp NULL DEFAULT NULL,
  \`sistema\` int NOT NULL DEFAULT '0',
  \`producto_id\` int NULL,
  \`productoId\` int NOT NULL DEFAULT '0',
  \`usuario_created_id\` int DEFAULT NULL,
  \`usuario_updated_id\` int DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`IDX_e2f1eed194c44ae80d797cb6d1\` (\`producto_id\`),
  KEY \`FK_4fe0bf14e1262ee7ab26227519b\` (\`usuario_created_id\`),
  KEY \`FK_83b4eb346e12056eb574d04ac7e\` (\`usuario_updated_id\`),
  CONSTRAINT \`FK_e2f1eed194c44ae80d797cb6d1b\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT \`FK_4fe0bf14e1262ee7ab26227519b\` FOREIGN KEY (\`usuario_created_id\`) REFERENCES \`usuario\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT \`FK_83b4eb346e12056eb574d04ac7e\` FOREIGN KEY (\`usuario_updated_id\`) REFERENCES \`usuario\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`historial_precio\``);
  }
}
