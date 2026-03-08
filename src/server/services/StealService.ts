import { assertTransition } from "../../shared/stateMachine.js";
import { StealResult } from "../../shared/types.js";
import { SessionState } from "./SessionState.js";
import { distance } from "./math.js";
import { BaseService } from "./BaseService.js";

export class StealService {
  constructor(
    private readonly state: SessionState,
    private readonly baseService: BaseService
  ) {}

  trySteal(thiefId: string, unitId: string): StealResult {
    const thief = this.state.players.get(thiefId);
    const unit = this.state.units.get(unitId);
    if (!thief || !unit) return { ok: false, reason: "invalid_target" };
    if (unit.currentState !== "OwnedPlaced") return { ok: false, reason: "not_stealable" };
    if (!unit.ownerPlayerId || unit.ownerPlayerId === thiefId) return { ok: false, reason: "own_unit" };
    if (thief.carriedUnitId) return { ok: false, reason: "already_carrying" };
    if (distance(thief.worldPosition, unit.worldPosition) > this.state.config.stealRange) {
      return { ok: false, reason: "too_far" };
    }

    const victimBase = unit.currentBaseId ? this.state.bases.get(unit.currentBaseId) : null;
    if (!victimBase) return { ok: false, reason: "invalid_target" };
    if (victimBase.protectionState.active) return { ok: false, reason: "base_protected" };

    assertTransition(unit.currentState, "BeingStolen", unit.unitInstanceId);
    unit.currentState = "BeingStolen";
    if (unit.slotIndex !== null) this.baseService.removeUnit(victimBase.baseId, unit.slotIndex);

    assertTransition(unit.currentState, "StolenCarried", unit.unitInstanceId);
    unit.currentState = "StolenCarried";
    unit.carryData = {
      thiefPlayerId: thiefId,
      startedAt: Date.now(),
      expiresAt: Date.now() + this.state.config.stealCarryTimeoutMs
    };
    thief.carriedUnitId = unitId;
    thief.statusFlags.carrying = true;
    thief.moveSpeed *= this.state.config.carryMoveSpeedMultiplier;

    const victim = this.state.players.get(unit.ownerPlayerId);
    if (victim) victim.sessionStats.stealsLost += 1;

    return { ok: true, unitId };
  }

  completeSteal(thiefId: string): { ok: boolean; reason?: string; unitId?: string } {
    const thief = this.state.players.get(thiefId);
    if (!thief || !thief.carriedUnitId) return { ok: false, reason: "no_unit" };

    const unit = this.state.units.get(thief.carriedUnitId);
    if (!unit || unit.currentState !== "StolenCarried") return { ok: false, reason: "invalid_target" };

    const thiefBaseId = thief.currentBaseId;
    if (!thiefBaseId) return { ok: false, reason: "no_base" };
    const thiefBase = this.state.bases.get(thiefBaseId);
    if (!thiefBase) return { ok: false, reason: "no_base" };

    if (distance(thief.worldPosition, thiefBase.dropOffZone) > this.state.config.dropOffRange) {
      return { ok: false, reason: "not_at_dropoff" };
    }

    const slot = this.baseService.findFreeSlot(thiefBase.baseId);
    if (slot === null) return { ok: false, reason: "no_free_slot" };

    this.clearCarryPenalty(thiefId);
    unit.ownerPlayerId = thiefId;
    unit.currentBaseId = thiefBase.baseId;
    unit.slotIndex = slot;
    unit.carryData = null;
    assertTransition(unit.currentState, "OwnedPlaced", unit.unitInstanceId);
    unit.currentState = "OwnedPlaced";
    this.baseService.placeUnit(thiefBase.baseId, slot, unit.unitInstanceId);

    thief.sessionStats.steals += 1;
    return { ok: true, unitId: unit.unitInstanceId };
  }

  interruptCarry(thiefId: string, reason: string): void {
    const thief = this.state.players.get(thiefId);
    if (!thief?.carriedUnitId) return;

    const unit = this.state.units.get(thief.carriedUnitId);
    this.clearCarryPenalty(thiefId);
    if (!unit) return;

    assertTransition(unit.currentState, "ReturningToOwner", unit.unitInstanceId);
    unit.currentState = "ReturningToOwner";

    const ownerId = unit.originalOwnerPlayerId;
    const owner = ownerId ? this.state.players.get(ownerId) : null;
    const ownerBaseId = owner?.currentBaseId ?? unit.originalBaseId;
    if (!ownerBaseId) {
      unit.currentState = "Destroyed";
      this.state.units.delete(unit.unitInstanceId);
      return;
    }

    const slot = this.baseService.findFreeSlot(ownerBaseId);
    if (slot === null) {
      unit.currentState = "Destroyed";
      this.state.units.delete(unit.unitInstanceId);
      return;
    }

    unit.ownerPlayerId = ownerId;
    unit.currentBaseId = ownerBaseId;
    unit.slotIndex = slot;
    unit.carryData = null;
    assertTransition(unit.currentState, "OwnedPlaced", unit.unitInstanceId);
    unit.currentState = "OwnedPlaced";
    this.baseService.placeUnit(ownerBaseId, slot, unit.unitInstanceId);
    // reason can be emitted to client through NetworkService event stream.
    void reason;
  }

  tickCarryTimeouts(now = Date.now()): void {
    for (const unit of this.state.units.values()) {
      if (unit.currentState === "StolenCarried" && unit.carryData && now >= unit.carryData.expiresAt) {
        this.interruptCarry(unit.carryData.thiefPlayerId, "carry_timeout");
      }
    }
  }

  private clearCarryPenalty(playerId: string): void {
    const thief = this.state.players.get(playerId);
    if (!thief) return;
    thief.carriedUnitId = null;
    thief.statusFlags.carrying = false;
    thief.moveSpeed = 7;
  }
}
