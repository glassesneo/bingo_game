import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Game } from "./game.entity";
import { User } from "./user.entity";

@Entity({ name: "game_participants" })
@Unique("uq_game_participants_game_user", ["gameId", "userId"])
@Unique("uq_game_participants_game_display_name", ["gameId", "displayName"])
export class GameParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: "game_id" })
  gameId!: number;

  @ManyToOne(
    () => Game,
    (game) => game.participants,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "game_id" })
  game!: Game;

  @Index()
  @Column({ name: "user_id" })
  userId!: number;

  @ManyToOne(
    () => User,
    (user) => user.gameParticipants,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "user_id" })
  user!: User;

  /** Display name for this participant in this game (scoped to game) */
  @Column({ name: "display_name", type: "varchar" })
  displayName!: string;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;

  /** When this participant won (null if not a winner) */
  @Column({ name: "won_at", type: "datetime", nullable: true })
  wonAt!: Date | null;
}
