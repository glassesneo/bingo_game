import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
} from "typeorm";
import { Card } from "./card.entity";
import { GameParticipant } from "./game-participant.entity";

@Entity({ name: "users" })
export class User {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: "display_name", type: "varchar" })
	displayName!: string;

	@CreateDateColumn({ name: "created_at" })
	createdAt!: Date;

	@OneToMany(
		() => GameParticipant,
		(gp) => gp.user,
	)
	gameParticipants!: GameParticipant[];

	@OneToMany(
		() => Card,
		(card) => card.user,
	)
	cards!: Card[];
}
