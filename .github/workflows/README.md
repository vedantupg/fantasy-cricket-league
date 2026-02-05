# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Fantasy Cricket League project.

## 📋 Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Code Push / PR                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├──────────────────────────────────────────┐
                     │                                          │
                     ▼                                          ▼
        ┌────────────────────────┐              ┌────────────────────────┐
        │   ci.yml (Main CI/CD)  │              │ test-on-pr.yml (PR)   │
        ├────────────────────────┤              ├────────────────────────┤
        │ • Run tests (Node 18,20│              │ • Validate tests       │
        │ • Collect coverage      │              │ • Type check           │
        │ • Upload to Codecov     │              │ • Build verification   │
        │ • Type checking         │              │ • Coverage report      │
        │ • Lint code             │              │ • Comment on PR        │
        │ • Build app             │              └────────────────────────┘
        └────────────┬───────────┘
                     │
                     │ ✅ All checks pass
                     │
                     ▼
        ┌────────────────────────┐
        │   deploy.yml (Deploy)  │
        ├────────────────────────┤
        │ • Re-run tests          │
        │ • Build for production  │
        │ • Deploy to Vercel      │
        └────────────────────────┘
```

## 📁 Workflow Files

### 1. `ci.yml` - Main CI/CD Pipeline

**Purpose**: Continuous Integration for all branches and pull requests

**Triggers**:
- Push to `main`, `develop`, or any branch
- Pull requests to `main`, `develop`

**Jobs**:

#### Test Job
- Runs on Ubuntu with Node.js 18.x and 20.x
- Steps:
  1. Checkout code
  2. Setup Node.js with npm caching
  3. Install dependencies (`npm ci`)
  4. Run tests with coverage
  5. Upload coverage to Codecov (if token configured)
  6. Upload coverage as GitHub Artifact (30-day retention)
  7. Generate coverage summary in GitHub UI
  8. Comment on PR with coverage table

#### Lint Job
- TypeScript type checking
- ESLint (if configured)

#### Build Job
- Depends on test and lint passing
- Builds production bundle
- Uploads build artifacts (7-day retention)

**Environment Variables**:
- `CI=true` - Ensures non-interactive mode

**Artifacts Generated**:
- `coverage-report/` - Full coverage report (30 days)
- `build/` - Production build (7 days)

---

### 2. `test-on-pr.yml` - PR Validation

**Purpose**: Enhanced validation specifically for pull requests

**Triggers**:
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

**Jobs**:

#### Validate Job
- Comprehensive PR validation
- Steps:
  1. Checkout code with full git history
  2. Setup Node.js 20.x
  3. Install dependencies
  4. Run all tests with coverage
  5. TypeScript type check
  6. Build verification
  7. Post interactive coverage report using `jest-coverage-report-action`

**Special Features**:
- Uses `ArtiomTr/jest-coverage-report-action@v2`
- Creates detailed coverage report with:
  - Coverage changes since base branch
  - Line-by-line annotations
  - Failed test details
  - Coverage trend visualization

---

### 3. `deploy.yml` - Production Deployment

**Purpose**: Automated deployment to production (Vercel)

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch (via GitHub UI)

**Jobs**:

#### Test Job
- Runs all tests before deployment
- Verifies coverage report generation
- Acts as safety gate before deploy

#### Deploy Job
- Depends on test job passing
- Steps:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Build for production
  5. Deploy to Vercel using official action

**Required Secrets**:
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Project identifier

**Environment Variables**:
- `REACT_APP_ENV=production` - Set environment
- `CI=true` - Non-interactive mode

---

## 🔒 Required Secrets

Add these in: `Repository Settings → Secrets and variables → Actions`

### Optional but Recommended

| Secret | Required For | How to Get |
|--------|-------------|------------|
| `CODECOV_TOKEN` | Coverage uploads to Codecov | https://codecov.io → Add repo → Copy token |
| `VERCEL_TOKEN` | Automated deployments | Vercel Account → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel deployment | Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel deployment | Vercel project settings |

**Note**: The CI/CD works without any secrets! Codecov and Vercel deployment are optional enhancements.

---

## 🎯 Workflow Status

### How to Check Status

1. **GitHub Repository**
   - Go to "Actions" tab
   - See all workflow runs
   - Click any run for detailed logs

2. **Pull Requests**
   - Status checks appear at bottom of PR
   - Must pass before merging
   - Click "Details" to see logs

3. **Branch Protection** (Recommended)
   - Settings → Branches → Add rule for `main`
   - Require status checks:
     - ✅ `test (18.x)`
     - ✅ `test (20.x)`
     - ✅ `lint`
     - ✅ `build`
     - ✅ `validate`

---

## 🚀 Usage Examples

### Viewing Test Results

1. Go to Actions tab
2. Click on a workflow run
3. Click "test" job
4. Expand "Run tests with coverage"
5. See test output and coverage summary

### Downloading Coverage Report

1. Actions → Select workflow run
2. Scroll to "Artifacts" section
3. Download "coverage-report"
4. Extract and open `index.html`

### Manual Deployment

1. Actions tab
2. Select "Deploy to Production"
3. Click "Run workflow" button
4. Select branch
5. Click "Run workflow"

### Viewing Coverage on PR

Coverage appears in two places:
1. **Comment** - Automated bot comment with coverage table
2. **Files Changed** - Inline annotations on new code

---

## 🔧 Customization

### Adding More Node Versions

Edit `ci.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Add more versions
```

### Changing Coverage Thresholds

Edit `package.json`:

```json
"coverageThreshold": {
  "global": {
    "branches": 70,    // Increase as coverage improves
    "functions": 70,
    "lines": 70,
    "statements": 70
  }
}
```

### Disabling Codecov

Remove or comment out in `ci.yml`:

```yaml
# - name: Upload coverage reports to Codecov
#   if: matrix.node-version == '20.x'
#   uses: codecov/codecov-action@v4
#   ...
```

### Running Additional Linters

Add to `ci.yml` lint job:

```yaml
- name: Run Prettier
  run: npx prettier --check "src/**/*.{ts,tsx}"

- name: Run Stylelint
  run: npx stylelint "src/**/*.css"
```

---

## 🐛 Troubleshooting

### Workflow Not Running

**Problem**: Pushed code but workflow doesn't appear

**Solutions**:
1. Check Actions are enabled: Settings → Actions → Allow all actions
2. Verify YAML syntax: Use https://www.yamllint.com/
3. Check file location: Must be in `.github/workflows/`
4. Ensure file has `.yml` or `.yaml` extension

### Tests Failing in CI Only

**Problem**: Tests pass locally but fail in CI

**Solutions**:
```bash
# Run in CI mode locally
CI=true npm run test:ci

# Check for:
# - Hardcoded file paths
# - Timezone issues
# - Environment variables
# - Console.log statements (CI may treat as errors)
```

### Coverage Upload Fails

**Problem**: Codecov upload step fails

**Solutions**:
1. Verify `CODECOV_TOKEN` is set correctly
2. Check token hasn't expired
3. Set `fail_ci_if_error: false` (already configured)
4. Coverage will still be in GitHub Artifacts

### Build Failing

**Problem**: Build step fails in CI

**Solutions**:
```bash
# Test build locally
npm run build

# Check for:
# - TypeScript errors: npx tsc --noEmit
# - Missing env variables
# - Import errors
```

### Out of Disk Space

**Problem**: GitHub Actions runs out of disk space

**Solutions**:
```yaml
# Add cleanup step before build
- name: Clean up
  run: |
    npm prune --production
    rm -rf coverage/
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **Test Pass Rate**: Should be 100%
2. **Coverage Trend**: Should increase over time
3. **Build Time**: Monitor for degradation
4. **Failure Patterns**: Identify flaky tests

### Using GitHub Insights

- Actions tab → Select workflow → Click "..." → "View workflow file"
- See run history and trends
- Identify bottlenecks

---

## 🎓 Best Practices

### ✅ Do's

1. **Keep workflows fast**
   - Use caching (`cache: 'npm'`)
   - Run jobs in parallel when possible
   - Use `npm ci` instead of `npm install`

2. **Make workflows reliable**
   - Set explicit timeouts
   - Handle failures gracefully
   - Use specific action versions (v4, not @latest)

3. **Secure your workflows**
   - Never commit secrets to code
   - Use repository secrets
   - Limit token permissions

4. **Monitor and maintain**
   - Review failed runs promptly
   - Update actions regularly
   - Keep dependencies current

### ❌ Don'ts

1. **Don't ignore failures**
   - Every failure is important
   - Fix or disable flaky tests
   - Don't merge with failing checks

2. **Don't overuse workflows**
   - Combine related checks
   - Use job dependencies wisely
   - Avoid redundant runs

3. **Don't hardcode values**
   - Use secrets for tokens
   - Use variables for configuration
   - Make workflows reusable

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#collectcoveragefrom-array)
- [Codecov Documentation](https://docs.codecov.com/)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)

---

## 🆘 Getting Help

If workflows aren't working as expected:

1. Check workflow run logs in Actions tab
2. Look for error messages in failed steps
3. Compare with successful runs
4. Review this documentation
5. Check individual workflow file comments

Remember: The CI/CD is there to help you catch issues early. If checks fail, it's protecting your main branch! 🛡️
