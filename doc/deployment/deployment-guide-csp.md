# Deployment Guide - Updated for CSP System

## Prerequisites

Before deploying, ensure you have:
- Node.js 20+ installed
- Access to deployment secrets
- Understanding of the CSP configuration system
- Valid CSP configuration files for target environment

## Environment-Specific Deployment

### 1. Development Deployment

**CSP Configuration**: Uses `csp-development.json`

```bash
# Set deployment environment
export DEPLOYMENT_ENV=development

# Install dependencies
npm ci

# Build with development CSP
npm run build

# Start development server
npm run dev
```

**CSP Features**:
- Allows localhost connections
- Permissive for development flexibility
- Includes all development domains

### 2. Staging Deployment

**CSP Configuration**: Uses `csp-staging.json`

```bash
# Set deployment environment
export DEPLOYMENT_ENV=staging

# Install dependencies
npm ci

# Build with staging CSP
npm run build

# Deploy to staging
flyctl deploy --app wisata-dental-staging --config fly.staging.toml
```

**CSP Features**:
- Allows staging backend connections
- Restrictive but includes staging-specific domains
- Prepares for production security requirements

### 3. Production Deployment

**CSP Configuration**: Uses `csp-production.json`

```bash
# Set deployment environment
export DEPLOYMENT_ENV=production

# Install dependencies
npm ci

# Build with production CSP
npm run build

# Deploy to production
flyctl deploy --app wisata-dental --config fly.production.toml
```

**CSP Features**:
- Strictest security policy
- No localhost or staging URLs
- Only production-appropriate domains

## Build Process Integration

### Automated CSP Injection

The build process automatically:
1. Loads the appropriate CSP configuration based on `DEPLOYMENT_ENV`
2. Validates the configuration against environment-specific rules
3. Generates a CSP report (`csp-report.md`)
4. Injects the CSP meta tag into `index.html`

### Build Validation

The build will fail if:
- CSP configuration file is missing
- CSP configuration is invalid JSON
- Production CSP contains localhost/staging URLs
- CSP validation rules are violated

### Build Output

After successful build, check:
- `csp-report.md` - Complete CSP configuration report
- `dist/index.html` - Verify CSP meta tag injection
- Build logs - Confirm CSP plugin execution

## CI/CD Pipeline Integration

### Staging Pipeline

```yaml
# CI/CD automatically sets:
DEPLOYMENT_ENV=staging

# Integration tests validate:
- CSP configuration for staging
- Firebase authentication flow
- API connectivity to staging backend
```

### Production Pipeline

```yaml
# CI/CD automatically sets:
DEPLOYMENT_ENV=production

# Additional validation:
- Production CSP security rules
- No staging/localhost domains
- Strict security compliance
```

## Environment Variables

### Required for All Environments

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# Google Services
VITE_GOOGLE_CLIENT_ID
VITE_CLIENT_SECRET

# Application Configuration
VITE_API_URL
VITE_CLINIC_NAME
```

### CSP-Specific

```bash
# Deployment environment (development|staging|production)
DEPLOYMENT_ENV

# Optional: Custom CSP report path
CSP_REPORT_PATH=csp-report.md
```

## Pre-Deployment Checklist

### For All Environments

- [ ] CSP configuration file exists for target environment
- [ ] All required environment variables are set
- [ ] Build completes successfully
- [ ] CSP report is generated
- [ ] No CSP validation errors

### For Staging

- [ ] Staging backend URL is in CSP configuration
- [ ] Integration tests pass
- [ ] E2E tests pass against staging

### For Production

- [ ] No localhost URLs in CSP
- [ ] No staging URLs in CSP
- [ ] Production CSP validation passes
- [ ] All integration and E2E tests pass
- [ ] Manual security review completed

## Troubleshooting Deployment Issues

### CSP Violation Errors

**Symptom**: Browser console shows CSP violation errors
**Solution**:
1. Check `csp-report.md` for current configuration
2. Identify missing domains in CSP directives
3. Update appropriate environment configuration file
4. Rebuild and redeploy

### Build Failures

**Symptom**: Build fails with CSP validation errors
**Solution**:
1. Check build logs for specific validation errors
2. Verify `DEPLOYMENT_ENV` is set correctly
3. Ensure CSP configuration file exists and is valid
4. Check for localhost/staging URLs in production config

### Missing CSP Meta Tag

**Symptom**: No CSP meta tag in built HTML
**Solution**:
1. Verify CSP plugin is configured in `vite.config.ts`
2. Check that `<!-- CSP_PLACEHOLDER -->` exists in `index.html`
3. Ensure build process completes without errors
4. Check build output for CSP plugin logs

### Environment Variable Issues

**Symptom**: Wrong CSP configuration loaded
**Solution**:
1. Verify `DEPLOYMENT_ENV` is set correctly
2. Check environment variable precedence
3. Ensure no conflicting environment variables
4. Review build logs for CSP plugin messages

## Rollback Procedures

### Immediate Rollback

If deployment causes CSP issues:

```bash
# Rollback to previous version
flyctl deploy --app wisata-dental --image <previous-image>

# Or rollback to previous release
flyctl releases list --app wisata-dental
flyctl releases rollback <release-id> --app wisata-dental
```

### Configuration Rollback

If CSP configuration needs adjustment:

1. Update the appropriate CSP configuration file
2. Rebuild with corrected configuration
3. Redeploy with fixed CSP
4. Verify CSP report shows correct configuration

## Security Considerations

### Production Security

- Never include localhost or staging URLs in production CSP
- Regularly review and update CSP configurations
- Monitor CSP violation reports
- Follow principle of least privilege

### Environment Separation

- Maintain strict separation between environments
- Use different Firebase projects for each environment
- Validate CSP configurations before deployment
- Test thoroughly in staging before production

## Monitoring and Maintenance

### Post-Deployment

- Monitor browser console for CSP violations
- Review CSP reports regularly
- Update configurations as services change
- Document any CSP-related issues and resolutions

### Regular Maintenance

- Review CSP configurations quarterly
- Update as new services are integrated
- Remove obsolete domains
- Validate security compliance

## Support

For CSP-related issues:
1. Check the CSP configuration documentation
2. Review the generated CSP report
3. Consult the troubleshooting section
4. Review browser console for specific violations
5. Contact development team for complex issues