import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAwardRange1766472000000 implements MigrationInterface {
  name = "AddAwardRange1766472000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "games" ADD COLUMN "award_min" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD COLUMN "award_max" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "award_max"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "award_min"`);
  }
}
