import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// stand-in for dotenv.config(): vars already in process.env win, a missing file is not an error
export const loadEnv = (path = ".env"): NodeJS.Dict<string> => {
  if (!existsSync(path)) return {};
  const parsed = parseEnv(readFileSync(path, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return parsed;
};
