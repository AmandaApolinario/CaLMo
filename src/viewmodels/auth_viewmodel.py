from ..models.repositories import UserRepository
from ..auth import generate_token

class AuthViewModel:
    def __init__(self, db_session):
        self.db_session = db_session
        self.user_repo = UserRepository()
    
    def register_user(self, name, email, password):
        """Register a new user"""
        # Check if user already exists
        existing_user = self.user_repo.get_user_by_email(self.db_session, email)
        if existing_user:
            return None, "User already exists"
        
        # Create new user
        try:
            user = self.user_repo.register_user(self.db_session, name, email, password)
            return user, "User created successfully"
        except Exception as e:
            return None, f"Error creating user: {str(e)}"
    
    def login_user(self, email, password):
        """Authenticate a user and return a token"""
        user = self.user_repo.login_user(self.db_session, email, password)
        if not user:
            return None, "Invalid credentials"
        
        # Generate token for authenticated user
        token = generate_token(user.id)
        return token, "Login successful" 