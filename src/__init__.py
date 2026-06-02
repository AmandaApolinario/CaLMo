from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import text
from flask_socketio import SocketIO

load_dotenv()

db = SQLAlchemy()

socketio = SocketIO(cors_allowed_origins="*")


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
    socketio.init_app(app)

    from . import events

    with app.app_context():
        # Import models to ensure they are registered with SQLAlchemy

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

            db.session.execute(text("""
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'clds'
                    ) THEN

                        IF NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_name='clds' AND column_name='share_token'
                        ) THEN
                            ALTER TABLE clds ADD COLUMN share_token VARCHAR(100) UNIQUE;
                        END IF;
                    END IF;
                END $$;
            """))

            db.session.execute(text("""
                DO $$ BEGIN
                CREATE TABLE IF NOT EXISTS cld_history (
                    id VARCHAR(36) PRIMARY KEY,
                    cld_id VARCHAR(36) REFERENCES clds(id) ON DELETE CASCADE,
                    user_id VARCHAR(36) REFERENCES users(id),
                    action_summary TEXT,
                    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                END $$;
            """))

            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'subsystems'
                    ) THEN
                        CREATE TABLE public.subsystems (
                            id VARCHAR PRIMARY KEY,
                            name VARCHAR NOT NULL,
                            description TEXT,
                            cld_id VARCHAR NOT NULL,
                            parent_id VARCHAR,
                            CONSTRAINT fk_subsystems_cld 
                                FOREIGN KEY (cld_id) REFERENCES public.clds(id) ON DELETE CASCADE,
                            CONSTRAINT fk_subsystems_parent 
                                FOREIGN KEY (parent_id) REFERENCES public.subsystems(id) ON DELETE CASCADE
                        );
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'subsystem_variables'
                    ) THEN
                        CREATE TABLE public.subsystem_variables (
                            subsystem_id VARCHAR NOT NULL,
                            variable_id VARCHAR NOT NULL,
                            PRIMARY KEY (subsystem_id, variable_id),
                            CONSTRAINT fk_subsystem_vars_subsystem 
                                FOREIGN KEY (subsystem_id) REFERENCES public.subsystems(id) ON DELETE CASCADE,
                            CONSTRAINT fk_subsystem_vars_variable 
                                FOREIGN KEY (variable_id) REFERENCES public.variables(id) ON DELETE CASCADE
                        );
                    END IF;
                END $$;
            """))




            db.session.commit()

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
