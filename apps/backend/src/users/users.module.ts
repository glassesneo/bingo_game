import { Module } from "@nestjs/common";
import { DbModule } from "src/db/db.module";

@Module({
  imports: [DbModule],
})
export class UsersModule {}
