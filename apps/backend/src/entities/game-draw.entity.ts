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

@Entity({ name: "game_draws" })
@Unique("uq_game_draws_game_draw_order", ["gameId", "drawOrder"])
@Unique("uq_game_draws_game_number", ["gameId", "number"])
export class GameDraw {
	@PrimaryGeneratedColumn()
	id!: number;

	@Index()
	@Column({ name: "game_id" })
	gameId!: number;

	@ManyToOne(
		() => Game,
		(game) => game.draws,
		{ onDelete: "CASCADE" },
	)
	@JoinColumn({ name: "game_id" })
	game!: Game;

	@Column({ type: "int" })
	number!: number;

	@Column({ name: "draw_order", type: "int" })
	drawOrder!: number;

	@CreateDateColumn({ name: "drawn_at" })
	drawnAt!: Date;
}
