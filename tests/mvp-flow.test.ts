import test from "node:test";
import assert from "node:assert/strict";
import { GameConfigService } from "../src/server/services/GameConfigService.js";
import { createSessionState } from "../src/server/services/SessionState.js";
import { BaseService } from "../src/server/services/BaseService.js";
import { PlayerDataService } from "../src/server/services/PlayerDataService.js";
import { UnitService } from "../src/server/services/UnitService.js";
import { StealService } from "../src/server/services/StealService.js";

function setup() {
  const config = GameConfigService.load();
  const state = createSessionState(config);
  const baseService = new BaseService(state);
  baseService.initializeBases(4);
  const players = new PlayerDataService(state, baseService);
  const units = new UnitService(state, baseService, players);
  const steals = new StealService(state, baseService);
  return { state, baseService, players, units, steals };
}

test("simultaneous claims only allow first winner", () => {
  const { state, players, units } = setup();
  const p1 = players.createPlayer("A");
  const p2 = players.createPlayer("B");
  p1.currentCurrency = 9999;
  p2.currentCurrency = 9999;

  const def = state.config.unitDefinitions[0];
  const unit = units.spawnNeutral(def);
  p1.worldPosition = { ...unit.worldPosition };
  p2.worldPosition = { ...unit.worldPosition };

  const r1 = units.tryClaimUnit(p1.playerId, unit.unitInstanceId);
  const r2 = units.tryClaimUnit(p2.playerId, unit.unitInstanceId);

  assert.equal(r1.ok, true);
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, "already_claimed");
});

test("carry interruption returns unit to original owner", () => {
  const { state, baseService, players, units, steals } = setup();
  const owner = players.createPlayer("Owner");
  const thief = players.createPlayer("Thief");
  owner.currentCurrency = 9999;

  const def = state.config.unitDefinitions[0];
  const unit = units.spawnNeutral(def);
  owner.worldPosition = { ...unit.worldPosition };
  assert.equal(units.tryClaimUnit(owner.playerId, unit.unitInstanceId).ok, true);

  const claimed = state.units.get(unit.unitInstanceId)!;
  const ownerBase = state.bases.get(owner.currentBaseId!)!;
  ownerBase.protectionState.active = false;

  thief.worldPosition = { ...claimed.worldPosition };
  assert.equal(steals.trySteal(thief.playerId, claimed.unitInstanceId).ok, true);

  steals.interruptCarry(thief.playerId, "disconnect");
  const returned = state.units.get(claimed.unitInstanceId)!;

  assert.equal(returned.currentState, "OwnedPlaced");
  assert.equal(returned.ownerPlayerId, owner.playerId);
  assert.ok(baseService.findFreeSlot(ownerBase.baseId) !== null || ownerBase.occupiedSlots.includes(returned.unitInstanceId));
});
