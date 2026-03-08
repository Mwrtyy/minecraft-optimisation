export type Rarity = "Common" | "Rare" | "Epic" | "Legendary" | "Secret";

export type UnitState =
  | "NeutralOnLane"
  | "ReservedForPurchase"
  | "ClaimedTransitToBase"
  | "OwnedPlaced"
  | "BeingStolen"
  | "StolenCarried"
  | "ReturningToOwner"
  | "Despawning"
  | "Destroyed";

export interface Vector2 {
  x: number;
  y: number;
}

export interface UnitDefinition {
  id: string;
  displayName: string;
  rarity: Rarity;
  buyPrice: number;
  incomePerSecond: number;
  spawnWeight: number;
  moveSpeed: number;
  stealDifficulty?: number;
  specialTrait?: string;
  assetRef?: string;
}

export interface CarryData {
  thiefPlayerId: string;
  startedAt: number;
  expiresAt: number;
}

export interface UnitData {
  unitInstanceId: string;
  definitionId: string;
  displayName: string;
  rarity: Rarity;
  ownerPlayerId: string | null;
  originalOwnerPlayerId: string | null;
  currentState: UnitState;
  currentBaseId: string | null;
  originalBaseId: string | null;
  slotIndex: number | null;
  incomePerSecond: number;
  stealDifficulty: number;
  worldPosition: Vector2;
  laneProgress: number;
  spawnedAtTime: number;
  reservedByPlayerId: string | null;
  carryData: CarryData | null;
}

export interface ProtectionState {
  active: boolean;
  reason: "JoinGrace" | "ManualShield" | "None";
}

export interface BaseUpgradeLevels {
  slots: number;
  shield: number;
}

export interface BaseData {
  baseId: string;
  ownerPlayerId: string | null;
  slotCount: number;
  occupiedSlots: Array<string | null>;
  protectionState: ProtectionState;
  protectionEndTime: number;
  upgradeLevels: BaseUpgradeLevels;
  dropOffZone: Vector2;
  entryZone: Vector2;
}

export interface PlayerStatusFlags {
  disconnected: boolean;
  carrying: boolean;
}

export interface PlayerSessionStats {
  claims: number;
  steals: number;
  stealsLost: number;
  passiveIncomeEarned: number;
}

export interface PlayerData {
  playerId: string;
  displayName: string;
  currentCurrency: number;
  permanentUpgrades: Record<string, number>;
  currentBaseId: string | null;
  carriedUnitId: string | null;
  statusFlags: PlayerStatusFlags;
  sessionStats: PlayerSessionStats;
  worldPosition: Vector2;
  moveSpeed: number;
}

export interface GameConfig {
  starterCurrency: number;
  spawnIntervalMs: number;
  despawnTimeMs: number;
  laneLength: number;
  claimRange: number;
  stealRange: number;
  dropOffRange: number;
  carryMoveSpeedMultiplier: number;
  protectionDurationMs: number;
  incomeTickRateMs: number;
  baseInitialSlots: number;
  baseMaxSlots: number;
  baseUpgradeCosts: number[];
  stealCarryTimeoutMs: number;
  eventSpawnPool: string[];
  unitDefinitions: UnitDefinition[];
}

export interface ClaimResult {
  ok: boolean;
  reason?: "already_claimed" | "not_enough_money" | "too_far" | "invalid_target";
  unitId?: string;
}

export interface StealResult {
  ok: boolean;
  reason?:
    | "invalid_target"
    | "own_unit"
    | "too_far"
    | "base_protected"
    | "already_carrying"
    | "not_stealable";
  unitId?: string;
}
