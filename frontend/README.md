# Causal Loop Diagram (CLD) Frontend Application

A modern Vue.js application for creating, managing, and visualizing Causal Loop Diagrams (CLDs). This frontend provides an intuitive interface for working with CLDs, allowing users to create, edit, and analyze complex system relationships.

## Features

- Create and manage multiple CLDs
- Interactive diagram editing and visualization
- Variable relationship management
- Feedback loop and archetype detection
- Node position persistence

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5001`.

## Project Architecture: MVVM

This project follows the MVVM (Model-View-ViewModel) architecture pattern, which enhances separation of concerns and makes the codebase more maintainable, testable, and scalable.

### Components of MVVM

#### Model Layer

The Model layer represents the data structures and business logic of the application:
- **Data Models** (`/src/models/`): Classes representing core business entities like `CLDModel`
- **Services** (`/src/services/`): API communication and data operations

#### View Layer

The View layer is responsible for displaying data and capturing user interactions:
- **Vue Components** (`/src/views/`): Page-level components
- **Reusable Components** (`/src/components/`): Shared UI elements

#### ViewModel Layer

The ViewModel layer acts as a bridge between Model and View:
- **ViewModels** (`/src/viewmodels/`): Vue Composition API functions (composables)
- **Stores** (`/src/stores/`): Global state management using Pinia

### Flow of Data and Actions

1. **User Interaction**: Users interact with the View layer (Vue components)
2. **Action Handling**: The View calls methods exposed by the ViewModel
3. **Data Access**: The ViewModel uses services to access data from the Model
4. **State Updates**: The ViewModel updates its state based on data from the Model
5. **Reactive UI Updates**: The View reactively updates based on ViewModel state changes

## Project Structure

```
src/
├── assets/                # Static resources
│   ├── base.css          # Base styles
│   ├── logo.svg          # Application logo
│   └── main.css          # Main styles
├── components/            # Reusable UI components
│   ├── NavBar.vue        # Navigation bar
│   ├── HelloWorld.vue    # Welcome component
│   ├── TheWelcome.vue    # Welcome screen
│   ├── WelcomeItem.vue   # Welcome item component
│   └── icons/            # Icon components
│       ├── IconCommunity.vue
│       ├── IconDocumentation.vue
│       ├── IconEcosystem.vue
│       ├── IconSupport.vue
│       └── IconTooling.vue
├── models/                # Data models
│   ├── CLDModel.js       # Causal Loop Diagram data model
│   └── UserModel.js      # User data model
├── router/                # Vue Router configuration
│   └── index.js          # Router setup and routes
├── services/              # API services
│   ├── api.service.js    # Base API service
│   ├── auth.service.js   # Authentication service
│   └── cld.service.js    # CLD operations service
├── stores/                # Pinia stores
│   ├── auth.js           # Authentication state
│   └── cld.js            # CLD state
├── viewmodels/            # ViewModels (composables)
│   ├── AuthViewModel.js           # Authentication logic
│   ├── CLDDetailViewModel.js      # CLD detail view logic
│   ├── CLDDiagramViewModel.js     # CLD diagram visualization logic
│   ├── CLDEditorViewModel.js      # CLD editing logic
│   ├── CLDListViewModel.js        # CLD list view logic
│   └── VariablesViewModel.js      # Variables management logic
├── views/                 # Page components
│   ├── CLDCreateView.vue  # CLD creation page
│   ├── CLDDetailView.vue  # CLD detail page
│   ├── CLDEditView.vue    # CLD editing page
│   ├── CLDListView.vue    # CLD listing page
│   ├── DashboardView.vue  # User dashboard
│   ├── LandingView.vue    # Landing page
│   ├── RegisterView.vue   # User registration
│   └── VariablesView.vue  # Variables management page
├── App.vue                # Root component
└── main.js                # Application entry point
```

## Development

This project uses:
- Vue 3 with Composition API
- Vite as the build tool
- Axios for API requests
- Vis-Network for diagram visualization
- Pinia for state management
- Modern CSS with flexbox and grid layouts

## Key Implementation Features

### Interactive CLD Visualization
- Dynamic node positioning with persistence
- Automatic overlap prevention
- Automatic feedback loop and archetype detection
- Real-time relationship visualization

### Data Management
- Robust data models with API compatibility
- Comprehensive error handling
- Persistent storage of user preferences

### User Experience
- Responsive and intuitive interface
- Real-time validation
- Consistent design language

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Benefits of MVVM in this Project

1. **Separation of Concerns**: UI logic is separated from business logic
2. **Testability**: Each layer can be tested independently
3. **Code Reuse**: ViewModels and Models can be reused across different views
4. **Maintainability**: Changes to one layer have minimal impact on other layers
5. **Scalability**: New features can be added by extending existing layers

## Best Practices

1. Views should only handle UI concerns and delegate logic to ViewModels
2. ViewModels should not directly reference Views
3. Models should be independent of both Views and ViewModels
4. Use composition functions for reusable logic across ViewModels
5. Keep global state minimal; prefer local state in ViewModels when possible
