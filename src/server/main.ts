import { GameConfigService } from "./services/GameConfigService.js";
import { createSessionState } from "./services/SessionState.js";
import { SessionManager } from "./services/SessionManager.js";
import { NetworkService } from "./services/NetworkService.js";

const config = GameConfigService.load();
const state = createSessionState(config);
const session = new SessionManager(state);
const network = new NetworkService(session, Number(process.env.PORT ?? 8080));

network.start();
console.log("Authoritative game server running on ws://localhost:8080");
