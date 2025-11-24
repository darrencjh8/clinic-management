const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
// Expects FIREBASE_SERVICE_ACCOUNT_BASE64 to be the base64 encoded JSON string of the service account
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in .env');
    process.exit(1);
}

try {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(decoded);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized');
} catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', error);
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// Middleware to verify Firebase ID Token
const verifyToken = async (req, res, next) => {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
