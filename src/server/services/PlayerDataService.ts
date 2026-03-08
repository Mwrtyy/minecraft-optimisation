import { v4 as uuidv4 } from "uuid";
import { PlayerData } from "../../shared/types.js";
import { SessionState } from "./SessionState.js";
import { BaseService } from "./BaseService.js";

export class PlayerDataService {
  constructor(
    private readonly state: SessionState,
    private readonly baseService: BaseService
  ) {}

  createPlayer(displayName: string): PlayerData {
    const playerId = uuidv4();
    const base = this.baseService.assignBase(playerId);
    const player: PlayerData = {
      playerId,
      displayName,
      currentCurrency: this.state.config.starterCurrency,
      permanentUpgrades: {},
      currentBaseId: base.baseId,
      carriedUnitId: null,
      statusFlags: { disconnected: false, carrying: false },
      sessionStats: { claims: 0, steals: 0, stealsLost: 0, passiveIncomeEarned: 0 },
      worldPosition: { ...base.entryZone },
      moveSpeed: 7
    };
    this.state.players.set(playerId, player);
    return player;
  }

  removePlayer(playerId: string): void {
    this.state.players.delete(playerId);
    this.baseService.releaseBase(playerId);
  }

  addCurrency(playerId: string, amount: number): void {
    const player = this.state.players.get(playerId);
    if (!player) return;
    player.currentCurrency += amount;
  }

  trySpendCurrency(playerId: string, amount: number): boolean {
    const player = this.state.players.get(playerId);
    if (!player || player.currentCurrency < amount) return false;
    player.currentCurrency -= amount;
    return true;
  }
}
