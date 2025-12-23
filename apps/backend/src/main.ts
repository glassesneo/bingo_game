import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  // FRONTEND_URL can be comma-separated for multiple origins (e.g., localhost + LAN IP)
  const allowedOrigins = (
    process.env.FRONTEND_URL ?? "http://localhost:5173"
  ).split(",");
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Bind to 0.0.0.0 to allow LAN access
  const port = process.env.PORT ?? 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`Server running on http://0.0.0.0:${port}`);
}
bootstrap();
