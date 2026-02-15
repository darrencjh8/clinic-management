# Integration Testing Guide

## Login Flow Integration Test

**Location:** `ui/tests/integration/test_login_flow.mjs`

This test validates the complete staff login flow outside of the React UI to verify backend and API functionality:

### What It Tests

1. **Firebase Authentication** - Login with email/password
2. **Backend API** - Fetch service account from `/api/auth/service-account`
3. **JWT Creation** - Sign JWT with service account private key
4. **Google OAuth** - Exchange JWT for access token
5. **Google Sheets API** - List spreadsheets using access token

### When to Run

Run this test when E2E tests fail at spreadsheet listing to determine if the issue is:
- **Backend/API problem** - If this test fails, the issue is with Firebase, backend, or Google APIs
- **UI problem** - If this test passes, the issue is in React component lifecycle or state management

### Running the Test

```bash
cd ui
node tests/integration/test_login_flow.mjs
```

### Expected Output

```
✅ SUCCESS: Service account can access spreadsheets!
   Total spreadsheets found: 2+
```

### Configuration

Uses credentials from `ui/.env.e2e`:
- `VITE_FIREBASE_API_KEY`
- Test email: chongjinheng@gmail.com
- Test password: 123456
- Backend URL: https://wisata-dental.fly.dev

### Troubleshooting

- **Firebase login fails**: Check API key and credentials
- **Backend API fails**: Verify service account secret is set in Fly.io
- **JWT exchange fails**: Check service account private key format
- **No spreadsheets found**: Verify service account has spreadsheets shared with it

## Integration with E2E Tests

The deploy-and-test script should run this integration test if E2E tests fail to provide diagnostic context about whether the backend is functioning correctly.
