# Security Policy

> **Note:** This project is a community fork of [ByteDance UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop).
> This fork ([sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop)) inherits and extends the original security policy.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do NOT create a public GitHub issue for security vulnerabilities.**

- **For issues in the original project:** report to https://github.com/bytedance/UI-TARS-desktop/security
- **For issues specific to this fork:** use [GitHub Security Advisories](https://github.com/sjkncs/UI-TARS-desktop/security/advisories/new) (private disclosure)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact assessment

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 1 week |
| Fix release | Within 2 weeks for critical issues |

## Security Features

This project implements the following security measures:

### Automated Scanning
- **Dependabot** — Automated dependency updates for npm packages and GitHub Actions
- **CodeQL Analysis** — Static code analysis on every push and weekly schedule
- **Secret Scanning** — Prevents accidental commit of secrets, tokens, and keys
- **Secretlint** — Custom secret detection rules (see `packages/common/configs/secretlintrc.js`)

### Application Security
- **Loopback-only Gateway** — Network gateway binds to `127.0.0.1` only, no external access
- **Command Validation** — Dangerous commands and system paths are blocked at runtime
- **Operation Authorization** — Destructive file, system, and network operations require user consent
- **Audit Logging** — All validated operations are recorded for security review
- **Key Isolation** — Private keys are generated locally with `0o600` permissions, never committed

### Electron Security
- **Preload Scripts** — Renderer processes use preload scripts with `sandbox: false` (required for IPC)
- **Bytecode Protection** — App private key chunk is compiled to bytecode via `electron-vite`
- **Context Isolation** — Enabled for main windows (note: overlay windows use `nodeIntegration` for screen annotation)

## Security Configuration

The project uses `security.config.json` for runtime security rules. **Do not commit local overrides** — use `security.config.local.json` (gitignored) for machine-specific paths.

## Best Practices for Contributors

1. **Never commit secrets** — Use `.env` files (gitignored) for API keys and tokens
2. **Keep dependencies updated** — Review and merge Dependabot PRs promptly
3. **Review CodeQL alerts** — Address all security findings before merging
4. **Use environment variables** — All sensitive configuration via `process.env`
5. **Validate all inputs** — Especially file paths and user-provided commands

## Security Advisories

Security advisories will be published for all confirmed vulnerabilities affecting the latest version.

