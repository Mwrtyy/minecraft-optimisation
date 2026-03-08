import { UnitDefinition } from "../../shared/types.js";
import { SessionState } from "./SessionState.js";
import { weightedPick } from "./math.js";
import { UnitService } from "./UnitService.js";

export class SpawnService {
  private nextSpawnAt = 0;

  constructor(
    private readonly state: SessionState,
    private readonly unitService: UnitService
  ) {}

  tick(now = Date.now()): string | null {
    if (this.nextSpawnAt === 0) this.nextSpawnAt = now + this.state.config.spawnIntervalMs;
    if (now < this.nextSpawnAt) return null;

    const pool = this.resolvePool();
    const chosen = weightedPick(pool, (u) => u.spawnWeight);
    const unit = this.unitService.spawnNeutral(chosen);
    this.nextSpawnAt = now + this.state.config.spawnIntervalMs;
    return unit.unitInstanceId;
  }

  private resolvePool(): UnitDefinition[] {
    const ids = this.state.config.eventSpawnPool;
    if (!ids.length) return this.state.config.unitDefinitions;

    const eventDefs = ids
      .map((id) => this.state.unitDefinitions.get(id))
      .filter((d): d is UnitDefinition => Boolean(d));

    return eventDefs.length ? eventDefs : this.state.config.unitDefinitions;
  }
}
