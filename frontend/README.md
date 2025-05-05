# Casual Loop Diagram (CLD) Frontend Application

A modern Vue.js application for creating, managing, and visualizing Casual Loop Diagrams (CLDs). This frontend provides an intuitive interface for working with CLDs, allowing users to create, edit, and analyze complex system relationships.

## Features

- Create and manage multiple CLDs
- Interactive diagram editing
- Variable relationship management
- Real-time visualization
- Responsive design for various screen sizes

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

## Project Structure

- `src/views/` - Main view components including CLDListView and CLDEditView
- `src/components/` - Reusable Vue components
- `src/assets/` - Static assets like images and styles

## Development

This project uses:
- Vue 3 with Composition API
- Vite as the build tool
- Axios for API requests
- Modern CSS with flexbox and grid layouts

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.
