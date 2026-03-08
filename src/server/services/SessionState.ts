import { BaseData, GameConfig, PlayerData, UnitData, UnitDefinition } from "../../shared/types.js";

export interface SessionState {
  readonly config: GameConfig;
  readonly players: Map<string, PlayerData>;
  readonly bases: Map<string, BaseData>;
  readonly units: Map<string, UnitData>;
  readonly unitDefinitions: Map<string, UnitDefinition>;
}

export function createSessionState(config: GameConfig): SessionState {
  return {
    config,
    players: new Map(),
    bases: new Map(),
    units: new Map(),
    unitDefinitions: new Map(config.unitDefinitions.map((u) => [u.id, u]))
  };
}
