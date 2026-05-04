from . import socketio
from flask_socketio import join_room, emit, leave_room
from flask import request


room_occupancy = {}
user_current_room = {}

@socketio.on('join_diagram')
def handle_join_diagram(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        join_room(diagram_id)
        user_current_room[request.sid] = diagram_id
        room_occupancy[diagram_id] = room_occupancy.get(diagram_id, 0) + 1
        print(f"✅ Cliente entrou na sala do diagrama: {diagram_id} (SID: {request.sid})")

        emit('STATE_REQUEST', {
            'diagram_id': diagram_id,
            'requester_sid': request.sid
        }, room=diagram_id, include_self=False)


@socketio.on('state_push')
def handle_state_push(data):
    requester_sid = data.get('requester_sid')
    if requester_sid:
        emit('STATE_SYNC', data, to=requester_sid)


@socketio.on('node_moved')
def handle_node_moved(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        emit('node_moved', data, room=diagram_id, include_self=False)


@socketio.on('disconnect')
def handle_disconnect():
    diagram_id = user_current_room.get(request.sid)

    if diagram_id:
        leave_room(diagram_id)

        if diagram_id in room_occupancy:
            room_occupancy[diagram_id] -= 1
            print(f"👋 Cliente saiu. Pessoas restantes na sala {diagram_id}: {room_occupancy[diagram_id]}")

            if room_occupancy[diagram_id] <= 0:
                print(f"🧹 A sala {diagram_id} ficou vazia! Limpando conexões do Kafka...")
                del room_occupancy[diagram_id]
        del user_current_room[request.sid]