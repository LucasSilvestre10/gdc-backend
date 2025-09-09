import {$log} from "@tsed/logger";
import { PlatformExpress } from "@tsed/platform-express";
import {Server} from "./Server.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import "./config/providers.js";

const SIG_EVENTS = [
  "beforeExit",
  "SIGHUP",
  "SIGINT",
  "SIGQUIT",
  "SIGILL",
  "SIGTRAP",
  "SIGABRT",
  "SIGBUS",
  "SIGFPE",
  "SIGUSR1",
  "SIGSEGV",
  "SIGUSR2",
  "SIGTERM"
];

async function bootstrap() {
  try {
  // Inicializa o TsED normalmente
  const platform = await PlatformExpress.bootstrap(Server);
  await platform.listen();

    SIG_EVENTS.forEach((evt) => process.on(evt, () => platform.stop()));

    ["uncaughtException", "unhandledRejection"].forEach((evt) =>
      process.on(evt, async (error) => {
        $log.error({event: "SERVER_" + evt.toUpperCase(), message: error.message, stack: error.stack});
        await platform.stop();
      })
    );
  } catch (error) {
    const err = error as Error;
    $log.error({event: "SERVER_BOOTSTRAP_ERROR", message: err.message, stack: err.stack});
  }
}

bootstrap();

