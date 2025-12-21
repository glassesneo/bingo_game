import "reflect-metadata";
import { DataSource } from "typeorm";

export default new DataSource({
	type: "sqlite",
	database: process.env.DATABASE_PATH ?? "dev.db",
	entities: [__dirname + "/../**/*.entity{.ts,.js}"],
	migrations: [__dirname + "/migrations/*{.ts,.js}"],
});
