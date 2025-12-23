import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHostTokenAndReusableInvites1766469046183
  implements MigrationInterface
{
  name = "AddHostTokenAndReusableInvites1766469046183";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add host_token to games table with unique constraint
    // SQLite doesn't support ALTER TABLE ADD COLUMN with constraints, so recreate table
    await queryRunner.query(`
      CREATE TABLE "games_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "server_id" integer NOT NULL,
        "host_token" varchar NOT NULL,
        "status" varchar NOT NULL,
        "started_at" datetime,
        "ended_at" datetime,
        CONSTRAINT "FK_games_server" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_games_host_token" UNIQUE ("host_token")
      )
    `);

    // Copy existing data, generating random host_token for existing games
    await queryRunner.query(`
      INSERT INTO "games_new" ("id", "server_id", "host_token", "status", "started_at", "ended_at")
      SELECT "id", "server_id", lower(hex(randomblob(16))), "status", "started_at", "ended_at" FROM "games"
    `);

    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`ALTER TABLE "games_new" RENAME TO "games"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_games_server_id" ON "games" ("server_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_games_host_token" ON "games" ("host_token")`,
    );

    // 2. Modify card_invites table - remove card_id, used_at, add UNIQUE(game_id)
    await queryRunner.query(`
      CREATE TABLE "card_invites_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "game_id" integer NOT NULL,
        "token" varchar NOT NULL,
        "expires_at" datetime NOT NULL,
        CONSTRAINT "FK_card_invites_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_card_invites_token" UNIQUE ("token"),
        CONSTRAINT "uq_card_invites_game_id" UNIQUE ("game_id")
      )
    `);

    // Copy existing data (dropping card_id and used_at columns)
    // Only keep one invite per game (in case of duplicates)
    await queryRunner.query(`
      INSERT OR IGNORE INTO "card_invites_new" ("id", "game_id", "token", "expires_at")
      SELECT "id", "game_id", "token", "expires_at" FROM "card_invites"
    `);

    await queryRunner.query(`DROP TABLE "card_invites"`);
    await queryRunner.query(
      `ALTER TABLE "card_invites_new" RENAME TO "card_invites"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_card_invites_game_id" ON "card_invites" ("game_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Revert card_invites - add back card_id and used_at columns
    await queryRunner.query(`
      CREATE TABLE "card_invites_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "game_id" integer NOT NULL,
        "token" varchar NOT NULL,
        "card_id" integer,
        "expires_at" datetime NOT NULL,
        "used_at" datetime,
        CONSTRAINT "FK_card_invites_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_card_invites_card" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE SET NULL,
        CONSTRAINT "uq_card_invites_token" UNIQUE ("token"),
        CONSTRAINT "uq_card_invites_card_id" UNIQUE ("card_id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "card_invites_new" ("id", "game_id", "token", "expires_at", "card_id", "used_at")
      SELECT "id", "game_id", "token", "expires_at", NULL, NULL FROM "card_invites"
    `);

    await queryRunner.query(`DROP TABLE "card_invites"`);
    await queryRunner.query(
      `ALTER TABLE "card_invites_new" RENAME TO "card_invites"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_card_invites_game_id" ON "card_invites" ("game_id")`,
    );

    // 2. Revert games - remove host_token column
    await queryRunner.query(`
      CREATE TABLE "games_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "server_id" integer NOT NULL,
        "status" varchar NOT NULL,
        "started_at" datetime,
        "ended_at" datetime,
        CONSTRAINT "FK_games_server" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "games_new" ("id", "server_id", "status", "started_at", "ended_at")
      SELECT "id", "server_id", "status", "started_at", "ended_at" FROM "games"
    `);

    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`ALTER TABLE "games_new" RENAME TO "games"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_games_server_id" ON "games" ("server_id")`,
    );
  }
}
