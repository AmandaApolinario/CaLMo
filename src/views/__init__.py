from .auth_routes import auth_routes
from .variable_routes import variable_routes
from .cld_routes import cld_routes

def register_routes(app):
    """Register all blueprint routes with the app"""
    app.register_blueprint(auth_routes)
    app.register_blueprint(variable_routes)
    app.register_blueprint(cld_routes) 