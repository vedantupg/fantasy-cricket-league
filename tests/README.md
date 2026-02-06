# Tests Directory

This directory contains test-related documentation and resources.

## 📁 Structure

```
tests/
├── docs/                          # All test documentation
│   ├── README.md                  # Documentation index (start here!)
│   ├── TESTING.md                 # Complete testing guide
│   ├── CI_CD_SETUP_COMPLETE.md    # CI/CD setup overview
│   ├── TEST_SETUP_SUMMARY.md      # Quick reference
│   ├── GITHUB_BADGES.md           # Status badges setup
│   ├── KNOWN_TEST_ISSUES.md       # Test issues tracking
│   ├── KNOWN_TEST_ISSUES_DETAILED.md # Detailed analysis
│   ├── BENCH_TRANSFER_VERIFICATION.md # Code verification
│   └── TEST_FIX_LOG.md            # Change log
└── README.md                      # This file
```

## 🚀 Quick Links

- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[Testing Guide](./docs/TESTING.md)** - How to write and run tests
- **[CI/CD Setup](./docs/CI_CD_SETUP_COMPLETE.md)** - Pipeline configuration

## 📝 Test Files Location

The actual test files are located in:
```
src/__tests__/
├── integration/        # Integration tests
├── *.test.ts          # Unit tests
└── *.test.tsx         # Component tests
```

## 🎯 Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# View coverage report
open coverage/lcov-report/index.html
```

## 📚 Need Help?

Start with **[docs/README.md](./docs/README.md)** for a complete guide to all available documentation.
