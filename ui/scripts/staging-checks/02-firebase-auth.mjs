// Staging Secret Check: Firebase Authentication Flow
// Purpose: Validate Firebase authentication with staging credentials and test complete auth chain

import https from 'https';

export async function testFirebaseAuthentication(credentials) {
    console.log('🔥 Staging Secret Check: Firebase Authentication');
    console.log('   Purpose: Validate Firebase authentication with staging credentials');

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${credentials.firebaseApiKey}`;

    const postData = JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        returnSecureToken: true
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        // Validate response structure
                        if (!response.idToken || !response.refreshToken || !response.localId) {
                            reject(new Error('Missing required authentication tokens'));
                            return;
                        }

                        console.log('   ✅ Firebase authentication successful');
                        console.log('   ✅ ID token obtained (length:', response.idToken.length, ')');
                        console.log('   ✅ Refresh token obtained (length:', response.refreshToken.length, ')');
                        console.log('   ✅ User ID:', response.localId);
                        console.log('   ✅ Email verified:', response.emailVerified);

                        resolve(response);
                    } else {
                        reject(new Error(`Authentication failed: ${response.error?.message || 'Unknown error'}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Test token refresh functionality
export async function testFirebaseTokenRefresh(credentials, refreshToken) {
    console.log('🔄 Staging Secret Check: Firebase Token Refresh');
    console.log('   Purpose: Validate Firebase token refresh mechanism');

    try {
        const url = `https://securetoken.googleapis.com/v1/token?key=${credentials.firebaseApiKey}`;

        const postData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            if (!response.id_token || !response.refresh_token) {
                                reject(new Error('Missing tokens in refresh response'));
                                return;
                            }

                            console.log('   ✅ Token refresh successful');
                            console.log('   ✅ New ID token obtained');
                            console.log('   ✅ New refresh token obtained');

                            resolve(response);
                        } else {
                            reject(new Error(`Token refresh failed: ${response.error?.message || 'Unknown error'}`));
                        }
                    } catch (e) {
                        reject(new Error(`Parse error: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });

    } catch (error) {
        throw new Error(`Firebase token refresh failed: ${error.message}`);
    }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    // This would need credentials to be passed or loaded
    console.log('This test requires staging credentials to be loaded.');
    console.log('Run the complete staging secret checks suite instead.');
}