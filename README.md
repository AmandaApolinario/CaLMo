# Causal Loop Diagram (CLD) Analysis Application

A full-stack application for creating, visualizing, and analyzing Causal Loop Diagrams, including automated feedback loop and system archetype identification.

## Architecture

This application follows the MVVM (Model-View-ViewModel) architecture:

- **Model**: Database entities and business logic
- **ViewModel**: Intermediary between Models and Views, handles data transformation
- **View**: API endpoints and UI components

## Project Structure

```
.
├── src/                      # Backend Flask application
│   ├── models/               # Model layer
│   │   ├── entities.py       # Database models
│   │   ├── domain_logic.py   # Business logic for CLD analysis
│   │   └── repositories.py   # Data access layer
│   ├── viewmodels/           # ViewModel layer
│   │   ├── auth_viewmodel.py # Authentication logic
│   │   ├── cld_viewmodel.py  # CLD manipulation logic
│   │   └── variable_viewmodel.py # Variable handling
│   ├── views/                # View layer (API endpoints)
│   │   ├── auth_routes.py    # Authentication endpoints
│   │   ├── cld_routes.py     # CLD-related endpoints
│   │   └── variable_routes.py # Variable endpoints
│   ├── __init__.py           # App initialization and configuration
│   └── auth.py               # Authentication utilities
├── frontend/                 # Frontend Vue.js application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── views/            # Page components
│   │   ├── models/           # Frontend data models
│   │   ├── services/         # API service layer
│   │   └── router/           # Vue router configuration
│   └── public/               # Static assets
├── main.py                   # Application entry point
├── docker-compose.yml        # Docker configuration
├── requirements.txt          # Python dependencies
├── CLD collection.postman_collection.json # Postman collection
└── README.md
```

## Features

- **User Authentication**: Register, login, and token-based auth
- **Variable Management**: Create, read, update, and delete variables
- **CLD Creation**: Build causal loop diagrams with variables and relationships
- **Visualization**: Interactive diagram visualization
- **Automated Analysis**:
  - Feedback loop identification and classification
  - System archetype detection
- **RESTful API**: Complete API for frontend and third-party integration

## Setup and Installation

### Prerequisites
- Docker and Docker Compose
- Node.js and npm (for frontend development)

### Running the Application

1. Clone the repository:
```bash
git clone https://github.com/AmandaApolinario/casualLoopDiagramApp
cd casualLoopDiagramApp
```

2. Start the backend using Docker Compose:

- ⚠️IMPORTANT: If you are on MacOS, you will need to uncomment the two settings lines `platform: linux/arm64/v8` on the `docker-compose.yml` file.

```bash
# Remove any existing containers and volumes (optional)
docker-compose down
docker volume rm $(docker volume ls -q)

# Build and start the containers
docker-compose up --build
```

3. Start the frontend development server:
```bash
cd frontend
npm install
npm run dev
```

The API will be available at `http://localhost:5001`
The frontend application will be available at `http://localhost:3000`

## API Documentation

### Authentication Endpoints

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

### Variable Endpoints

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

#### Update Variable
```http
PUT /variable/<variable_id>
Authorization: <jwt-token>
Content-Type: application/json

{
    "name": "Updated Population",
    "description": "Updated description"
}
```

#### Delete Variable
```http
DELETE /variable/<variable_id>
Authorization: <jwt-token>
```

### CLD Endpoints

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

#### Get CLD by ID
```http
GET /cld/<cld_id>
Authorization: <jwt-token>
```

#### Update CLD
```http
PUT /cld/<cld_id>
Authorization: <jwt-token>
Content-Type: application/json

{
    "name": "Updated CLD Name",
    "description": "Updated description",
    "date": "2024-03-15",
    "variables": ["variable_id_1", "variable_id_2", "variable_id_3"],
    "relationships": [
        {
            "source_id": "variable_id_1",
            "target_id": "variable_id_2",
            "type": "POSITIVE"
        },
        {
            "source_id": "variable_id_2",
            "target_id": "variable_id_3",
            "type": "NEGATIVE"
        }
    ]
}
```

#### Delete CLD
```http
DELETE /cld/<cld_id>
Authorization: <jwt-token>
```

#### Get CLD Relationships
```http
GET /cld/<cld_id>/relationships
Authorization: <jwt-token>
```

### Feedback Loop Endpoints

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

### System Archetype Endpoints

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

## MVVM Architecture Details

### Model Layer
The Model layer contains database entities, business logic for CLD analysis, and data access repositories:

- **entities.py**: Database models using SQLAlchemy ORM
- **domain_logic.py**: Business logic for analyzing CLDs, including feedback loop identification and archetype detection
- **repositories.py**: Data access methods for each entity type

### ViewModel Layer
The ViewModel layer mediates between the Model and View layers:

- **auth_viewmodel.py**: Authentication logic
- **variable_viewmodel.py**: Variable creation and management
- **cld_viewmodel.py**: CLD manipulation, relationship management, and analysis

### View Layer
The View layer consists of API routes and frontend components:

- **auth_routes.py**: Authentication endpoints
- **variable_routes.py**: Variable management endpoints
- **cld_routes.py**: CLD-related endpoints

## Development

### Backend Development
The backend is built with:
- **Flask**: Web framework
- **SQLAlchemy**: ORM for database interactions
- **PostgreSQL**: Database
- **JWT**: Token-based authentication

### Frontend Development
The frontend is built with:
- **Vue.js**: JavaScript framework
- **Axios**: HTTP client
- **D3.js**: Visualization library

## License

This work is licensed under a Creative Commons Attribution-NonCommercial License (CC BY-NC)

