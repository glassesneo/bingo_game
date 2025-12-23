import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Game } from "../entities/game.entity";
import { HostTokenGuard } from "./host-token.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is required in production",
      );
    }
    // Allow default only in development
    return "bingo-dev-secret-do-not-use-in-prod";
  }
  return secret;
};

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: getJwtSecret(),
      signOptions: { expiresIn: "24h" },
    }),
    TypeOrmModule.forFeature([Game]),
  ],
  providers: [JwtAuthGuard, HostTokenGuard],
  exports: [JwtModule, JwtAuthGuard, HostTokenGuard],
})
export class AuthModule {}
