from src import create_app

app = create_app()

if __name__ == '__main__':
    try:
        app.run(debug=True, port=5001, host='0.0.0.0')
    except Exception as e:
        print(f"Error starting the application: {e}")
