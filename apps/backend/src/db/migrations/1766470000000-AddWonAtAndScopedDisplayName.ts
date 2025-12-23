import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddWonAtAndScopedDisplayName1766470000000
  implements MigrationInterface
{
  name = "AddWonAtAndScopedDisplayName1766470000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support ALTER TABLE ADD COLUMN with constraints well,
    // so we recreate the table with the new schema

    // 1. Create new table with won_at and display_name columns
    await queryRunner.query(`
      CREATE TABLE "game_participants_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "game_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "display_name" varchar NOT NULL,
        "joined_at" datetime NOT NULL DEFAULT (datetime('now')),
        "won_at" datetime,
        CONSTRAINT "FK_game_participants_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_game_participants_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_game_participants_game_user" UNIQUE ("game_id", "user_id"),
        CONSTRAINT "uq_game_participants_game_display_name" UNIQUE ("game_id", "display_name")
      )
    `);

    // 2. Migrate data - copy display_name from users table
    await queryRunner.query(`
      INSERT INTO "game_participants_new" ("id", "game_id", "user_id", "display_name", "joined_at", "won_at")
      SELECT gp."id", gp."game_id", gp."user_id", u."display_name", gp."joined_at", NULL
      FROM "game_participants" gp
      INNER JOIN "users" u ON gp."user_id" = u."id"
    `);

    // 3. Drop old table
    await queryRunner.query(`DROP TABLE "game_participants"`);

    // 4. Rename new table
    await queryRunner.query(
      `ALTER TABLE "game_participants_new" RENAME TO "game_participants"`,
    );

    // 5. Recreate indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_game_participants_game_id" ON "game_participants" ("game_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_game_participants_user_id" ON "game_participants" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to old schema without won_at and display_name
    await queryRunner.query(`
      CREATE TABLE "game_participants_old" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "game_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "joined_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_game_participants_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_game_participants_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_game_participants_game_user" UNIQUE ("game_id", "user_id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "game_participants_old" ("id", "game_id", "user_id", "joined_at")
      SELECT "id", "game_id", "user_id", "joined_at"
      FROM "game_participants"
    `);

    await queryRunner.query(`DROP TABLE "game_participants"`);
    await queryRunner.query(
      `ALTER TABLE "game_participants_old" RENAME TO "game_participants"`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_game_participants_game_id" ON "game_participants" ("game_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_game_participants_user_id" ON "game_participants" ("user_id")`,
    );
  }
}
