# Test Suite

This directory contains the comprehensive test suite for the Full Self Coding Server package.

## Test Structure

```
test/
├── README.md                 # This file
├── setup.ts                  # Global test setup and utilities
├── index.test.ts             # Server entry point tests
├── types/
│   └── index.test.ts         # TypeScript type definitions tests
├── utils/
│   ├── globalStateManager.test.ts  # Global state manager tests
│   └── taskExecutor.test.ts       # Task executor tests
├── storage/
│   └── taskStorage.test.ts        # Task storage system tests
└── routes/
    └── tasks.test.ts              # API route tests
```

## Running Tests

### Run all tests
```bash
bun test
```

### Run specific test files
```bash
bun test test/utils/globalStateManager.test.ts
bun test test/storage/taskStorage.test.ts
```

### Run tests with verbose output
```bash
bun test --verbose
```

### Run tests with timeout
```bash
bun test --timeout 30000
```

## Test Coverage

The test suite covers:

- **Server Entry Point** (16 tests): Server initialization, configuration, and middleware setup
- **Type Definitions** (40 tests): TypeScript interface and enum validation
- **Global State Manager** (25 tests): In-memory state management with TTL support
- **Task Executor** (21 tests): Task execution orchestration and progress tracking
- **Task Storage** (18 tests): Local file storage and task persistence
- **API Routes** (12 tests): HTTP endpoint validation and error handling

**Total: 132 tests**

## Test Utilities

The `setup.ts` file provides:

- Global test configuration
- Mock data generators (`createMockTaskState`, `createMockCreateTaskRequest`)
- Console method mocking for cleaner test output
- Common test exports (`describe`, `it`, `expect`, etc.)

## Key Features Tested

### ✅ Core Functionality
- Express server creation and configuration
- Middleware setup (CORS, helmet, compression, etc.)
- Route mounting and HTTP method support

### ✅ Type Safety
- All TypeScript interfaces and enums
- Request/response type validation
- Optional field handling

### ✅ State Management
- Global state CRUD operations
- TTL (time-to-live) functionality
- Metadata support and cleanup
- Query and pagination

### ✅ Task Execution
- Task validation and creation
- Progress tracking for analyzer and solver
- Concurrency handling
- Error scenarios

### ✅ Storage System
- File-based task persistence
- Directory initialization
- Task history and pagination
- Report storage and retrieval

### ✅ API Endpoints
- Request validation
- Error response formatting
- Type-safe API contracts

## Bun Test Framework

This test suite uses Bun's built-in test framework which provides:
- Fast test execution
- Built-in assertions
- TypeScript support
- Watch mode (`bun test --watch`)
- Coverage reporting (`bun test --coverage`)

## Contributing

When adding new tests:

1. Follow the existing directory structure
2. Use descriptive test names
3. Test both happy path and error scenarios
4. Use the mock data generators from `setup.ts`
5. Keep tests focused and independent
6. Update this README if adding new test categories