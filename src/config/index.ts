import {readFileSync} from "node:fs";
import {envs} from "./envs/index.js";
import loggerConfig from "./logger/index.js";
import { mongooseConfig } from "./mongoose.js";

const pkg = JSON.parse(readFileSync("./package.json", {encoding: "utf8"}));

export const config: Partial<TsED.Configuration> = {
  version: pkg.version,
  envs,
  ajv: {
    returnsCoercedValues: true
  },
  logger: loggerConfig,
  mongoose: mongooseConfig,
  // additional shared configuration
};
