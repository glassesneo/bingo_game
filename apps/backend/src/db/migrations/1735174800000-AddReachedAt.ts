import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReachedAt1735174800000 implements MigrationInterface {
  name = "AddReachedAt1735174800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_participants" ADD COLUMN "reached_at" datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game_participants" DROP COLUMN "reached_at"`,
    );
  }
}
