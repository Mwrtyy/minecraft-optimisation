import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GameConfig } from "../../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class GameConfigService {
  static load(configPath?: string): GameConfig {
    const candidates = [
      configPath,
      process.env.GAME_CONFIG_PATH,
      path.resolve(process.cwd(), "config/game-config.json"),
      path.resolve(__dirname, "../../../config/game-config.json")
    ].filter((value): value is string => Boolean(value));

    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) {
      throw new Error(`No game config found. Checked: ${candidates.join(", ")}`);
    }

    const raw = readFileSync(found, "utf-8");
    const parsed = JSON.parse(raw) as GameConfig;
    if (!parsed.unitDefinitions.length) {
      throw new Error("game-config.json must include at least one unit definition");
    }
    return parsed;
  }
}
