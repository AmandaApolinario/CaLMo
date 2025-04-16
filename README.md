# Causal Loop Diagram (CLD) Analysis API

A RESTful API built with Flask and PostgreSQL for creating and analyzing Causal Loop Diagrams, including feedback loop and archetype identification.

## Project Structure
```
.
├── src/
│ ├── init.py # App initialization and configuration
│ ├── routes.py # API endpoints
│ ├── models.py # Database models
│ ├── database.py # Database operations
│ └── auth.py # Authentication utilities
├── main.py # Application entry point
├── docker-compose.yml # Docker configuration
├── requirements.txt # Python dependencies
├── CLD collection.postman_collection.json # Postman API documentation
└── README.md
```

## Postman Documentation
The file `CLD collection.postman_collection.json` contains the complete Postman collection for testing the API.
## Setup and Installation

### Prerequisites
- Docker and Docker Compose

### Running the Application

1. Clone the repository:
```bash
git clone <repository-url>
cd casualLoopDiagramApp
```

2. Start the application using Docker Compose:
```bash
# Remove any existing containers and volumes
docker-compose down
docker volume rm $(docker volume ls -q)

# Build and start the containers
docker-compose up --build
```

The API will be available at `http://localhost:5001`

## API Documentation

### Authentication
All routes except registration and login require a JWT token in the Authorization header.

#### Register User
```http
POST /register
Content-Type: application/json

{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
}
```

#### Login
```http
POST /login
Content-Type: application/json

{
    "email": "test@example.com",
    "password": "password123"
}
```
Returns a JWT token to use in subsequent requests.

### Variables

#### Create Variable
```http
POST /variable
Authorization: <jwt-token>
Content-Type: application/json

{
    "name": "Population",
    "description": "Urban population size"
}
```

#### Get Variables
```http
GET /variables
Authorization: <jwt-token>
```

### Causal Loop Diagrams (CLDs)

#### Create CLD
```http
POST /cld
Authorization: <jwt-token>
Content-Type: application/json

{
    "name": "Population Dynamics",
    "date": "2024-03-14",
    "description": "Basic population dynamics model",
    "variables": ["variable_id_1", "variable_id_2"],
    "relationships": [
        {
            "source_id": "variable_id_1",
            "target_id": "variable_id_2",
            "type": "POSITIVE"
        }
    ]
}
```

#### Get All CLDs
```http
GET /clds
Authorization: <jwt-token>
```

#### Get CLD Relationships
```http
GET /cld/<cld_id>/relationships
Authorization: <jwt-token>
```

#### Create Relationship in CLD
```http
POST /cld/<cld_id>/relationships
Authorization: <jwt-token>
Content-Type: application/json

{
    "source_id": "variable_id_1",
    "target_id": "variable_id_2",
    "type": "POSITIVE"
}
```

### Feedback Loops

#### Identify Feedback Loops
```http
POST /cld/<cld_id>/feedback-loops
Authorization: <jwt-token>
```

#### Get Feedback Loops
```http
GET /cld/<cld_id>/feedback-loops
Authorization: <jwt-token>
```

### System Archetypes

#### Identify Archetypes
```http
POST /cld/<cld_id>/archetypes
Authorization: <jwt-token>
```

#### Get Archetypes
```http
GET /cld/<cld_id>/archetypes
Authorization: <jwt-token>
```
