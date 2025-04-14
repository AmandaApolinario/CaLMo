from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
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
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"Database initialization error: {e}")
    
        from .routes import routes
        app.register_blueprint(routes)
    
    @app.errorhandler(500)
    def handle_500(e):
        return {"error": "Internal Server Error"}, 500
    
    @app.errorhandler(404)
    def handle_404(e):
        return {"error": "Not Found"}, 404
    
    return app
