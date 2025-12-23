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

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;
}
