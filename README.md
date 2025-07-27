# Hey World Monorepo

## Overview

This is a monorepo for the Hey World project, managed with Turborepo and pnpm. It includes multiple Next.js applications and shared packages.

### Structure

- **apps/**: Contains the main applications.
  - `blog/`: Blog application (Next.js).
  - `hey/`: Main Hey application (Next.js).
- **packages/**: Shared packages used across apps.
  - `components/`: Reusable React components.
  - `lib/`: Utility functions and helpers.
  - `ui/`: UI components and styles.
- **Root files**:
  - `pnpm-workspace.yaml`: Defines the workspace.
  - `turbo.json`: Turborepo configuration.
  - `tsconfig.base.json`: Base TypeScript configuration.
  - `tailwind.config.ts`: Shared Tailwind CSS configuration.

## Setup and Running

### Prerequisites

- Node.js (>=22.17.0)
- pnpm (>=10.12.4)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lullabyX/hey-world.git
   cd hey-world
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

- Blog app: http://localhost:3000
- Hey app: http://localhost:3001

### Building

Build all apps and packages:

```bash
pnpm build
```

### Other Commands

- Lint: `pnpm lint`
- Test: `pnpm test`

For more details, refer to individual package READMEs or turbo.json.
