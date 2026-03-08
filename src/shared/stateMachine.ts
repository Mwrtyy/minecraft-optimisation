import { UnitState } from "./types.js";

const transitions: Record<UnitState, UnitState[]> = {
  NeutralOnLane: ["ReservedForPurchase", "Despawning", "Destroyed"],
  ReservedForPurchase: ["ClaimedTransitToBase", "NeutralOnLane", "Destroyed"],
  ClaimedTransitToBase: ["OwnedPlaced", "Destroyed"],
  OwnedPlaced: ["BeingStolen", "Destroyed"],
  BeingStolen: ["StolenCarried", "ReturningToOwner", "OwnedPlaced", "Destroyed"],
  StolenCarried: ["OwnedPlaced", "ReturningToOwner", "Destroyed"],
  ReturningToOwner: ["OwnedPlaced", "Destroyed"],
  Despawning: ["Destroyed"],
  Destroyed: []
};

export function canTransition(from: UnitState, to: UnitState): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: UnitState, to: UnitState, unitId: string): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid unit state transition ${from} -> ${to} for unit ${unitId}`);
  }
}

export function getTransitionTable(): Record<UnitState, UnitState[]> {
  return transitions;
}
