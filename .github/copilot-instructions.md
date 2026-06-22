# Copilot Instructions for Japanese Learning App

## Project Overview
Full-stack Japanese learning application with Web + Mobile cross-platform support, similar to Duolingo.

## Technology Stack
- **Backend**: Node.js + Express + MongoDB + TypeScript
- **Frontend**: React 18 + React Router + TypeScript
- **Mobile**: React Native + Expo + TypeScript
- **Shared**: Shared types and utilities

## Workspace Structure
```
japanese-learning-app/
├── backend/          # Express API server
├── web/              # React web application
├── mobile/           # React Native/Expo mobile
├── shared/           # Shared types & utilities
└── package.json      # Yarn workspaces config
```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint/Prettier conventions
- Use functional components in React
- Implement proper error handling

### Project Structure
- Keep routes, models, controllers separate
- Use named exports
- Implement proper typing
- Follow REST API conventions

### Database
- MongoDB with Mongoose ORM
- Define proper schemas with validation
- Index frequently queried fields

## Common Tasks

### Adding a New API Endpoint
1. Create model if needed in `backend/src/models/`
2. Create controller in `backend/src/controllers/`
3. Create route in `backend/src/routes/`
4. Update shared types in `shared/src/types/`
5. Implement frontend consumption

### Running Services
```bash
yarn dev                # All services
cd backend && yarn dev  # Backend only
cd web && yarn start    # Web only
cd mobile && yarn start # Mobile only
```

### Building for Production
```bash
yarn build
```

## Important Notes
- No authentication required (single-user app)
- Local data sync between devices
- Focus on gamification features
- Ensure responsive design for mobile
- Maintain code consistency across platforms
