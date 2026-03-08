import { v4 as uuidv4 } from "uuid";
import { assertTransition } from "../../shared/stateMachine.js";
import { ClaimResult, UnitData, UnitDefinition } from "../../shared/types.js";
import { SessionState } from "./SessionState.js";
import { distance } from "./math.js";
import { BaseService } from "./BaseService.js";
import { PlayerDataService } from "./PlayerDataService.js";

export class UnitService {
  constructor(
    private readonly state: SessionState,
    private readonly baseService: BaseService,
    private readonly playerDataService: PlayerDataService
  ) {}

  spawnNeutral(def: UnitDefinition): UnitData {
    const unit: UnitData = {
      unitInstanceId: uuidv4(),
      definitionId: def.id,
      displayName: def.displayName,
      rarity: def.rarity,
      ownerPlayerId: null,
      originalOwnerPlayerId: null,
      currentState: "NeutralOnLane",
      currentBaseId: null,
      originalBaseId: null,
      slotIndex: null,
      incomePerSecond: def.incomePerSecond,
      stealDifficulty: def.stealDifficulty ?? 1,
      worldPosition: { x: -this.state.config.laneLength / 2, y: 0 },
      laneProgress: 0,
      spawnedAtTime: Date.now(),
      reservedByPlayerId: null,
      carryData: null
    };
    this.state.units.set(unit.unitInstanceId, unit);
    return unit;
  }

  tickLaneMovement(deltaSeconds: number): string[] {
    const despawned: string[] = [];
    const now = Date.now();
    for (const unit of this.state.units.values()) {
      if (unit.currentState === "NeutralOnLane") {
        const def = this.state.unitDefinitions.get(unit.definitionId);
        if (!def) continue;
        unit.laneProgress += (def.moveSpeed * deltaSeconds) / this.state.config.laneLength;
        unit.worldPosition.x = -this.state.config.laneLength / 2 + unit.laneProgress * this.state.config.laneLength;

        if (now - unit.spawnedAtTime >= this.state.config.despawnTimeMs || unit.laneProgress >= 1) {
          assertTransition(unit.currentState, "Despawning", unit.unitInstanceId);
          unit.currentState = "Despawning";
          assertTransition(unit.currentState, "Destroyed", unit.unitInstanceId);
          unit.currentState = "Destroyed";
          despawned.push(unit.unitInstanceId);
        }
      }
    }

    for (const id of despawned) {
      this.state.units.delete(id);
    }
    return despawned;
  }

  tryClaimUnit(playerId: string, unitId: string): ClaimResult {
    const unit = this.state.units.get(unitId);
    const player = this.state.players.get(playerId);
    if (!unit || !player) return { ok: false, reason: "invalid_target" };
    if (unit.currentState !== "NeutralOnLane") return { ok: false, reason: "already_claimed" };
    if (distance(player.worldPosition, unit.worldPosition) > this.state.config.claimRange) {
      return { ok: false, reason: "too_far" };
    }

    const definition = this.state.unitDefinitions.get(unit.definitionId);
    if (!definition) return { ok: false, reason: "invalid_target" };
    if (player.currentCurrency < definition.buyPrice) {
      return { ok: false, reason: "not_enough_money" };
    }

    assertTransition(unit.currentState, "ReservedForPurchase", unit.unitInstanceId);
    unit.currentState = "ReservedForPurchase";
    unit.reservedByPlayerId = playerId;

    const paid = this.playerDataService.trySpendCurrency(playerId, definition.buyPrice);
    if (!paid) {
      unit.currentState = "NeutralOnLane";
      unit.reservedByPlayerId = null;
      return { ok: false, reason: "not_enough_money" };
    }

    const baseId = player.currentBaseId;
    if (!baseId) {
      unit.currentState = "NeutralOnLane";
      unit.reservedByPlayerId = null;
      return { ok: false, reason: "invalid_target" };
    }

    const slot = this.baseService.findFreeSlot(baseId);
    if (slot === null) {
      // Consistent fallback: reject placement and refund on full base.
      this.playerDataService.addCurrency(playerId, definition.buyPrice);
      unit.currentState = "NeutralOnLane";
      unit.reservedByPlayerId = null;
      return { ok: false, reason: "invalid_target" };
    }

    assertTransition(unit.currentState, "ClaimedTransitToBase", unit.unitInstanceId);
    unit.currentState = "ClaimedTransitToBase";
    unit.ownerPlayerId = playerId;
    unit.originalOwnerPlayerId = playerId;
    unit.currentBaseId = baseId;
    unit.originalBaseId = baseId;

    assertTransition(unit.currentState, "OwnedPlaced", unit.unitInstanceId);
    unit.currentState = "OwnedPlaced";
    unit.slotIndex = slot;
    const ownerBase = this.state.bases.get(baseId);
    if (ownerBase) {
      // Place the unit at a deterministic position in the owner's base.
      unit.worldPosition = {
        x: ownerBase.entryZone.x + (slot + 1) * 1.5,
        y: ownerBase.entryZone.y + (slot + 1) * 1.5
      };
    }
    this.baseService.placeUnit(baseId, slot, unit.unitInstanceId);
    player.sessionStats.claims += 1;

    return { ok: true, unitId };
  }
}
