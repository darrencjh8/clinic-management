# E2E Testing Implementation Guide

## Quick Fix: Firebase Mocking for E2E Tests

This approach allows E2E tests to run immediately without external dependencies.

### Step 1: Create Firebase Mock

Create `ui/src/mocks/firebase.ts`:
```typescript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Mock user for testing
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

// Mock auth state
let mockAuthState = {
  isAuthenticated: false,
  user: null,
  error: null
};

export const mockFirebaseAuth = {
  // Mock signIn function
  signIn: async (email: string, password: string) => {
    // Simulate successful login
    mockAuthState = {
      isAuthenticated: true,
      user: mockUser,
      error: null
    };
    return mockUser;
  },

  // Mock signOut function
  signOut: async () => {
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      error: null
    };
  },

  // Mock getCurrentUser
  getCurrentUser: () => mockAuthState.user,

  // Mock auth state getter
  getAuthState: () => mockAuthState,

  // Reset for test isolation
  reset: () => {
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      error: null
    };
  }
};
```

### Step 2: Update Firebase Config

Modify `ui/src/config/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Check if we're in E2E test mode
const isE2ETest = import.meta.env.MODE === 'e2e-test' || window.location.pathname.includes('/test-e2e');

// Mock config for E2E tests
const mockFirebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'mock.firebaseapp.com',
  projectId: 'mock-project',
  storageBucket: 'mock.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123:web:abc'
};

// Use mock config in E2E tests, real config otherwise
const firebaseConfig = isE2ETest ? mockFirebaseConfig : {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Step 3: Create E2E Test Configuration

Update `ui/playwright.config.ts`:
```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Set E2E test mode
      NODE_ENV: 'e2e-test',
      VITE_FIREBASE_API_KEY: 'mock-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'mock.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'mock-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'mock.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      VITE_FIREBASE_APP_ID: '1:123:web:abc',
      VITE_GOOGLE_CLIENT_ID: 'mock-google-client-id'
    }
  },
});
```

### Step 4: Update E2E Test Script

Create `ui/run-e2e-mock.ps1`:
```powershell
# E2E Test Runner with Firebase Mocking
#powershell -ExecutionPolicy Bypass -File .\run-e2e-mock.ps1

$ErrorActionPreference = "Stop"

function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$Message (Exit Code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

# Kill existing processes
Write-Output "Cleaning up existing processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start dev server with mock environment
Write-Output "Starting dev server with mock Firebase..."
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden

# Wait for server
Write-Output "Waiting for dev server to start..."
$maxAttempts = 30
$attempt = 0
$serverReady = $false
while ($attempt -lt $maxAttempts -and -not $serverReady) {
    Start-Sleep -Seconds 2
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
            $serverReady = $true
            Write-Output "Dev server is ready!"
        }
    } catch {
        Write-Output "Waiting... ($attempt/$maxAttempts)"
    }
}

if (-not $serverReady) {
    Write-Error "Dev server failed to start"
    exit 1
}

try {
    Write-Output "Running E2E tests..."
    npx playwright test --project=chromium
    Check-Error "E2E tests failed"
    Write-Output "E2E tests passed!"
} finally {
    if ($serverProcess) {
        Write-Output "Stopping dev server..."
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
```

### Step 5: Update Package.json

Add E2E test script to `ui/package.json`:
```json
{
  "scripts": {
    "test:e2e": "powershell -ExecutionPolicy Bypass -File ./run-e2e-mock.ps1"
  }
}
```

### Step 6: Create Basic E2E Test

Create `ui/tests/e2e/basic.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('E2E - App loads without Firebase errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    await page.goto('/');
    
    // Wait for any errors
    await page.waitForTimeout(2000);
    
    // Should have no Firebase errors (using mock)
    const firebaseErrors = consoleErrors.filter(e => e.includes('Firebase'));
    expect(firebaseErrors).toHaveLength(0);
    
    // Page should load successfully
    const title = await page.title();
    expect(title).toBeTruthy();
});

test('E2E - Login screen renders', async ({ page }) => {
    await page.goto('/');
    
    // Should see login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
});
```

## Usage

Run E2E tests with:
```bash
npm run test:e2e
```

This approach provides immediate E2E testing capability without external service dependencies.
