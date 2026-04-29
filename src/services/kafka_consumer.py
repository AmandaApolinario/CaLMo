import json
from confluent_kafka import Consumer
from src import socketio

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
                socketio.emit('diagram_event', event_data, room=diagram_id)
            except Exception as e:
                print(f"Erro ao processar mensagem Kafka: {e}")

    consumer.close()