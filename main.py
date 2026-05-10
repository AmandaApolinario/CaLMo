import pydevd_pycharm

from src import create_app, socketio
import threading
from src.services.kafka_consumer import kafka_consumer_worker

app = create_app()

if __name__ == '__main__':
    pydevd_pycharm.settrace('host.docker.internal', port=5679, stdout_to_server=True, stderr_to_server=True, suspend=False)
    threading.Thread(target=kafka_consumer_worker, args=(app,), daemon=True).start()
    try:
        socketio.run(app, debug=True, port=5001, host='0.0.0.0', use_reloader=False, allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"Error starting the application: {e}")
