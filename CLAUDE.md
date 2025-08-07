# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Firebase Functions project for a Korean meal service application. The codebase is set up with TypeScript and follows Firebase Functions v2 architecture.

## Development Commands

All commands should be run from the `functions/` directory:

### Essential Commands
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode compilation
- `npm run lint` - Run ESLint with Google style guide
- `npm run serve` - Start Firebase emulator for local development
- `npm run deploy` - Deploy functions to Firebase (requires authentication)
- `npm run logs` - View Firebase function logs

### Firebase CLI Commands
- `firebase emulators:start --only functions` - Start emulator (after building)
- `firebase functions:shell` - Interactive shell for testing functions
- `firebase deploy --only functions` - Deploy only functions

## Project Structure

```
├── firebase.json          # Firebase project configuration
├── .firebaserc            # Firebase project alias (acg-playground)
├── .gitignore             # Git ignore patterns
└── functions/
    ├── package.json       # Node.js dependencies and scripts
    ├── tsconfig.json      # TypeScript compiler configuration
    ├── src/
    │   └── index.ts       # Main function definitions
    └── lib/               # Compiled JavaScript output (generated)
```

## Architecture Notes

- **Runtime**: Node.js 22
- **Language**: TypeScript with strict mode enabled
- **Module System**: NodeNext with ES module interop
- **Compilation Target**: ES2017
- **Firebase Project**: acg-playground (default)

## Code Style

- ESLint with Google configuration
- TypeScript strict mode enabled
- No unused locals or implicit returns allowed
- Source maps enabled for debugging

## Deployment Process

Firebase uses predeploy hooks defined in firebase.json:
1. Runs `npm run lint` to check code quality
2. Runs `npm run build` to compile TypeScript
3. Deploys compiled functions from lib/ directory

## Function Structure

Currently contains a single HTTP function (`helloWorld`) that:
- Responds to HTTP requests
- Uses structured logging
- Returns "Hello from Firebase!" message
- Includes Korean comments explaining functionality