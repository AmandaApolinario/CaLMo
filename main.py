from src import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # The Kafka consumer is started inside create_app() so it also runs under
    # gunicorn; no need to launch it here.
    try:
        socketio.run(app, debug=True, port=5001, host='0.0.0.0', use_reloader=False, allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"Error starting the application: {e}")
