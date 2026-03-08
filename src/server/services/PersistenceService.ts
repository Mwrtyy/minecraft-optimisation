import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SessionState } from "./SessionState.js";

interface PersistedPlayer {
  playerId: string;
  currentCurrency: number;
  permanentUpgrades: Record<string, number>;
}

export class PersistenceService {
  constructor(
    private readonly state: SessionState,
    private readonly savePath = path.resolve("data/player-save.json")
  ) {}

  load(): Map<string, PersistedPlayer> {
    try {
      const raw = readFileSync(this.savePath, "utf-8");
      const rows = JSON.parse(raw) as PersistedPlayer[];
      return new Map(rows.map((r) => [r.playerId, r]));
    } catch {
      return new Map();
    }
  }

  save(): void {
    const dir = path.dirname(this.savePath);
    mkdirSync(dir, { recursive: true });

    const rows: PersistedPlayer[] = [...this.state.players.values()].map((p) => ({
      playerId: p.playerId,
      currentCurrency: p.currentCurrency,
      permanentUpgrades: p.permanentUpgrades
    }));

    const tmpPath = `${this.savePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(rows, null, 2), "utf-8");
    renameSync(tmpPath, this.savePath);
  }
}
