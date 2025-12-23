import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Game } from "./game.entity";

/**
 * CardInvite represents a reusable game invite token.
 * One invite per game (UNIQUE gameId), unlimited players can use the same token.
 * The cards table's UNIQUE(gameId, userId) constraint prevents duplicate joins.
 */
@Entity({ name: "card_invites" })
@Unique("uq_card_invites_token", ["token"])
@Unique("uq_card_invites_game_id", ["gameId"])
export class CardInvite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: "game_id" })
  gameId!: number;

  @ManyToOne(
    () => Game,
    (game) => game.invites,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "game_id" })
  game!: Game;

  @Column({ type: "varchar" })
  token!: string;

  @Column({ name: "expires_at", type: "datetime" })
  expiresAt!: Date;
}
