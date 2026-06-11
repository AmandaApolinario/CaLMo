import { webSocketService } from '@/services/websocket.service';

export const publishDiagramEvent = (diagramId, action, data) => {
    webSocketService.emitDiagramEvent(diagramId, action, data);
    return Promise.resolve({ status: "broadcast_sent_via_ws" });
};