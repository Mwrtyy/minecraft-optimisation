import { getTransitionTable } from "../../shared/stateMachine.js";
import { ClaimResult, StealResult } from "../../shared/types.js";
import { BaseService } from "./BaseService.js";
import { DefenseService } from "./DefenseService.js";
import { EconomyService } from "./EconomyService.js";
import { PersistenceService } from "./PersistenceService.js";
import { PlayerDataService } from "./PlayerDataService.js";
import { SessionState } from "./SessionState.js";
import { SpawnService } from "./SpawnService.js";
import { StealService } from "./StealService.js";
import { UnitService } from "./UnitService.js";

export class SessionManager {
  private readonly baseService: BaseService;
  private readonly playerDataService: PlayerDataService;
  private readonly unitService: UnitService;
  private readonly spawnService: SpawnService;
  private readonly economyService: EconomyService;
  private readonly stealService: StealService;
  private readonly defenseService: DefenseService;
  private readonly persistenceService: PersistenceService;

  private lastTick = Date.now();

  constructor(private readonly state: SessionState) {
    this.baseService = new BaseService(state);
    this.baseService.initializeBases(8);
    this.playerDataService = new PlayerDataService(state, this.baseService);
    this.unitService = new UnitService(state, this.baseService, this.playerDataService);
    this.spawnService = new SpawnService(state, this.unitService);
    this.economyService = new EconomyService(state);
    this.stealService = new StealService(state, this.baseService);
    this.defenseService = new DefenseService(state);
    this.persistenceService = new PersistenceService(state);

    setInterval(() => this.tick(), 100);
    setInterval(() => this.persistenceService.save(), 15000);
  }

  handleJoin(displayName: string): string {
    const player = this.playerDataService.createPlayer(displayName);
    return player.playerId;
  }

  handleDisconnect(playerId: string): void {
    this.stealService.interruptCarry(playerId, "disconnect");
    this.playerDataService.removePlayer(playerId);
    this.persistenceService.save();
  }

  handleClientAction(playerId: string, msg: Record<string, unknown>): Record<string, unknown> {
    switch (msg.type) {
      case "move": {
        const p = this.state.players.get(playerId);
        if (!p) return { type: "move_result", ok: false };
        const x = Number(msg.x ?? p.worldPosition.x);
        const y = Number(msg.y ?? p.worldPosition.y);
        this.playerDataService.setPosition(playerId, x, y);
        return { type: "move_result", ok: true };
      }
      case "claim": {
        const result: ClaimResult = this.unitService.tryClaimUnit(playerId, String(msg.unitId));
        return { type: "claim_result", ...result };
      }
      case "steal": {
        const result: StealResult = this.stealService.trySteal(playerId, String(msg.unitId));
        return { type: "steal_result", ...result };
      }
      case "dropoff": {
        return { type: "dropoff_result", ...this.stealService.completeSteal(playerId) };
      }
      case "activate_shield": {
        return { type: "shield_result", ...this.defenseService.activateShield(playerId, 15000) };
      }
      case "interrupt_carry": {
        this.stealService.interruptCarry(playerId, "tagged");
        return { type: "interrupt_result", ok: true };
      }
      default:
        return { type: "error", message: "unknown_action" };
    }
  }

  snapshotFor(playerId: string): Record<string, unknown> {
    return {
      me: this.state.players.get(playerId),
      bases: [...this.state.bases.values()],
      units: [...this.state.units.values()],
      transitions: getTransitionTable()
    };
  }

  publicSnapshot(): Record<string, unknown> {
    return {
      players: [...this.state.players.values()].map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        currentCurrency: p.currentCurrency,
        currentBaseId: p.currentBaseId,
        carriedUnitId: p.carriedUnitId,
        worldPosition: p.worldPosition,
        moveSpeed: p.moveSpeed
      })),
      bases: [...this.state.bases.values()],
      units: [...this.state.units.values()]
    };
  }

  private tick(): void {
    const now = Date.now();
    const delta = (now - this.lastTick) / 1000;
    this.lastTick = now;

    this.spawnService.tick(now);
    this.unitService.tickLaneMovement(delta);
    this.economyService.tickIncome(delta);
    this.baseService.tickProtection(now);
    this.stealService.tickCarryTimeouts(now);
  }
}
