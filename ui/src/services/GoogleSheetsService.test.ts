import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GoogleSheetsService } from './GoogleSheetsService'

// Mock googleLogout
vi.mock('@react-oauth/google', () => ({
  googleLogout: vi.fn(),
}))

describe('GoogleSheetsService', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset the service state
    GoogleSheetsService.logout()
  })

  afterEach(() => {
    GoogleSheetsService.logout()
    sessionStorage.clear()
  })

  describe('setAccessToken and getAccessToken', () => {
    it('should set and get access token', () => {
      const token = 'test-access-token'
      
      GoogleSheetsService.setAccessToken(token)
      
      expect(GoogleSheetsService.getAccessToken()).toBe(token)
      expect(sessionStorage.getItem('google_access_token')).toBe(token)
    })

    it('should get access token from sessionStorage if not in memory', () => {
      const token = 'session-storage-token'
      sessionStorage.setItem('google_access_token', token)
      
      const result = GoogleSheetsService.getAccessToken()
      
      expect(result).toBe(token)
    })

    it('should return null if no token is available', () => {
      const result = GoogleSheetsService.getAccessToken()
      
      expect(result).toBeNull()
    })
  })

  describe('hasServiceAccount', () => {
    it('should return false when no service account key is set', () => {
      expect(GoogleSheetsService.hasServiceAccount()).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear all tokens and session data', () => {
      // Set some initial data
      GoogleSheetsService.setAccessToken('test-token')
      
      // Call logout
      GoogleSheetsService.logout()
      
      // Verify everything is cleared
      expect(GoogleSheetsService.getAccessToken()).toBeNull()
      expect(GoogleSheetsService.hasServiceAccount()).toBe(false)
      expect(sessionStorage.getItem('google_access_token')).toBeNull()
      expect(sessionStorage.getItem('encrypted_service_account')).toBeNull()
      expect(sessionStorage.getItem('service_account_key_raw')).toBeNull()
      expect(sessionStorage.getItem('token_expiration')).toBeNull()
    })
  })

  describe('encrypted service account key management', () => {
    it('should set and get encrypted service account key', () => {
      const encryptedKey = 'encrypted-test-key'
      
      GoogleSheetsService.setEncryptedServiceAccountKey(encryptedKey)
      
      expect(GoogleSheetsService.getEncryptedServiceAccountKey()).toBe(encryptedKey)
      expect(sessionStorage.getItem('encrypted_service_account')).toBe(encryptedKey)
    })

    it('should clear encrypted service account key', () => {
      GoogleSheetsService.setEncryptedServiceAccountKey('test-key')
      GoogleSheetsService.clearEncryptedServiceAccountKey()
      
      expect(GoogleSheetsService.getEncryptedServiceAccountKey()).toBeNull()
      expect(sessionStorage.getItem('encrypted_service_account')).toBeNull()
    })
  })
})
