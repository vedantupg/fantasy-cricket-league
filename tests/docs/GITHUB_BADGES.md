# GitHub Badges Setup

Add these badges to your README.md to show build status and test coverage.

## Available Badges

### 1. CI/CD Pipeline Status

```markdown
![CI/CD Pipeline](https://github.com/YOUR_USERNAME/fantasy-cricket-league/workflows/CI/CD%20Pipeline/badge.svg)
```

### 2. Test Coverage (Codecov)

First, sign up at https://codecov.io and add your repository.

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league)
```

### 3. Node.js Version

```markdown
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
```

### 4. Build Status

```markdown
![Build Status](https://github.com/YOUR_USERNAME/fantasy-cricket-league/workflows/PR%20Validation/badge.svg)
```

### 5. License

```markdown
![License](https://img.shields.io/badge/license-MIT-blue.svg)
```

### 6. Deployment Status (Vercel)

```markdown
[![Vercel](https://vercelbadges.vercel.app/api/YOUR_USERNAME/fantasy-cricket-league)](https://fantasy-cricket-league.vercel.app)
```

## Complete README Example

```markdown
# Fantasy Cricket League

![CI/CD Pipeline](https://github.com/YOUR_USERNAME/fantasy-cricket-league/workflows/CI/CD%20Pipeline/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Build Status](https://github.com/YOUR_USERNAME/fantasy-cricket-league/workflows/PR%20Validation/badge.svg)

A comprehensive fantasy cricket league management system built with React, TypeScript, and Firebase.

## Features
- Real-time scoring and leaderboards
- Squad management with transfers
- Player performance tracking
- Analytics and insights

## Getting Started
...
```

## Setting Up Codecov

1. **Sign up at Codecov**
   - Go to https://codecov.io
   - Sign in with GitHub
   - Add your repository

2. **Get your token**
   - Navigate to your repo in Codecov
   - Go to Settings
   - Copy the upload token

3. **Add to GitHub Secrets**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `CODECOV_TOKEN`
   - Value: [paste token]

4. **Update README**
   - Replace `YOUR_USERNAME` with your GitHub username
   - The badge will automatically update after the first successful upload

## Coverage Badge Types

### Simple Badge
```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league)
```

### Detailed Coverage Badge
```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league)
```

### Coverage Graph
```markdown
[![Coverage Graph](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league/branch/main/graphs/sunburst.svg?token=YOUR_TOKEN)](https://codecov.io/gh/YOUR_USERNAME/fantasy-cricket-league)
```

## Custom Shields.io Badges

### Test Count
```markdown
![Tests](https://img.shields.io/badge/tests-50%2B-brightgreen)
```

### Coverage Percentage (Manual)
```markdown
![Coverage](https://img.shields.io/badge/coverage-50%25-yellow)
```

### Last Updated
```markdown
![Last Commit](https://img.shields.io/github/last-commit/YOUR_USERNAME/fantasy-cricket-league)
```

### Repository Stats
```markdown
![Stars](https://img.shields.io/github/stars/YOUR_USERNAME/fantasy-cricket-league?style=social)
![Forks](https://img.shields.io/github/forks/YOUR_USERNAME/fantasy-cricket-league?style=social)
```

## Dynamic Badges from GitHub Actions

You can also create dynamic badges that update automatically:

```markdown
![Test Status](https://img.shields.io/github/actions/workflow/status/YOUR_USERNAME/fantasy-cricket-league/ci.yml?label=tests)
![Coverage](https://img.shields.io/codecov/c/github/YOUR_USERNAME/fantasy-cricket-league)
```

## Replace Placeholders

Make sure to replace:
- `YOUR_USERNAME` with your actual GitHub username
- `YOUR_TOKEN` with your Codecov token (if using private repos)
- Update workflow file names if you renamed them

## Note

Badges will only appear after:
1. You push the code to GitHub
2. GitHub Actions runs for the first time
3. Codecov receives the first coverage upload

After the first successful run, all badges will update automatically with each push!
