# Testing Guide

## Overview

This project uses Jest and React Testing Library for unit and integration testing. Tests run automatically on every push and pull request through GitHub Actions.

## Test Suite Structure

```
src/__tests__/
├── integration/          # Integration tests
│   ├── adminPanel.integration.test.ts
│   ├── leaderboard.integration.test.ts
│   ├── multiUser.integration.test.ts
│   ├── squadManagement.integration.test.ts
│   └── transferPointStability.test.ts
├── recalculateLeaguesUsingPool.test.ts
├── roleAssignment.test.ts
├── transferPermissions.test.ts
└── transferSystem.test.ts
```

## Running Tests

### Local Development

```bash
# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode (no watch, with coverage)
npm run test:ci

# Run tests in watch mode with coverage
npm run test:watch
```

### Viewing Coverage Reports

After running tests with coverage, open the HTML report:

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

## Coverage Thresholds

The project maintains minimum coverage thresholds:

- **Statements**: 50%
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%

These thresholds are enforced in CI/CD pipelines. Builds will fail if coverage drops below these levels.

## CI/CD Integration

### GitHub Actions Workflows

#### 1. **CI/CD Pipeline** (`.github/workflows/ci.yml`)
- Runs on: Push to `main`, `develop`, or any branch; Pull requests
- Tests on Node.js 18.x and 20.x
- Uploads coverage to Codecov and GitHub Artifacts
- Adds coverage comments to PRs
- Includes lint and type checking
- Builds the application

#### 2. **PR Validation** (`.github/workflows/test-on-pr.yml`)
- Runs on: Pull request events
- Validates all tests pass
- Type checks TypeScript
- Verifies build succeeds
- Posts detailed coverage report on PR

#### 3. **Deploy to Production** (`.github/workflows/deploy.yml`)
- Runs on: Push to `main` branch
- Tests must pass before deployment
- Verifies coverage report generation
- Deploys to Vercel (if configured)

### Setting Up CI/CD

#### Required GitHub Secrets

For full CI/CD functionality, add these secrets to your GitHub repository:

1. **CODECOV_TOKEN** (Optional)
   - Get from: https://codecov.io
   - Purpose: Upload coverage reports to Codecov
   - Setup: Create account → Add repository → Copy token

2. **VERCEL_TOKEN** (Optional)
   - Get from: Vercel Account Settings → Tokens
   - Purpose: Deploy to Vercel automatically

3. **VERCEL_ORG_ID** (Optional)
   - Get from: Vercel project settings

4. **VERCEL_PROJECT_ID** (Optional)
   - Get from: Vercel project settings

To add secrets:
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with its value

## Writing Tests

### Test File Naming Convention

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`

### Example Test Structure

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  describe('Feature 1', () => {
    test('should do something specific', () => {
      // Arrange
      render(<YourComponent />);
      
      // Act
      fireEvent.click(screen.getByRole('button'));
      
      // Assert
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

### Testing Best Practices

1. **Arrange-Act-Assert Pattern**
   - Arrange: Set up test data and conditions
   - Act: Execute the functionality being tested
   - Assert: Verify the expected outcome

2. **Descriptive Test Names**
   - Use clear, descriptive test names
   - Prefix with "should" for clarity
   - Example: `'should display error message when form is invalid'`

3. **Test Isolation**
   - Each test should be independent
   - Don't rely on execution order
   - Clean up after tests if needed

4. **Mock External Dependencies**
   - Mock API calls, Firebase operations
   - Use Jest mock functions: `jest.fn()`
   - Mock modules with `jest.mock()`

5. **Test User Behavior, Not Implementation**
   - Focus on what users see and do
   - Use `screen.getByRole()`, `screen.getByText()` over `container.querySelector()`
   - Test accessible behavior

## Coverage Files and Artifacts

### Generated Files (Git Ignored)

```
coverage/
├── lcov-report/         # HTML coverage report
│   └── index.html       # Open this in browser
├── coverage-final.json  # Raw coverage data
├── coverage-summary.json # Summary statistics
└── lcov.info           # LCOV format for tools
```

### GitHub Artifacts

After each CI run, coverage reports are uploaded as GitHub Artifacts:
- Available for 30 days
- Download from Actions tab → Workflow run → Artifacts section

## Troubleshooting

### Tests Failing in CI but Passing Locally

1. **Environment Differences**
   ```bash
   # Run tests in CI mode locally
   CI=true npm run test:ci
   ```

2. **Timing Issues**
   - Use `waitFor()` for async operations
   - Increase timeout if needed: `jest.setTimeout(10000)`

3. **Dependencies**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Low Coverage Warnings

1. **Identify Untested Files**
   ```bash
   npm run test:coverage
   # Check coverage/lcov-report/index.html
   ```

2. **Focus on Critical Paths**
   - Prioritize business logic
   - Test error handling
   - Cover edge cases

3. **Exclude Test Files**
   - Already configured in `package.json`
   - Add patterns to `collectCoverageFrom` if needed

### Test Performance Issues

1. **Slow Tests**
   ```bash
   # Use maxWorkers to limit parallelization
   npm test -- --maxWorkers=2
   ```

2. **Memory Issues**
   ```bash
   # Increase Node memory
   NODE_OPTIONS=--max_old_space_size=4096 npm test
   ```

## Integration with Development Workflow

### Pre-commit Hook (Optional)

Add Husky for pre-commit testing:

```bash
npm install --save-dev husky
npx husky init
echo "npm run test:ci" > .husky/pre-commit
```

### VS Code Integration

Recommended extensions:
- **Jest Runner**: Run individual tests from editor
- **Coverage Gutters**: View coverage in editor

Add to `.vscode/settings.json`:
```json
{
  "jest.autoRun": "watch",
  "coverage-gutters.showLineCoverage": true
}
```

## Continuous Improvement

### Coverage Goals

Current: 50% minimum
Short-term goal: 70%
Long-term goal: 80%+

### Review Coverage Regularly

1. Check coverage trends in Codecov
2. Review uncovered lines in PRs
3. Add tests for new features
4. Improve coverage for critical paths

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Codecov Documentation](https://docs.codecov.com/)

## Contact

For questions about testing:
- Review existing tests in `src/__tests__/`
- Check CI/CD workflow files in `.github/workflows/`
- Consult team documentation in project README
