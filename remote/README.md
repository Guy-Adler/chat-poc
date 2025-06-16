# Remote Backend

A TypeScript-based backend service built with Express.js, WebSocket, and PostgreSQL.

## Features

- TypeScript-based Node.js backend
- Express.js web server
- WebSocket support for real-time communication
- PostgreSQL database integration with TypeORM
- Development environment with hot-reloading
- Code formatting and linting configuration

## Prerequisites

- Node.js (Latest LTS version recommended)
- pnpm (v10.12.1 or later)
- PostgreSQL database

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file in the root directory with your environment variables (see Environment Variables section)

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=
PG_HOST=
PG_PORT=
PG_USER=
PG_PASSWORD=
PG_DATABASE=
```

## Available Scripts

- `pnpm start` - Start the production server
- `pnpm dev` - Start the development server with hot-reloading
- `pnpm build` - Build the TypeScript project
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm format` - Format code using Prettier

## Project Structure

```
remote/
├── src/              # Source code
│   ├── db/          # Database related code
│   ├── public/      # Public assets
│   └── index.ts     # Main application entry point
├── package.json     # Project dependencies and scripts
├── tsconfig.json    # TypeScript configuration
├── .eslintrc.json   # ESLint configuration
└── .prettierrc      # Prettier configuration
```

## Dependencies

### Main Dependencies

- express: Web framework
- ws: WebSocket implementation
- pg: PostgreSQL client
- typeorm: ORM for database operations
- dotenv: Environment variable management
- body-parser: Request body parsing

### Development Dependencies

- typescript: TypeScript support
- ts-node-dev: Development server with hot-reloading
- eslint: Code linting
- prettier: Code formatting
- Various TypeScript type definitions

## License

ISC
