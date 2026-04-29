import json
from confluent_kafka import Producer

class KafkaProducerService:
    def __init__(self):
        self.producer = Producer({
            'bootstrap.servers': 'kafka:29092'
        })

    def publish_event(self, diagram_id, user_id, action_type, payload):
        event = {
            "user_id": user_id,
            "action": action_type,
            "data": payload
        }
        self.producer.produce(
            topic='diagram_events',
            key=str(diagram_id),
            value=json.dumps(event).encode('utf-8')
        )
        self.producer.flush()

kafka_producer = KafkaProducerService()