import { WebSocketServer, WebSocket } from "ws";
import { SessionManager } from "./SessionManager.js";

interface ClientMsg {
  type: string;
  [k: string]: unknown;
}

export class NetworkService {
  private wss: WebSocketServer;

  constructor(private readonly session: SessionManager, port = 8080) {
    this.wss = new WebSocketServer({ port });
  }

  start(): void {
    this.wss.on("connection", (socket) => {
      let playerId: string | null = null;

      socket.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as ClientMsg;

          if (msg.type === "join") {
            playerId = this.session.handleJoin(String(msg.displayName ?? "Player"));
            this.send(socket, { type: "joined", playerId, snapshot: this.session.snapshotFor(playerId) });
            return;
          }

          if (!playerId) return;
          const response = this.session.handleClientAction(playerId, msg);
          this.send(socket, response);
        } catch (error) {
          this.send(socket, { type: "error", message: String(error) });
        }
      });

      socket.on("close", () => {
        if (playerId) this.session.handleDisconnect(playerId);
      });
    });

    setInterval(() => {
      const snapshot = this.session.publicSnapshot();
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          this.send(client, { type: "tick", snapshot });
        }
      }
    }, 250);
  }

  private send(socket: WebSocket, payload: unknown): void {
    socket.send(JSON.stringify(payload));
  }
}
