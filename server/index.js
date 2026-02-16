const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
// Expects FIREBASE_SERVICE_ACCOUNT_BASE64 to be the base64 encoded JSON string of the service account
let firebaseInitialized = false;
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.error('WARNING: FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in .env. API endpoints requiring auth will fail.');
} else {
    try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(decoded);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        console.log('Firebase Admin Initialized');
    } catch (error) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', error);
    }
}

app.use(cors());
app.use(express.json());

// Middleware to verify Firebase ID Token
const verifyToken = async (req, res, next) => {
    if (!firebaseInitialized) {
        return res.status(500).json({ error: 'Server misconfigured: Firebase not initialized' });
    }

    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).json({ error: 'Unauthorized' });
    }
};

// Endpoint to get the Google Sheets Service Account
app.post('/api/auth/service-account', verifyToken, (req, res) => {
    // Check if GOOGLE_SERVICE_ACCOUNT_BASE64 is present
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        console.error('GOOGLE_SERVICE_ACCOUNT_BASE64 is missing');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
        const googleServiceAccount = JSON.parse(decoded);
        res.json({ serviceAccount: googleServiceAccount });
    } catch (error) {
        console.error('Error parsing Google Service Account:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// Serve static files from the React app
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
