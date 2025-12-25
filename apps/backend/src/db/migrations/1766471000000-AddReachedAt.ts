import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReachedAt1766471000000 implements MigrationInterface {
  name = "AddReachedAt1766471000000";

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
