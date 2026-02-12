# Scripts

> **Fork Document**: This document was created as part of the community fork [sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop).
> Based on the original [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) project. All original code and IP belong to ByteDance.

All project scripts organized by category.

## 📁 Folder Structure

```
scripts/
├── build/                # Build & packaging scripts
│   ├── build-quick.bat       # Quick build (skip type checks & dependency build)
│   └── build-windows.bat     # Full Windows build with environment checks
├── dev/                  # Development & startup scripts
│   └── start-secure.bat      # Secure startup with security audit
├── release/              # Release & publishing scripts
│   ├── release-beta-pkgs.sh  # Publish beta packages
│   └── release-pkgs.sh       # Publish release packages
├── test/                 # Testing scripts
│   └── test-integration.bat  # Run integration tests
├── merge-yml/            # YAML merge utilities
└── vitest-setup.ts       # Vitest test setup
```

## Usage

### Build

```bat
# Quick build (from project root)
scripts\build\build-quick.bat

# Full Windows build with checks
scripts\build\build-windows.bat
```

### Dev

```bat
# Secure startup with audit
scripts\dev\start-secure.bat
```

### Test

```bat
# Run integration tests
scripts\test\test-integration.bat
```

### Release

```bash
# Publish beta packages (Linux/macOS)
bash scripts/release/release-beta-pkgs.sh

# Publish release packages
bash scripts/release/release-pkgs.sh
```

> **Note:** `.sh` scripts under `multimodal/` subprojects are kept in their original locations as they belong to those packages.
