import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraints1766464009106 implements MigrationInterface {
  name = "AddUniqueConstraints1766464009106";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint on card_invites.card_id to enforce 1:1 relationship
    // SQLite doesn't support adding constraints directly, so we need to recreate the table
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
      INSERT INTO "card_invites_new" ("id", "game_id", "token", "card_id", "expires_at", "used_at")
      SELECT "id", "game_id", "token", "card_id", "expires_at", "used_at" FROM "card_invites"
    `);

    await queryRunner.query(`DROP TABLE "card_invites"`);
    await queryRunner.query(
      `ALTER TABLE "card_invites_new" RENAME TO "card_invites"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_card_invites_game_id" ON "card_invites" ("game_id")`,
    );

    // Add unique constraint on users.display_name
    await queryRunner.query(`
      CREATE TABLE "users_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "display_name" varchar NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "uq_users_display_name" UNIQUE ("display_name")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "users_new" ("id", "display_name", "created_at")
      SELECT "id", "display_name", "created_at" FROM "users"
    `);

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`ALTER TABLE "users_new" RENAME TO "users"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint from users.display_name
    await queryRunner.query(`
      CREATE TABLE "users_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "display_name" varchar NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO "users_new" ("id", "display_name", "created_at")
      SELECT "id", "display_name", "created_at" FROM "users"
    `);

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`ALTER TABLE "users_new" RENAME TO "users"`);

    // Remove unique constraint from card_invites.card_id
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
        CONSTRAINT "uq_card_invites_token" UNIQUE ("token")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "card_invites_new" ("id", "game_id", "token", "card_id", "expires_at", "used_at")
      SELECT "id", "game_id", "token", "card_id", "expires_at", "used_at" FROM "card_invites"
    `);

    await queryRunner.query(`DROP TABLE "card_invites"`);
    await queryRunner.query(
      `ALTER TABLE "card_invites_new" RENAME TO "card_invites"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_card_invites_game_id" ON "card_invites" ("game_id")`,
    );
  }
}
