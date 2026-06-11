import json
import uuid
from datetime import datetime

from confluent_kafka import Consumer
from src import socketio, db
from src.models.entities import CLDHistory, Variable

pending_diagram_changes = {}

def get_node_name(app, node_id):
    with app.app_context():
        var = db.session.query(Variable).filter_by(id=node_id).first()
        return var.name if var else "Unknown Variable"

def kafka_consumer_worker(app):
    consumer = Consumer({
        'bootstrap.servers': 'kafka:29092',
        'group.id': 'flask_websocket_group',
        'auto.offset.reset': 'latest'
    })
    consumer.subscribe(['diagram_events'])

    with app.app_context():
        while True:
            msg = consumer.poll(1.0)
            if msg is None: continue
            if msg.error(): continue

            try:
                diagram_id = msg.key().decode('utf-8')
                event_data = json.loads(msg.value().decode('utf-8'))

                action = event_data.get('action_type') or event_data.get('action')
                payload = event_data.get('payload') or event_data.get('data') or {}
                user_id = event_data.get('user_id') or payload.get('clientId')

                if diagram_id not in pending_diagram_changes:
                    pending_diagram_changes[diagram_id] = {
                        'nodes_added': {}, 'nodes_removed': {},
                        'edges_added': {}, 'edges_removed': {}
                    }

                changes = pending_diagram_changes[diagram_id]

                if action == 'NODE_ADDED':
                    node = payload.get('node', {})
                    node_id = node.get('id')
                    if node_id in changes['nodes_removed']:
                        del changes['nodes_removed'][node_id]
                    else:
                        changes['nodes_added'][node_id] = node.get('name', node.get('label', 'Unknown Variable'))

                elif action == 'NODE_REMOVED':
                    node_id = payload.get('nodeId')
                    if node_id in changes['nodes_added']:
                        del changes['nodes_added'][node_id]
                    else:
                        changes['nodes_removed'][node_id] = "Unknown Variable"

                elif action == 'EDGE_ADDED':
                    edge = payload.get('edge', {})
                    edge_id = edge.get('id')
                    if edge_id in changes['edges_removed']:
                        del changes['edges_removed'][edge_id]
                    else:
                        changes['edges_added'][edge_id] = edge

                elif action == 'EDGE_REMOVED':
                    edge_id = payload.get('edgeId')
                    if edge_id in changes['edges_added']:
                        del changes['edges_added'][edge_id]
                    else:
                        changes['edges_removed'][edge_id] = payload

                elif action == 'DIAGRAM_SAVED':
                    summary_lines = []

                    for nid, nname in changes['nodes_added'].items():
                        summary_lines.append(f"Variable Added: {nname}")

                    for nid, nname in changes['nodes_removed'].items():
                        name = nname if nname != "Unknown Variable" else get_node_name(app, nid)
                        summary_lines.append(f"Variable Removed: {name}")

                    for eid, edata in changes['edges_added'].items():
                        src = get_node_name(app, edata.get('source'))
                        tgt = get_node_name(app, edata.get('target'))
                        pol = str(edata.get('polarity', 'UNKNOWN')).upper()
                        summary_lines.append(f"New Relationship: {src} -> {tgt}, {pol}")

                    for eid, edata in changes['edges_removed'].items():
                        src = get_node_name(app, edata.get('source'))
                        tgt = get_node_name(app, edata.get('target'))
                        pol = str(edata.get('polarity', 'UNKNOWN')).upper()
                        summary_lines.append(f"Removed Relationship: {src} -> {tgt}, {pol}")

                    if not summary_lines:
                        summary_lines.append("General update and repositioning.")

                    summary_text = "\n".join(summary_lines)

                    if user_id:
                        history_entry = CLDHistory(
                            id=str(uuid.uuid4()),
                            cld_id=diagram_id,
                            user_id=user_id,
                            action_summary=summary_text,
                            timestamp=datetime.utcnow()
                        )
                        db.session.add(history_entry)
                        db.session.commit()

                    pending_diagram_changes[diagram_id] = {
                        'nodes_added': {}, 'nodes_removed': {},
                        'edges_added': {}, 'edges_removed': {}
                    }

                socketio.emit('diagram_event', event_data, room=diagram_id)
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Erro ao processar mensagem Kafka: {e}")

    consumer.close()