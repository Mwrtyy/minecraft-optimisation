import { SessionState } from "./SessionState.js";

export class EconomyService {
  constructor(private readonly state: SessionState) {}

  tickIncome(deltaSeconds: number): void {
    for (const unit of this.state.units.values()) {
      if (unit.currentState !== "OwnedPlaced" || !unit.ownerPlayerId) continue;
      const owner = this.state.players.get(unit.ownerPlayerId);
      if (!owner) continue;
      const gained = unit.incomePerSecond * deltaSeconds;
      owner.currentCurrency += gained;
      owner.sessionStats.passiveIncomeEarned += gained;
    }
  }
}
