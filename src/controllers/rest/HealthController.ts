import { Controller } from "@tsed/di";
import { Get, Summary, Description, Returns } from "@tsed/schema";

/**
 * Health check controller.
 *
 * @route /health
 */
@Controller("/health")
export class HealthController {
  /**
   * Retorna o status de saúde da aplicação.
   *
   * @returns { status: string, uptime: number }
   */
  @Get("")
  @Summary("Health check")
  @Description("Retorna status simples com uptime da aplicação")
  @Returns(200, Object)
  get() {
    return { status: "ok", uptime: process.uptime() };
  }
}
