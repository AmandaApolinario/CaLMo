# Flask API with PostgreSQL

A RESTful API built with Flask and PostgreSQL for managing users and objects with authentication.

## Project Structure
```
.
├── src/
│   ├── __init__.py
│   ├── routes.py
│   ├── models.py
│   ├── database.py
│   └── auth.py
├── main.py
├── docker-compose.yml
├── db_init.sql
└── README.md
```

## Setup

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

## API Endpoints

### Health Check
- `GET /health` - Returns service status

### Authentication
- `POST /register`
    - Register new user
    - Body: `{"name": "string", "email": "string", "password": "string"}`
- `POST /login`
    - Login user
    - Body: `{"email": "string", "password": "string"}`
    - Returns: JWT token

### Variables
- `POST /object`
    - Create new object
    - Requires Authorization header with JWT token
    - Body: `{"name": "string", "description": "string"}`
- `GET /variables`
    - Get user's variables
    - Requires Authorization header with JWT token

## Development

To run the application locally:

```bash
# Start database only
docker-compose up db -d

# Install dependencies
pip install -r requirements.txt

# Run the application
python3 main.py
```

## Testing

Use curl or Postman to test the endpoints. Example:

```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"test@example.com","password":"secret"}'
```

## Database Schema

### Users Table
- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR
- `email`: VARCHAR UNIQUE
- `password`: VARCHAR (hashed)

### Variable Table
- `id`: SERIAL PRIMARY KEY
- `user_id`: INTEGER
- `name`: VARCHAR
- `description`: VARCHAR

## Security
- Passwords are hashed using Werkzeug's security functions
- JWT tokens for authentication
- CORS enabled for cross-origin requests
