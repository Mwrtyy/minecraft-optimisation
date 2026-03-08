# Contested Public Spawn + Passive Income + PvP Stealing (Multiplayer MVP)

## Chosen stack
- **Language**: TypeScript
- **Networking**: `ws` WebSocket server
- **Runtime**: Node.js 20+
- **Reason**: fastest way to ship a server-authoritative multiplayer simulation with strict state machine validation, deterministic service boundaries, and config-driven balancing in one repository.

---

## 1) Concise technical overview
The MVP is a **server-authoritative session game**. Clients only send intent actions (`claim`, `steal`, `dropoff`, `move`). The server validates everything (distance, money, ownership, state transitions) and owns all source-of-truth state.

Core server loop:
1. `SpawnService` spawns neutral units in lane by weighted rarity.
2. `UnitService` moves lane units and handles claim-buy flow.
3. `EconomyService` pays passive income from `OwnedPlaced` units.
4. `StealService` runs steal, carry penalties, dropoff completion, and interruptions (including disconnect).
5. `BaseService` manages slots and protection lifecycle.
6. `NetworkService` streams snapshots and action results.

Persistence is atomic JSON writes of player progression (currency/upgrades). Session units reset on restart by design for fair round flow.

---

## 2) Recommended project/folder structure

```txt
/workspace/minecraft-optimisation
├─ config/
│  └─ game-config.json
├─ data/
│  └─ player-save.json (generated)
├─ src/
│  ├─ shared/
│  │  ├─ types.ts
│  │  └─ stateMachine.ts
│  └─ server/
│     ├─ main.ts
│     └─ services/
│        ├─ GameConfigService.ts
│        ├─ SessionState.ts
│        ├─ SessionManager.ts
│        ├─ NetworkService.ts
│        ├─ SpawnService.ts
│        ├─ LaneMovement (inside UnitService.tickLaneMovement)
│        ├─ UnitService.ts
│        ├─ BaseService.ts
│        ├─ EconomyService.ts
│        ├─ StealService.ts
│        ├─ DefenseService.ts
│        ├─ PlayerDataService.ts
│        ├─ PersistenceService.ts
│        └─ math.ts
├─ tests/
│  └─ mvp-flow.test.ts
└─ index.html (debug client UX)
```

---

## 3) Data model
Implemented in `src/shared/types.ts`:

- `PlayerData`
  - `playerId`, `displayName`, `currentCurrency`, `permanentUpgrades`, `currentBaseId`, `carriedUnitId`, `statusFlags`, `sessionStats`, `worldPosition`, `moveSpeed`
- `BaseData`
  - `baseId`, `ownerPlayerId`, `slotCount`, `occupiedSlots`, `protectionState`, `protectionEndTime`, `upgradeLevels`, `dropOffZone`, `entryZone`
- `UnitData`
  - `unitInstanceId`, `definitionId`, `displayName`, `rarity`, `ownerPlayerId`, `originalOwnerPlayerId`, `currentState`, `currentBaseId`, `originalBaseId`, `slotIndex`, `incomePerSecond`, `stealDifficulty`, `worldPosition`, `spawnedAtTime`, `reservedByPlayerId`, `carryData`
- `GameConfig`
  - all balancing knobs (starter money, ranges, spawn interval, tick rates, carry penalties, unit defs, upgrade costs)

---

## 4) Unit state machine + transition table
Implemented in `src/shared/stateMachine.ts` and enforced by `assertTransition(...)`.

| From | Allowed to |
|---|---|
| NeutralOnLane | ReservedForPurchase, Despawning, Destroyed |
| ReservedForPurchase | ClaimedTransitToBase, NeutralOnLane, Destroyed |
| ClaimedTransitToBase | OwnedPlaced, Destroyed |
| OwnedPlaced | BeingStolen, Destroyed |
| BeingStolen | StolenCarried, ReturningToOwner, OwnedPlaced, Destroyed |
| StolenCarried | OwnedPlaced, ReturningToOwner, Destroyed |
| ReturningToOwner | OwnedPlaced, Destroyed |
| Despawning | Destroyed |
| Destroyed | *(none)* |

Invalid transitions throw and are visible in server logs.

---

## 5) Networking design

**Transport**: WebSocket (`ws://localhost:8080`).

**Client -> server intents**:
- `join`
- `move {x,y}`
- `claim {unitId}`
- `steal {unitId}`
- `dropoff`
- `activate_shield`
- `interrupt_carry` (debug/testing)

**Server -> client events**:
- `joined`
- `claim_result`
- `steal_result`
- `dropoff_result`
- `shield_result`
- `tick {snapshot}`

Authority boundaries:
- Client never dictates money, ownership, or state changes.
- Server validates distance, currency, target state, base protection, slot availability, carry constraints.
- Server resolves race collisions: first successful claim mutates state to non-neutral; later claims fail cleanly.

---

## 6) Step-by-step implementation order
1. Shared models + unit state machine.
2. Session state container + config loading.
3. Base + player assignment services.
4. Spawn/lane movement + claim purchase flow.
5. Economy tick.
6. Steal/carry/interrupt/dropoff flow.
7. Defense shield hooks.
8. Networking gateway + action routing.
9. Persistence autosave + save-on-disconnect.
10. Debug client UI + integration tests.

---

## 7) Full code for MVP systems
All code is in:
- `src/shared/*.ts`
- `src/server/main.ts`
- `src/server/services/*.ts`
- `config/game-config.json`
- `index.html`
- `tests/mvp-flow.test.ts`

This repository now contains runnable, typed implementation code (not pseudocode).

---

## 8) How modules connect
- `main.ts` boots config -> session state -> `SessionManager` -> `NetworkService`.
- `SessionManager` orchestrates ticks and routes client actions to services.
- `SpawnService` creates neutral units via `UnitService.spawnNeutral`.
- `UnitService` handles lane progression and claim pipeline.
- `StealService` handles theft lifecycle and disconnect-safe return.
- `EconomyService` credits income from owned placed units.
- `BaseService` is sole owner of slot/protection/base assignment logic.
- `PersistenceService` snapshots player progression atomically.

---

## 9) Local testing

### Install + run
```bash
npm install
npm run build
npm run test
npm run dev
```

Open `index.html` in browser and connect to local ws server. Use two browser tabs for PvP testing:
- both `join`
- claim neutral lane units
- steal from enemy owned unit
- use `dropoff` to complete steal
- use `interrupt` to force return path

### Included automated tests
- claim race condition (only first wins)
- disconnect/interrupt returns stolen unit to owner

---

## 10) Next features after MVP
1. Replace debug move with server-side navmesh pathing + anti-teleport velocity checks.
2. Add fog-of-war scouting and stronger thief reveal UX.
3. Add true lane path splines + world colliders.
4. Add base upgrades: slot expansion, shield duration, income multiplier.
5. Add event spawn pool scheduler (global events + announcements).
6. Replace JSON persistence with Postgres/Redis + optimistic locking.
7. Add replayable matchmaker + MMR-ranked sessions.
8. Add anti-cheat telemetry: impossible interaction distances, suspicious action frequency.
9. Add combat tags/stuns to interruption rules.
10. Add bot load-test clients for balancing and soak tests.
