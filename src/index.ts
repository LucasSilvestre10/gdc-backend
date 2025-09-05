import {$log} from "@tsed/logger";
import { PlatformExpress } from "@tsed/platform-express";
import {Server} from "./Server.js";
import { MongoMemoryServer } from "mongodb-memory-server";

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
    // Inicia o MongoDB em memória
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Passa a URL do banco para o TsED
    const platform = await PlatformExpress.bootstrap(Server, {
      mongoose: {
        url: uri,
        connectionOptions: {}
      }
    });
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

