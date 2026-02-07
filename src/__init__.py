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
        from .models.entities import (
            User, Variable, CLD, Relationship, FeedbackLoop, Archetype,
            RelationshipType, LoopType, ArchetypeType
        )

        try:
            # Cria os tipos ENUM apenas se ainda não existirem (no schema public)
            db.session.execute(text("""
            DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'relationship_type' AND n.nspname = 'public'
            ) THEN
                CREATE TYPE public.relationship_type AS ENUM ('POSITIVE', 'NEGATIVE');
            END IF;
            END $$;
            """))

            db.session.execute(text("""
            DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'loop_type' AND n.nspname = 'public'
            ) THEN
                CREATE TYPE public.loop_type AS ENUM ('BALANCING', 'REINFORCING');
            END IF;
            END $$;
            """))

            db.session.execute(text("""
            DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'archetype_type' AND n.nspname = 'public'
            ) THEN
                CREATE TYPE public.archetype_type AS ENUM (
                'SHIFTING_THE_BURDEN',
                'FIXES_THAT_FAIL',
                'LIMITS_TO_SUCCESS',
                'DRIFTING_GOALS',
                'GROWTH_AND_UNDERINVESTMENT',
                'SUCCESS_TO_THE_SUCCESSFUL',
                'ESCALATION',
                'TRAGEDY_OF_THE_COMMONS'
                );
            END IF;
            END $$;
            """))
            
            db.session.commit()

            # Cria as tabelas (só se não existirem)
            db.create_all()
            print("✅ Database tables checked/created (no drop).")

        except Exception as e:
            print(f"Database initialization error: {e}")
            db.session.rollback()
            raise e

        # Register all routes
        from .views import register_routes
        register_routes(app)
    
    # Error handlers
    @app.errorhandler(500)
    def handle_500(e):
        return {"error": "Internal Server Error"}, 500
    
    @app.errorhandler(404)
    def handle_404(e):
        return {"error": "Not Found"}, 404
    
    return app
