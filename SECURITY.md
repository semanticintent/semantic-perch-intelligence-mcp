# Security Policy

## 🔒 Security Best Practices

This project follows security best practices for MCP servers and API token management:

### Secrets Management

**Never commit sensitive information to git:**

- ✅ `.env` - Contains API tokens and database IDs (excluded from git)
- ✅ `.env.local` - Local environment overrides (excluded from git)
- ✅ `.env.backup` - Backup credentials (excluded from git)
- ✅ `claude_desktop_config.json` - Contains credentials (user-managed)

**Safe to commit:**

- ✅ `.env.example` - Template with placeholders
- ✅ Source code without credentials
- ✅ Test files with mock data
- ✅ Configuration templates
- ✅ Documentation files

### Configuration Files

This repository provides example configuration files:

1. **.env.example** - Template for environment variables
   - Copy to `.env`
   - Replace placeholders with your actual values
   - Never commit the actual `.env` file

2. **Claude Desktop Config** - MCP server configuration
   - Edit via Claude Desktop settings
   - Stores credentials in `claude_desktop_config.json`
   - Managed by Claude Desktop (not in this repository)

### What Gets Committed

**Included in repository:**
- Source code (`.ts` files)
- Tests (`*.test.ts` files)
- Compiled JavaScript (`dist/` folder for npm package)
- Documentation (`.md` files)
- Configuration templates (`.example` files)
- GitHub Actions workflows
- Build configuration (`tsconfig.json`, `package.json`)

**Excluded from repository (.gitignore):**
- `.env*` - Environment variables and secrets
- `node_modules/` - Dependencies
- `coverage/` - Test coverage reports
- Temporary files and IDE configs

### For Contributors

When contributing:

1. **Never commit credentials** - Use `.env` file (excluded from git)
2. **Use example files** - Provide templates, not actual configs
3. **Review before push** - Run `git diff` to check for sensitive data
4. **Use .gitignore** - Ensure secrets are excluded
5. **Rotate exposed secrets** - If accidentally committed, rotate immediately

### API Token Security

**Cloudflare API Token Management:**

- API tokens grant **full access** to your Cloudflare account
- Treat API tokens like passwords - never share or commit them
- Use scoped tokens with minimum required permissions:
  - D1 Read access (for schema introspection)
  - Limit to specific account ID
- Rotate tokens regularly (every 90 days recommended)
- Revoke tokens immediately if compromised

**Database ID Security:**

- Database IDs are **not highly sensitive** but should be kept private
- They cannot be used without a valid API token
- Separate databases for development, staging, and production
- Never expose production database IDs in examples

### MCP Server Security

**Model Context Protocol (MCP):**

- MCP servers run locally and communicate via stdio
- Credentials stored in Claude Desktop config (user's local machine)
- No network exposure by default
- All API calls originate from local machine

**Security Boundaries:**

- MCP server → Cloudflare D1 REST API (HTTPS only)
- Environment isolation (dev/staging/prod databases)
- Read-only schema introspection (no data modification)
- Caching layer prevents excessive API calls

## 🚨 Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Email: security@semanticintent.dev
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## 🔐 Security Features

This project implements:

- ✅ **TypeScript Strict Mode** - Type safety prevents runtime errors
- ✅ **Input Validation** - Domain entities validate all inputs
- ✅ **Error Handling** - Graceful degradation without leaking sensitive info
- ✅ **Dependency Audits** - `npm audit` in CI/CD pipeline
- ✅ **Automated Testing** - 398 tests prevent security regressions
- ✅ **Immutable Entities** - `Object.freeze()` prevents mutation
- ✅ **Environment Isolation** - Separate dev/staging/prod configurations
- ✅ **Cache TTL** - 10-minute expiration prevents stale data attacks
- ✅ **HTTPS-Only** - All Cloudflare API calls use HTTPS

## 📋 Security Checklist for Deployment

Before deploying to production:

- [ ] `.env` file is in `.gitignore` ✅ (already configured)
- [ ] API tokens are not in git history
- [ ] No `.env` or credential files committed
- [ ] All tests passing (`npm test`)
- [ ] No `npm audit` vulnerabilities (check with `npm audit`)
- [ ] Secrets rotated if ever exposed
- [ ] Production database access restricted
- [ ] Claude Desktop config uses production credentials only in production
- [ ] Verify `.npmignore` excludes source files and tests

## 🛡️ API Token Best Practices

### Creating a Scoped Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use **Custom Token** template
5. Set permissions:
   - Account → D1 → Read
6. Set account restriction to your account ID
7. Save token securely (shown only once!)

### Token Rotation

Rotate API tokens every 90 days:

1. Create new token with same permissions
2. Update `.env` file with new token
3. Test MCP server functionality
4. Revoke old token in Cloudflare Dashboard

### Token Compromise Response

If your API token is compromised:

1. **Immediately** revoke the token in Cloudflare Dashboard
2. Create a new token with different permissions if possible
3. Update `.env` file and Claude Desktop config
4. Review Cloudflare audit logs for unauthorized access
5. Report the incident to security@semanticintent.dev

## 🔄 Regular Maintenance

- **Weekly**: Check for dependency updates
- **Monthly**: Update dependencies (`npm update`)
- **Monthly**: Run security audits (`npm audit`)
- **Quarterly**: Rotate API tokens
- **Quarterly**: Review and update access controls

## 🔍 What's Safe to Share

**✅ Safe to Share Publicly:**
- This repository (source code, tests, documentation)
- Build artifacts (`dist/` folder)
- npm package (`@semanticintent/semantic-d1-mcp`)
- Database schema structure (no data)
- Sample queries and examples

**❌ Never Share Publicly:**
- Cloudflare API tokens
- Database IDs (especially production)
- Environment variable files (`.env`)
- Claude Desktop config with credentials
- Actual database data
- Logs containing credentials

## 📞 Security Contacts

- **Email**: security@semanticintent.dev
- **Response Time**: Within 48 hours
- **GPG Key**: Available upon request

---

**Last Updated:** 2025-10-07
**Security Contact:** security@semanticintent.dev
