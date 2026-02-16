#!/usr/bin/env python3
"""
Test the complete staff login flow:
1. Login to Firebase with email/password
2. Get Firebase ID token
3. Call backend API to get service account
4. Use service account to get Google OAuth token
5. List spreadsheets using Google Drive API
"""

import requests
import json
import base64
import time
from datetime import datetime, timedelta
import jwt

# Configuration from .env.e2e
FIREBASE_API_KEY = "AIzaSyDsmavUPO_LoF6QxTz9x9HlPsdTWT8RdSs"
EMAIL = "chongjinheng@gmail.com"
PASSWORD = "123456"
BACKEND_API_URL = "https://wisata-dental.fly.dev"

def firebase_login(email, password):
    """Step 1: Login to Firebase and get ID token"""
    print("\n=== Step 1: Firebase Login ===")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    
    data = response.json()
    id_token = data.get("idToken")
    print(f"✓ Firebase ID Token obtained (length: {len(id_token)})")
    return id_token

def get_service_account(firebase_token):
    """Step 2: Call backend API to get service account"""
    print("\n=== Step 2: Get Service Account from Backend ===")
    url = f"{BACKEND_API_URL}/api/auth/service-account"
    
    headers = {
        "Authorization": f"Bearer {firebase_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    
    data = response.json()
    service_account = data.get("serviceAccount")
    print(f"✓ Service Account obtained: {service_account.get('client_email')}")
    return service_account

def get_google_access_token(service_account):
    """Step 3: Use service account to get Google OAuth token"""
    print("\n=== Step 3: Get Google OAuth Token ===")
    
    # Create JWT
    now = int(time.time())
    expiry = now + 3600
    
    jwt_payload = {
        "iss": service_account["client_email"],
        "sub": service_account["client_email"],
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": expiry,
        "scope": "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly"
    }
    
    # Sign JWT with private key
    private_key = service_account["private_key"]
    
    token = jwt.encode(jwt_payload, private_key, algorithm="RS256")
    
    # Exchange JWT for access token
    url = "https://oauth2.googleapis.com/token"
    payload = {
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": token
    }
    
    response = requests.post(url, data=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    
    data = response.json()
    access_token = data.get("access_token")
    print(f"✓ Google Access Token obtained (length: {len(access_token)})")
    print(f"  Token type: {data.get('token_type')}")
    print(f"  Expires in: {data.get('expires_in')} seconds")
    return access_token

def list_spreadsheets(access_token):
    """Step 4: List spreadsheets using Google Drive API"""
    print("\n=== Step 4: List Spreadsheets ===")
    
    query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    url = f"https://www.googleapis.com/drive/v3/files?q={requests.utils.quote(query)}&fields=files(id,name)"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return []
    
    data = response.json()
    files = data.get("files", [])
    
    print(f"\n✓ Found {len(files)} spreadsheets:")
    for idx, file in enumerate(files, 1):
        print(f"  {idx}. {file['name']} (ID: {file['id']})")
    
    return files

def main():
    print("=" * 60)
    print("Testing Complete Staff Login Flow")
    print("=" * 60)
    
    # Step 1: Firebase login
    firebase_token = firebase_login(EMAIL, PASSWORD)
    if not firebase_token:
        print("\n❌ Firebase login failed")
        return
    
    # Step 2: Get service account
    service_account = get_service_account(firebase_token)
    if not service_account:
        print("\n❌ Failed to get service account from backend")
        return
    
    # Step 3: Get Google access token
    google_token = get_google_access_token(service_account)
    if not google_token:
        print("\n❌ Failed to get Google access token")
        return
    
    # Step 4: List spreadsheets
    spreadsheets = list_spreadsheets(google_token)
    
    print("\n" + "=" * 60)
    if spreadsheets:
        print("✅ SUCCESS: Service account can access spreadsheets!")
        print(f"   Total spreadsheets found: {len(spreadsheets)}")
    else:
        print("⚠️  WARNING: No spreadsheets found")
        print("   This could mean:")
        print("   1. Service account has no spreadsheets shared with it")
        print("   2. There's an issue with permissions")
    print("=" * 60)

if __name__ == "__main__":
    main()
