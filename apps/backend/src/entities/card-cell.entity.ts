import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Unique,
} from "typeorm";
import { Card } from "./card.entity";

@Entity({ name: "card_cells" })
@Unique("uq_card_cells_card_row_col", ["cardId", "row", "col"])
export class CardCell {
	@PrimaryGeneratedColumn()
	id!: number;

	@Index()
	@Column({ name: "card_id" })
	cardId!: number;

	@ManyToOne(
		() => Card,
		(card) => card.cells,
		{ onDelete: "CASCADE" },
	)
	@JoinColumn({ name: "card_id" })
	card!: Card;

	@Column({ type: "int" })
	row!: number;

	@Column({ type: "int" })
	col!: number;

	@Column({ type: "int" })
	number!: number;
}
