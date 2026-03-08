import { v4 as uuidv4 } from "uuid";
import { BaseData } from "../../shared/types.js";
import { SessionState } from "./SessionState.js";

export class BaseService {
  constructor(private readonly state: SessionState) {}

  initializeBases(count = 8): void {
    if (this.state.bases.size > 0) return;

    for (let i = 0; i < count; i++) {
      const baseId = `base_${i + 1}_${uuidv4().slice(0, 6)}`;
      const slots = this.state.config.baseInitialSlots;
      const angle = (2 * Math.PI * i) / count;
      const radius = 140;
      this.state.bases.set(baseId, {
        baseId,
        ownerPlayerId: null,
        slotCount: slots,
        occupiedSlots: Array(slots).fill(null),
        protectionState: { active: false, reason: "None" },
        protectionEndTime: 0,
        upgradeLevels: { slots: 0, shield: 0 },
        dropOffZone: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
        entryZone: { x: Math.cos(angle) * (radius - 10), y: Math.sin(angle) * (radius - 10) }
      });
    }
  }

  assignBase(playerId: string): BaseData {
    const free = [...this.state.bases.values()].find((b) => b.ownerPlayerId === null);
    if (!free) throw new Error("No free bases available");
    free.ownerPlayerId = playerId;
    free.protectionState = { active: true, reason: "JoinGrace" };
    free.protectionEndTime = Date.now() + this.state.config.protectionDurationMs;
    return free;
  }

  releaseBase(playerId: string): void {
    const base = [...this.state.bases.values()].find((b) => b.ownerPlayerId === playerId);
    if (!base) return;
    base.ownerPlayerId = null;
    base.occupiedSlots = Array(base.slotCount).fill(null);
    base.protectionState = { active: false, reason: "None" };
    base.protectionEndTime = 0;
  }

  findFreeSlot(baseId: string): number | null {
    const base = this.state.bases.get(baseId);
    if (!base) return null;
    for (let i = 0; i < base.slotCount; i++) {
      if (!base.occupiedSlots[i]) return i;
    }
    return null;
  }

  placeUnit(baseId: string, slot: number, unitId: string): void {
    const base = this.state.bases.get(baseId);
    if (!base) throw new Error("Base not found");
    if (slot >= base.slotCount) throw new Error("Invalid slot");
    base.occupiedSlots[slot] = unitId;
  }

  removeUnit(baseId: string, slot: number): void {
    const base = this.state.bases.get(baseId);
    if (!base) return;
    if (slot >= 0 && slot < base.slotCount) base.occupiedSlots[slot] = null;
  }

  tickProtection(now = Date.now()): void {
    for (const base of this.state.bases.values()) {
      if (base.protectionState.active && now >= base.protectionEndTime) {
        base.protectionState = { active: false, reason: "None" };
      }
    }
  }
}
