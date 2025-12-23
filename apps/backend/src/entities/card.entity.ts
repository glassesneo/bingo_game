import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
	Unique,
} from "typeorm";
import { CardCell } from "./card-cell.entity";
import { CardInvite } from "./card-invite.entity";
import { Game } from "./game.entity";
import { User } from "./user.entity";

@Entity({ name: "cards" })
@Unique("uq_cards_game_user", ["gameId", "userId"])
export class Card {
	@PrimaryGeneratedColumn()
	id!: number;

	@Index()
	@Column({ name: "game_id" })
	gameId!: number;

	@ManyToOne(
		() => Game,
		(game) => game.cards,
		{ onDelete: "CASCADE" },
	)
	@JoinColumn({ name: "game_id" })
	game!: Game;

	@Index()
	@Column({ name: "user_id" })
	userId!: number;

	@ManyToOne(
		() => User,
		(user) => user.cards,
		{ onDelete: "CASCADE" },
	)
	@JoinColumn({ name: "user_id" })
	user!: User;

	@CreateDateColumn({ name: "issued_at" })
	issuedAt!: Date;

	@OneToMany(
		() => CardCell,
		(cell) => cell.card,
	)
	cells!: CardCell[];

	@OneToOne(
		() => CardInvite,
		(invite) => invite.card,
	)
	invite!: CardInvite | null;
}
