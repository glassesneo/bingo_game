import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1766459947437 implements MigrationInterface {
  name = "Init1766459947437";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create servers table
    await queryRunner.query(`
            CREATE TABLE "servers" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);

    // Create games table
    await queryRunner.query(`
            CREATE TABLE "games" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "server_id" integer NOT NULL,
                "status" varchar NOT NULL,
                "started_at" datetime,
                "ended_at" datetime,
                CONSTRAINT "FK_games_server" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_games_server_id" ON "games" ("server_id")`,
    );

    // Create users table
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "display_name" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);

    // Create game_participants table
    await queryRunner.query(`
            CREATE TABLE "game_participants" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "game_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "joined_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_game_participants_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
                CONSTRAINT "FK_game_participants_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
                CONSTRAINT "uq_game_participants_game_user" UNIQUE ("game_id", "user_id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_game_participants_game_id" ON "game_participants" ("game_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_game_participants_user_id" ON "game_participants" ("user_id")`,
    );

    // Create game_draws table
    await queryRunner.query(`
            CREATE TABLE "game_draws" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "game_id" integer NOT NULL,
                "number" integer NOT NULL,
                "draw_order" integer NOT NULL,
                "drawn_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_game_draws_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
                CONSTRAINT "uq_game_draws_game_draw_order" UNIQUE ("game_id", "draw_order"),
                CONSTRAINT "uq_game_draws_game_number" UNIQUE ("game_id", "number")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_game_draws_game_id" ON "game_draws" ("game_id")`,
    );

    // Create cards table
    await queryRunner.query(`
            CREATE TABLE "cards" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "game_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "issued_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_cards_game" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE,
                CONSTRAINT "FK_cards_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
                CONSTRAINT "uq_cards_game_user" UNIQUE ("game_id", "user_id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cards_game_id" ON "cards" ("game_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cards_user_id" ON "cards" ("user_id")`,
    );

    // Create card_cells table
    await queryRunner.query(`
            CREATE TABLE "card_cells" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "card_id" integer NOT NULL,
                "row" integer NOT NULL,
                "col" integer NOT NULL,
                "number" integer NOT NULL,
                CONSTRAINT "FK_card_cells_card" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE,
                CONSTRAINT "uq_card_cells_card_row_col" UNIQUE ("card_id", "row", "col")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_card_cells_card_id" ON "card_cells" ("card_id")`,
    );

    // Create card_invites table
    await queryRunner.query(`
            CREATE TABLE "card_invites" (
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
    await queryRunner.query(
      `CREATE INDEX "IDX_card_invites_game_id" ON "card_invites" ("game_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to respect foreign key constraints
    await queryRunner.query(`DROP TABLE "card_invites"`);
    await queryRunner.query(`DROP TABLE "card_cells"`);
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP TABLE "game_draws"`);
    await queryRunner.query(`DROP TABLE "game_participants"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`DROP TABLE "servers"`);
  }
}
