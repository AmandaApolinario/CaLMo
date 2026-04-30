from . import socketio
from flask_socketio import join_room

from . import socketio
from flask_socketio import join_room, emit
from flask import request


@socketio.on('join_diagram')
def handle_join_diagram(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        join_room(diagram_id)
        print(f"✅ Cliente entrou na sala do diagrama: {diagram_id} (SID: {request.sid})")

        # 1. Quando alguém entra, avisa aos outros da sala para enviarem o estado atual em memória
        emit('STATE_REQUEST', {
            'diagram_id': diagram_id,
            'requester_sid': request.sid
        }, room=diagram_id, include_self=False)


@socketio.on('state_push')
def handle_state_push(data):
    requester_sid = data.get('requester_sid')
    if requester_sid:
        # 2. Direciona o estado em memória (recebido de um cliente ativo) para quem acabou de entrar
        emit('STATE_SYNC', data, to=requester_sid)


@socketio.on('node_moved')
def handle_node_moved(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        # 3. Propaga a posição (x,y) de um nó arrastado para atualizar a tela dos outros em tempo real
        emit('node_moved', data, room=diagram_id, include_self=False)