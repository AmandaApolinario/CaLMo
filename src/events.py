from . import socketio
from flask_socketio import join_room


@socketio.on('join_diagram')
def handle_join_diagram(data):
    diagram_id = data.get('diagram_id')
    if diagram_id:
        join_room(diagram_id)
        print(f"✅ Cliente entrou na sala do diagrama: {diagram_id}")