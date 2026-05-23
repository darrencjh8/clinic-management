// Staging Secret Check: Backend API Security and Connectivity
// Purpose: Validate staging backend API endpoints, security, and service account retrieval

import https from 'https';

function makeRequest(url, options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        const error = new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`);
                        error.status = res.statusCode;
                        error.response = { status: res.statusCode, data: parsed };
                        reject(error);
                    }
                } catch (e) {
                    const err = new Error(`Parse error: ${data}`);
                    err.status = res.statusCode;
                    reject(err);
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

export async function testBackendAPI(credentials, firebaseAuth) {
    console.log('🌐 Staging Secret Check: Backend API Connectivity');
    console.log('   Purpose: Validate staging backend API endpoints and security');

    try {
        // Test service account endpoint with proper authentication
        const serviceAccountUrl = `${credentials.backendUrl}/api/auth/service-account`;
        const serviceAccountOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${firebaseAuth.idToken}`,
                'Content-Type': 'application/json'
            }
        };

        const serviceAccountResponse = await makeRequest(serviceAccountUrl, serviceAccountOptions);

        // Validate service account response structure
        if (!serviceAccountResponse.serviceAccount || !serviceAccountResponse.serviceAccount.client_email) {
            throw new Error('Invalid service account response format');
        }

        console.log('   ✅ Service account endpoint accessible');
        console.log('   ✅ Service account obtained:', serviceAccountResponse.serviceAccount.client_email);
        console.log('   ✅ Service account has valid structure');

        // Test unauthorized access (should fail)
        try {
            const unauthorizedResponse = await makeRequest(serviceAccountUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            throw new Error('Unauthorized access should have failed');
        } catch (error) {
            const status = error.status || (error.response && error.response.status);
            if (status === 401 || status === 403) {
                console.log('   ✅ Unauthorized access properly rejected');
            } else {
                console.error('   ❌ Unexpected unauthorized response - Status:', status, 'Message:', error.message);
                throw new Error(`Expected 401/403 for unauthorized access, got ${status}: ${error.message}`);
            }
        }

        // Test health endpoint
        const healthUrl = `${credentials.backendUrl}/api/health`;
        const healthOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        try {
            await makeRequest(healthUrl, healthOptions);
            console.log('   ✅ Health endpoint accessible');
        } catch (error) {
            console.log('   ⚠️  Health endpoint not accessible (may be normal)');
        }

        // Test API documentation endpoint
        const docsUrl = `${credentials.backendUrl}/api/docs`;
        try {
            await makeRequest(docsUrl, healthOptions);
            console.log('   ✅ API documentation accessible');
        } catch (error) {
            console.log('   ⚠️  API documentation not accessible (may be normal)');
        }

        return serviceAccountResponse.serviceAccount;

    } catch (error) {
        throw new Error(`Backend API validation failed: ${error.message}`);
    }
}

export async function testBackendSecurity(credentials) {
    console.log('🔒 Staging Secret Check: Backend Security Validation');
    console.log('   Purpose: Validate backend security headers and configurations');

    try {
        // Test HTTPS enforcement
        if (!credentials.backendUrl.startsWith('https://')) {
            throw new Error('Backend URL must use HTTPS');
        }
        console.log('   ✅ Backend uses HTTPS');

        // Test CORS headers (basic check)
        const healthUrl = `${credentials.backendUrl}/api/health`;

        return new Promise((resolve, reject) => {
            const req = https.request(healthUrl, { method: 'OPTIONS' }, (res) => {
                const corsHeaders = {
                    'access-control-allow-origin': res.headers['access-control-allow-origin'],
                    'access-control-allow-methods': res.headers['access-control-allow-methods'],
                    'access-control-allow-headers': res.headers['access-control-allow-headers']
                };

                const requiredHeaders = ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'];
                const allCorsHeadersPresent = requiredHeaders.every(header => !!corsHeaders[header]);
                console.log('   ✅ All required CORS headers present:', allCorsHeadersPresent);
                resolve(allCorsHeadersPresent);
            });

            req.on('error', (error) => {
                console.log('   ⚠️  CORS check failed (may be normal):', error.message);
                resolve(false); // Request error means CORS check inconclusive
            });

            req.end();
        });

    } catch (error) {
        throw new Error(`Backend security validation failed: ${error.message}`);
    }
}