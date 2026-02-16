# Content Security Policy (CSP) Configuration System

## Overview

This document describes the environment-specific Content Security Policy (CSP) configuration system implemented for the Wisata Dental application. The system ensures that each deployment environment (development, staging, production) has appropriate CSP directives while maintaining security best practices.

## Architecture

### Environment-Specific Configuration Files

The CSP system uses dedicated configuration files for each environment:

```
ui/csp-config/
├── csp-development.json    # Development environment CSP
├── csp-staging.json        # Staging environment CSP
└── csp-production.json     # Production environment CSP
```

### Build-Time Injection

The CSP meta tag is injected at build time using a Vite plugin (`vite-csp-plugin.ts`) that:
1. Loads the appropriate CSP configuration based on the deployment environment
2. Validates the configuration against environment-specific security rules
3. Generates a CSP report for documentation
4. Injects the CSP meta tag into the HTML

## Configuration Structure

Each CSP configuration file follows this structure:

```json
{
  "environment": "development|staging|production",
  "description": "Human-readable description",
  "directives": {
    "directive-name": ["source1", "source2", ...]
  },
  "domains": {
    "category": "domain|array_of_domains"
  },
  "security_notes": ["optional security notes"]
}
```

### Directives Explained

- **`default-src 'self'`**: Default fallback for other directives, only allows same-origin
- **`script-src`**: Allowed JavaScript sources
- **`style-src`**: Allowed CSS sources
- **`img-src`**: Allowed image sources
- **`connect-src`**: Allowed AJAX/WebSocket/HTTP connections
- **`frame-src`**: Allowed iframe sources

## Environment-Specific Configurations

### Development Environment

**File**: `csp-development.json`

**Key Features**:
- Allows localhost connections for local development
- Permissive CSP for development flexibility
- Includes all necessary development domains

**Allowed Domains**:
- `http://localhost:*` - Local development server
- All Firebase domains
- All Google API domains

### Staging Environment

**File**: `csp-staging.json`

**Key Features**:
- Allows staging backend connections
- Restrictive but includes staging-specific domains
- Prepares for production security requirements

**Allowed Domains**:
- `https://wisata-dental-staging.fly.dev` - Staging backend
- All Firebase domains
- All Google API domains

### Production Environment

**File**: `csp-production.json`

**Key Features**:
- Strictest security policy
- No localhost or staging URLs
- Only production-appropriate domains
- Enhanced security notes

**Allowed Domains**:
- Only production Firebase domains
- Only production Google API domains
- No development or staging URLs

## Usage

### Build Configuration

The build system automatically selects the appropriate CSP configuration based on the `DEPLOYMENT_ENV` environment variable:

```bash
# Development build
DEPLOYMENT_ENV=development npm run build

# Staging build
DEPLOYMENT_ENV=staging npm run build

# Production build
DEPLOYMENT_ENV=production npm run build
```

If `DEPLOYMENT_ENV` is not set, the system falls back to `NODE_ENV` and then defaults to `development`.

### Vite Plugin Configuration

The CSP plugin is configured in `vite.config.ts`:

```typescript
viteCSPPlugin({
  environment: process.env.DEPLOYMENT_ENV || process.env.NODE_ENV || 'development',
  generateReport: true,
  reportPath: 'csp-report.md'
})
```

### CSP Report Generation

After each build, a CSP report is generated as `csp-report.md` containing:
- Complete CSP meta tag
- Directive breakdown
- Domain categories
- Security notes

## Security Validation

### Production Security Rules

The system enforces strict security rules for production deployments:

1. **No Localhost URLs**: Production CSP cannot contain `localhost`
2. **No Staging URLs**: Production CSP cannot contain staging domains
3. **No fly.dev URLs**: Production CSP cannot contain fly.dev domains
4. **Domain Whitelist**: Only production-appropriate domains allowed

### Build Validation

The build process validates CSP configurations:

```typescript
// Example validation logic
if (environment === 'production') {
  const cspString = generateCSPTagContent(config);
  
  if (cspString.includes('localhost')) {
    throw new Error('Production CSP should not contain localhost URLs');
  }
  
  if (cspString.includes('staging') || cspString.includes('fly.dev')) {
    throw new Error('Production CSP should not contain staging URLs');
  }
}
```

## Integration with CI/CD

### Pipeline Integration

The CI/CD pipeline includes CSP validation in the integration test stage:

```yaml
- name: Test CSP configuration
  run: |
    node -e "
      const config = require('./scripts/csp-manager.ts');
      const stagingConfig = config.loadCSPConfig('staging');
      config.validateCSPConfig(stagingConfig, 'staging');
      console.log('✅ Staging CSP configuration validated');
    "
```

### Deployment Environment Variables

Each deployment environment sets the appropriate `DEPLOYMENT_ENV`:

```yaml
# Staging deployment
echo "DEPLOYMENT_ENV=staging" >> ui/.env-build

# Production deployment
echo "DEPLOYMENT_ENV=production" >> ui/.env-build
```

## Troubleshooting

### Common Issues

1. **CSP Violation Errors**
   - Check browser console for CSP violation messages
   - Verify the correct environment configuration is loaded
   - Review the generated CSP report

2. **Build Failures**
   - Ensure CSP configuration files exist for the target environment
   - Check that the configuration is valid JSON
   - Verify environment variable is set correctly

3. **Missing Domains**
   - Add required domains to the appropriate environment configuration
   - Follow the security guidelines for production
   - Test thoroughly in staging before production deployment

### Debug Commands

```bash
# Generate CSP report for specific environment
node -e "
  const { generateCSPReport } = require('./scripts/csp-manager.ts');
  console.log(generateCSPReport('staging'));
"

# Validate CSP configuration
node -e "
  const { loadCSPConfig, validateCSPConfig } = require('./scripts/csp-manager.ts');
  const config = loadCSPConfig('production');
  validateCSPConfig(config, 'production');
  console.log('✅ Production CSP is valid');
"
```

## Best Practices

1. **Principle of Least Privilege**: Only allow domains that are absolutely necessary
2. **Environment Separation**: Never mix development/staging domains with production
3. **Regular Review**: Periodically review and update CSP configurations
4. **Security First**: When in doubt, be more restrictive and add exceptions as needed
5. **Testing**: Always test CSP changes in staging before production

## Migration from Hardcoded CSP

If you're migrating from a hardcoded CSP in `index.html`:

1. Remove the hardcoded CSP meta tag
2. Add the CSP placeholder: `<!-- CSP_PLACEHOLDER -->`
3. Create environment-specific configuration files
4. Update build scripts to set `DEPLOYMENT_ENV`
5. Test thoroughly in all environments

## References

- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)