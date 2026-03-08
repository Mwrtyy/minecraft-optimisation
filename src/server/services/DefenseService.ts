import { SessionState } from "./SessionState.js";

export class DefenseService {
  constructor(private readonly state: SessionState) {}

  activateShield(playerId: string, durationMs: number): { ok: boolean; reason?: string } {
    const player = this.state.players.get(playerId);
    if (!player?.currentBaseId) return { ok: false, reason: "no_base" };
    const base = this.state.bases.get(player.currentBaseId);
    if (!base) return { ok: false, reason: "no_base" };

    base.protectionState = { active: true, reason: "ManualShield" };
    base.protectionEndTime = Date.now() + durationMs;
    return { ok: true };
  }
}
