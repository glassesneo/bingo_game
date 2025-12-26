import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Card } from "./card.entity";
import { CardInvite } from "./card-invite.entity";
import { GameDraw } from "./game-draw.entity";
import { GameParticipant } from "./game-participant.entity";
import { Server } from "./server.entity";

@Entity({ name: "games" })
@Unique("uq_games_host_token", ["hostToken"])
export class Game {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: "server_id" })
  serverId!: number;

  @Index("IDX_games_host_token")
  @Column({ name: "host_token", type: "varchar" })
  hostToken!: string;

  @ManyToOne(
    () => Server,
    (server) => server.games,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "server_id" })
  server!: Server;

  @Column({ type: "varchar" })
  status!: string; // e.g. 'waiting' | 'running' | 'ended'

  @Column({ name: "started_at", type: "datetime", nullable: true })
  startedAt!: Date | null;

  @Column({ name: "ended_at", type: "datetime", nullable: true })
  endedAt!: Date | null;

  @Column({ name: "award_min", type: "integer", nullable: true })
  awardMin!: number | null;

  @Column({ name: "award_max", type: "integer", nullable: true })
  awardMax!: number | null;

  @OneToMany(
    () => GameParticipant,
    (gp) => gp.game,
  )
  participants!: GameParticipant[];

  @OneToMany(
    () => GameDraw,
    (draw) => draw.game,
  )
  draws!: GameDraw[];

  @OneToMany(
    () => Card,
    (card) => card.game,
  )
  cards!: Card[];

  @OneToMany(
    () => CardInvite,
    (invite) => invite.game,
  )
  invites!: CardInvite[];
}
