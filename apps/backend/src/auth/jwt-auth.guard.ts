import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthenticatedUser, JwtPayload } from "./jwt-payload.interface";

/**
 * Guard that validates JWT Bearer tokens for player-protected endpoints.
 * Extracts user info from token and attaches to request.user
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Missing authorization token");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Attach user info to request
      const user: AuthenticatedUser = {
        userId: payload.sub,
        gameId: payload.gameId,
        cardId: payload.cardId,
        displayName: payload.displayName,
      };
      (request as Request & { user: AuthenticatedUser }).user = user;

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}
