# Staging Secret Checks

This directory contains comprehensive staging environment validation tests that verify critical security configurations, authentication flows, API endpoints, and database interactions before production deployment.

## Purpose

Staging Secret Checks are designed to:
- Validate staging environment credentials and configurations
- Test complete authentication flows (Firebase → Backend → Google Services)
- Verify API endpoint functionality and security
- Ensure database connectivity and data integrity
- Confirm CSP (Content Security Policy) configurations
- Validate environment-specific settings

## Test Coverage

### Authentication Flow Tests
- Firebase authentication with staging credentials
- Backend service account retrieval
- Google OAuth token generation
- Complete login flow validation

### API Endpoint Tests
- Staging backend API connectivity
- Authentication endpoint validation
- Service account endpoint security
- Error handling and response validation

### Database Interaction Tests
- Google Sheets API connectivity
- Spreadsheet listing and access validation
- Data integrity checks
- Service account permissions verification

### Security Configuration Tests
- CSP configuration validation
- Environment variable verification
- Secret management validation
- Production security constraints

### Environment-Specific Tests
- Staging backend URL validation
- Firebase project configuration
- Google Cloud service account access
- Environment variable consistency

## Test Execution

Tests are executed as part of the CI/CD pipeline and must pass before:
- E2E tests can run
- Production deployment can proceed
- Any staging environment changes can be promoted

## Success Criteria

All staging secret checks must pass, confirming:
✅ Staging credentials are valid and functional
✅ Authentication flows work end-to-end
✅ API endpoints respond correctly
✅ Database connections are established
✅ Security configurations are properly applied
✅ Environment-specific settings are correct

## Failure Handling

If any staging secret check fails:
1. Pipeline stops immediately
2. No E2E tests are executed
3. No production deployment occurs
4. Detailed error logs are provided for debugging
5. Team is notified of the failure