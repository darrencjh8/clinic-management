# API Documentation - Updated for CSP System

## Overview

This document describes the API endpoints and authentication flows that are affected by the Content Security Policy (CSP) configuration system. The CSP system impacts API connectivity, authentication flows, and cross-origin requests.

## Environment-Specific API Endpoints

### Development Environment

**CSP Configuration**: `csp-development.json`

**API Base URL**: `http://localhost:3001`

**Allowed Origins**:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3001` (API server)
- All Firebase domains

**CSP Directives**:
```json
{
  "connect-src": [
    "'self'",
    "http://localhost:*",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://accounts.google.com"
  ]
}
```

### Staging Environment

**CSP Configuration**: `csp-staging.json`

**API Base URL**: `https://wisata-dental-staging.fly.dev`

**Allowed Origins**:
- `https://wisata-dental-staging.fly.dev`
- All Firebase domains
- Google API domains

**CSP Directives**:
```json
{
  "connect-src": [
    "'self'",
    "https://wisata-dental-staging.fly.dev",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://accounts.google.com"
  ]
}
```

### Production Environment

**CSP Configuration**: `csp-production.json`

**API Base URL**: Production API endpoint (configured in environment variables)

**Allowed Origins**:
- Production domain only
- Production Firebase domains
- Production Google API domains

**CSP Directives**:
```json
{
  "connect-src": [
    "'self'",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://accounts.google.com"
  ]
}
```

## Authentication API Integration

### Firebase Authentication

The CSP system affects Firebase authentication endpoints:

**CSP Configuration Required**:
```json
{
  "connect-src": [
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://accounts.google.com"
  ],
  "script-src": [
    "https://www.gstatic.com/firebasejs/"
  ],
  "frame-src": [
    "https://accounts.google.com"
  ]
}
```

**Authentication Flow**:
1. User enters credentials on login form
2. Firebase SDK makes authentication request
3. CSP must allow Firebase domains for successful authentication
4. Authentication tokens are stored and used for subsequent API calls

### Google OAuth Integration

**CSP Configuration Required**:
```json
{
  "connect-src": [
    "https://accounts.google.com",
    "https://oauth2.googleapis.com"
  ],
  "frame-src": [
    "https://accounts.google.com"
  ]
}
```

## API Request Patterns

### Environment-Specific Requests

The application automatically configures API requests based on the deployment environment:

```typescript
// Environment-specific API configuration
const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3001',
    cspDomains: ['http://localhost:3001', 'http://localhost:5173']
  },
  staging: {
    baseUrl: 'https://wisata-dental-staging.fly.dev',
    cspDomains: ['https://wisata-dental-staging.fly.dev']
  },
  production: {
    baseUrl: process.env.VITE_API_URL,
    cspDomains: [process.env.VITE_API_URL]
  }
};
```

### CSP-Affected API Endpoints

#### Authentication Endpoints

```typescript
// Firebase Authentication
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp
POST https://securetoken.googleapis.com/v1/token

// Google OAuth
GET https://accounts.google.com/o/oauth2/v2/auth
POST https://oauth2.googleapis.com/token
```

#### Application API Endpoints

```typescript
// Patient Management
GET ${API_BASE_URL}/api/patients
POST ${API_BASE_URL}/api/patients
PUT ${API_BASE_URL}/api/patients/:id
DELETE ${API_BASE_URL}/api/patients/:id

// Appointment Management
GET ${API_BASE_URL}/api/appointments
POST ${API_BASE_URL}/api/appointments
PUT ${API_BASE_URL}/api/appointments/:id
DELETE ${API_BASE_URL}/api/appointments/:id

// Spreadsheet Integration
GET ${API_BASE_URL}/api/spreadsheet/:id
POST ${API_BASE_URL}/api/spreadsheet/:id/sync
```

## CSP Impact on API Calls

### Cross-Origin Requests

CSP affects cross-origin requests through the `connect-src` directive:

```typescript
// This request will fail if CSP doesn't allow the domain
fetch('https://wisata-dental-staging.fly.dev/api/patients')
  .then(response => response.json())
  .then(data => console.log(data));
```

### WebSocket Connections

WebSocket connections are also affected by CSP:

```typescript
// WebSocket connection must be allowed by CSP
const ws = new WebSocket('wss://wisata-dental-staging.fly.dev/ws');
```

### AJAX Requests

All AJAX requests must comply with CSP directives:

```typescript
// XMLHttpRequest
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://wisata-dental-staging.fly.dev/api/patients');
xhr.send();

// Fetch API
fetch('https://wisata-dental-staging.fly.dev/api/patients')
  .then(response => response.json());
```

## Environment Variable Configuration

### Required Environment Variables

```bash
# API Configuration
VITE_API_URL=https://your-api-domain.com

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_CLIENT_SECRET=your-google-client-secret
```

### CSP-Specific Environment Variables

```bash
# Deployment environment (affects CSP selection)
DEPLOYMENT_ENV=development|staging|production

# Optional: Custom CSP report path
CSP_REPORT_PATH=csp-report.md
```

## Testing API Integration

### Integration Test Setup

```typescript
// Integration test configuration
const testConfig = {
  development: {
    baseUrl: 'http://localhost:3001',
    cspConfig: 'csp-development.json'
  },
  staging: {
    baseUrl: 'https://wisata-dental-staging.fly.dev',
    cspConfig: 'csp-staging.json'
  }
};
```

### Test Scenarios

#### Authentication Flow Test

```typescript
// Test Firebase authentication
async function testAuthentication() {
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.E2E_TEST_EMAIL,
      password: process.env.E2E_TEST_PASSWORD,
      returnSecureToken: true
    })
  });
  
  return response.ok;
}
```

#### API Connectivity Test

```typescript
// Test API connectivity
async function testAPIConnectivity() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return response.ok;
}
```

#### CSP Validation Test

```typescript
// Test CSP configuration
async function testCSPConfiguration() {
  const cspConfig = loadCSPConfig(DEPLOYMENT_ENV);
  validateCSPConfig(cspConfig, DEPLOYMENT_ENV);
  return true;
}
```

## Error Handling

### CSP Violation Errors

```typescript
// Handle CSP violations
try {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
} catch (error) {
  if (error.message.includes('Content Security Policy')) {
    console.error('CSP violation detected. Check CSP configuration.');
  }
  throw error;
}
```

### Network Errors

```typescript
// Handle network errors with CSP awareness
async function safeAPIRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Network error. Check CSP configuration for allowed domains.');
    }
    throw error;
  }
}
```

## Security Considerations

### CSP and API Security

1. **Domain Validation**: Ensure only authorized domains are in CSP
2. **Environment Separation**: Never mix development/staging domains in production
3. **Regular Updates**: Review and update CSP configurations regularly
4. **Monitoring**: Monitor CSP violation reports for unauthorized access attempts

### Best Practices

1. **Principle of Least Privilege**: Only allow necessary domains
2. **Environment-Specific Configurations**: Use appropriate CSP for each environment
3. **Regular Testing**: Test API integration in all environments
4. **Security Reviews**: Include CSP in security reviews

## References

- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)