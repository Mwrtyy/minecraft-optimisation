import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GameConfig } from "../../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class GameConfigService {
  static load(configPath = path.resolve(__dirname, "../../../config/game-config.json")): GameConfig {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as GameConfig;
    if (!parsed.unitDefinitions.length) {
      throw new Error("game-config.json must include at least one unit definition");
    }
    return parsed;
  }
}
