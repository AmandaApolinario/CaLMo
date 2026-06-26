import { io } from "socket.io-client";
import { ref } from "vue";

class WebSocketService {
    constructor() {
        this.socket = null;
        this.connected = ref(false);
    }

    /** Connects to the Flask-SocketIO server */
    connect(userId) {
        if (this.socket) return;

        this.socket = io("http://localhost:5001", {
            transports: ["websocket"],
            query: { userId }
        });

        this.socket.on("CONNECT", () => {
            this.connected.value = true;
        });

        this.socket.on("DISCONNECT", () => {
            this.connected.value = false;
        });
    }

    /** Join a diagram collaboration room */
    joinDiagram(diagramId) {
        if (!this.socket) return;
        this.socket.emit("JOIN_DIAGRAM", { diagram_id: diagramId });
    }


    /**
     * Respond to a STATE_REQUEST from the server by pushing the current
     * canvas state so the new joiner can reconstruct it.
     */
    pushStateTo(diagramId, state, requesterSid) {
        if (!this.socket) return;
        this.socket.emit("STATE_PUSH", {
            diagram_id: diagramId,
            state,
            requester_sid: requesterSid
        });
    }

    /**
     * Emit a node move — goes directly through WebSocket (not Kafka) to
     * keep drag interactions snappy.
     * position = { x: number, y: number }
     */
    emitNodeMoved(diagramId, nodeId, position, clientId) {
        if (!this.socket) return;
        this.socket.emit("NODE_MOVED", {
            diagram_id: diagramId,
            node_id: nodeId,
            position,
            client_id: clientId
        });
    }

    // ─── Listeners ───────────────────────────────────────────────────────────

    /** Kafka-driven diagram events (NODE_ADDED, EDGE_ADDED, …) */
    onDiagramEvent(callback) {
        if (!this.socket) return;
        this.socket.on("DIAGRAM_EVENT", callback);
    }

    /** Server sends full canvas state snapshot to a new joiner */
    onStateSync(callback) {
        if (!this.socket) return;
        this.socket.on("STATE_SYNC", callback);
    }

    /**
     * Server asks existing participants to push state so a new joiner
     * can be synchronised.  data = { diagram_id, requester_sid }
     */
    onStateRequest(callback) {
        if (!this.socket) return;
        this.socket.on("STATE_REQUEST", callback);
    }

    /** Real-time node drag position updates from other clients */
    onNodeMoved(callback) {
        if (!this.socket) return;
        this.socket.on("NODE_MOVED", callback);
    }

    /** Remove all collaboration listeners (call before disconnect) */
    offAll() {
        if (!this.socket) return;
        ["DIAGRAM_EVENT", "STATE_SYNC", "STATE_REQUEST", "NODE_MOVED"]
            .forEach(ev => this.socket.off(ev));
    }

    disconnect() {
        if (this.socket) {
            this.offAll();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emitDiagramEvent(diagramId, action, data) {
        if (!this.socket) return;
        this.socket.emit("DIAGRAM_EVENT", {
            diagram_id: diagramId,
            action: action,
            data: data
        });
    }
}

export const webSocketService = new WebSocketService();