import json
import os
import uuid
import traceback
from datetime import datetime

from confluent_kafka import Consumer
from src import socketio, db
from src.models.entities import CLDHistory, Variable

pending_diagram_changes = {}
KAFKA_BOOTSTRAP = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka1:29092,kafka2:29093,kafka3:29094')

def get_node_name(app, node_id):
    with app.app_context():
        var = db.session.query(Variable).filter_by(id=node_id).first()
        return var.name if var else "Unknown Variable"


def _handle_message(app, msg):
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
        # A removed node takes its edges with it. Drop any session-added edges
        # touching it so a relationship involving a node that no longer exists
        # is not reported as "New Relationship". This keeps the history as the
        # NET change at save time (a variable created and deleted in the same
        # session — and its edges — cancels out entirely).
        changes['edges_added'] = {
            eid: e for eid, e in changes['edges_added'].items()
            if e.get('source') != node_id and e.get('target') != node_id
        }

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
            # Skip removals that carry no endpoint metadata (would render as
            # "Unknown Variable -> Unknown Variable, UNKNOWN" and just add noise).
            if not edata.get('source') and not edata.get('target'):
                continue
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

    socketio.emit('DIAGRAM_EVENT', event_data, room=diagram_id)


def kafka_consumer_worker(app):
    # Supervisor loop: this consumer runs in an unsupervised daemon thread, so a
    # single transient broker error (poll() raising, connection drop) used to
    # kill it permanently — silently stopping history writes. Recreate the
    # consumer and keep going instead.
    while True:
        consumer = None
        try:
            consumer = Consumer({
                'bootstrap.servers': KAFKA_BOOTSTRAP,
                'group.id': 'flask_websocket_group',
                'auto.offset.reset': 'latest'
            })
            consumer.subscribe(['diagram_events'])
            print("✅ Kafka consumer subscribed to 'diagram_events'", flush=True)

            with app.app_context():
                while True:
                    # poll(0) is non-blocking: a blocking poll() would freeze
                    # the eventlet hub (and thus the whole server). We yield
                    # with socketio.sleep() so the web server keeps running.
                    msg = consumer.poll(0)
                    if msg is None:
                        socketio.sleep(0.5)
                        continue
                    if msg.error():
                        continue
                    try:
                        _handle_message(app, msg)
                    except Exception as e:
                        db.session.rollback()
                        traceback.print_exc()
                        print(f"Erro ao processar mensagem Kafka: {e}", flush=True)
        except Exception as e:
            traceback.print_exc()
            print(f"Kafka consumer crashed, restarting in 5s: {e}", flush=True)
            socketio.sleep(5)
        finally:
            if consumer is not None:
                try:
                    consumer.close()
                except Exception:
                    pass
