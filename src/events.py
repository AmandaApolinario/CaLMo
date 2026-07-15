from .services.kafka_consumer import pending_diagram_changes
from . import socketio
from flask_socketio import join_room, emit, leave_room
from flask import request
from .services.kafka_producer import kafka_producer


room_occupancy = {}
user_current_room = {}

@socketio.on('JOIN_DIAGRAM')
def handle_join_diagram(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        join_room(diagram_id)
        user_current_room[request.sid] = diagram_id
        room_occupancy[diagram_id] = room_occupancy.get(diagram_id, 0) + 1

        emit('STATE_REQUEST', {
            'diagram_id': diagram_id,
            'requester_sid': request.sid
        },to=diagram_id, include_self=False)


@socketio.on('STATE_PUSH')
def handle_state_push(data):
    requester_sid = data.get('requester_sid')
    if requester_sid:
        emit('STATE_SYNC', data, to=requester_sid)


@socketio.on('NODE_MOVED')
def handle_node_moved(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        emit('NODE_MOVED', data, include_self=False)


@socketio.on('DISCONNECT')
def handle_disconnect():
    diagram_id = user_current_room.get(request.sid)

    if diagram_id:
        leave_room(diagram_id)

        if diagram_id in room_occupancy:
            room_occupancy[diagram_id] -= 1

            if room_occupancy[diagram_id] <= 0:
                if diagram_id in pending_diagram_changes:
                    del pending_diagram_changes[diagram_id]

                del room_occupancy[diagram_id]

        if request.sid in user_current_room:
            del user_current_room[request.sid]

@socketio.on('DIAGRAM_EVENT')
def handle_diagram_event(payload):
    diagram_id = payload.get('diagram_id')
    action = payload.get('action')
    data = payload.get('data')

    if diagram_id:
        kafka_producer.publish_event(
            diagram_id=diagram_id,
            user_id=data.get('clientId', 'unknown'),
            action_type=action,
            payload=data
        )
