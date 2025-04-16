from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import text
import os

load_dotenv()

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # Configure CORS with specific settings
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://app:postgres@db:5432/app"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        # Import models to ensure they are registered with SQLAlchemy
        from . import models
        
        # Create all tables
        try:
            # Drop existing enum types if they exist
            db.session.execute(text('DROP TYPE IF EXISTS relationship_type CASCADE'))
            db.session.execute(text('DROP TYPE IF EXISTS loop_type CASCADE'))
            db.session.execute(text('DROP TYPE IF EXISTS archetype_type CASCADE'))
            db.session.commit()
            
            # Create enum types
            db.session.execute(text('CREATE TYPE relationship_type AS ENUM (\'POSITIVE\', \'NEGATIVE\')'))
            db.session.execute(text('CREATE TYPE loop_type AS ENUM (\'BALANCING\', \'REINFORCING\')'))
            db.session.execute(text('CREATE TYPE archetype_type AS ENUM (\'SHIFTING_THE_BURDEN\')'))
            db.session.commit()
            
            # Drop all existing tables
            db.drop_all()
            
            # Create all tables
            db.create_all()
            print("Database tables created successfully!")
        except Exception as e:
            print(f"Database initialization error: {e}")
            db.session.rollback()
            raise e
    
        from .routes import routes
        app.register_blueprint(routes)
    
    @app.errorhandler(500)
    def handle_500(e):
        return {"error": "Internal Server Error"}, 500
    
    @app.errorhandler(404)
    def handle_404(e):
        return {"error": "Not Found"}, 404
    
    return app
