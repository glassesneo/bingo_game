import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Card } from "./card.entity";
import { Game } from "./game.entity";

@Entity({ name: "card_invites" })
@Unique("uq_card_invites_token", ["token"])
@Unique("uq_card_invites_card_id", ["cardId"])
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

  @Column({ name: "card_id", nullable: true })
  cardId!: number | null;

  @OneToOne(
    () => Card,
    (card) => card.invite,
    {
      nullable: true,
      onDelete: "SET NULL",
    },
  )
  @JoinColumn({ name: "card_id" })
  card!: Card | null;

  @Column({ name: "expires_at", type: "datetime" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "datetime", nullable: true })
  usedAt!: Date | null;
}
