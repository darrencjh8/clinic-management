import { describe, it, expect } from 'vitest'
import { ORTHODONTIC_VARIANTS, isOrthodontic, parseIDRCurrency, formatThousands } from './constants'

describe('Constants', () => {
  describe('ORTHODONTIC_VARIANTS', () => {
    it('should contain expected orthodontic variants', () => {
      expect(ORTHODONTIC_VARIANTS).toEqual(['Orthodontic', 'Ortodontik'])
    })
  })

  describe('isOrthodontic', () => {
    it('should return true for orthodontic variants', () => {
      expect(isOrthodontic('Orthodontic')).toBe(true)
      expect(isOrthodontic('Ortodontik')).toBe(true)
      expect(isOrthodontic('orthodontic')).toBe(true)
      expect(isOrthodontic('ORTODONTIK')).toBe(true)
    })

    it('should return false for non-orthodontic types', () => {
      expect(isOrthodontic('Dental')).toBe(false)
      expect(isOrthodontic('Cleaning')).toBe(false)
      expect(isOrthodontic('')).toBe(false)
    })

    it('should handle undefined and null', () => {
      expect(isOrthodontic(undefined)).toBe(false)
      expect(isOrthodontic(null)).toBe(false)
    })
  })

  describe('parseIDRCurrency', () => {
    it('should parse numbers correctly', () => {
      expect(parseIDRCurrency(12345)).toBe(12345)
      expect(parseIDRCurrency(0)).toBe(0)
    })

    it('should parse IDR currency strings', () => {
      expect(parseIDRCurrency('Rp 1.234')).toBe(1234)
      expect(parseIDRCurrency('Rp1.234')).toBe(1234)
      expect(parseIDRCurrency('1.234')).toBe(1234)
      expect(parseIDRCurrency('1234')).toBe(1234)
    })

    it('should handle decimal separators', () => {
      expect(parseIDRCurrency('1.234,56')).toBe(1234.56)
      expect(parseIDRCurrency('1,234')).toBe(1.234)
    })

    it('should handle empty and invalid values', () => {
      expect(parseIDRCurrency('')).toBe(0)
      expect(parseIDRCurrency(undefined)).toBe(0)
      expect(parseIDRCurrency('invalid')).toBe(0)
      expect(parseIDRCurrency('Rp')).toBe(0)
    })
  })

  describe('formatThousands', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatThousands(1234)).toBe('1.234')
      expect(formatThousands(1234567)).toBe('1.234.567')
      expect(formatThousands('1234')).toBe('1.234')
      expect(formatThousands('1234567')).toBe('1.234.567')
    })

    it('should handle small numbers', () => {
      expect(formatThousands(123)).toBe('123')
      expect(formatThousands(12)).toBe('12')
      expect(formatThousands(1)).toBe('1')
    })

    it('should handle empty and invalid values', () => {
      expect(formatThousands('')).toBe('')
      expect(formatThousands(0)).toBe('')
      expect(formatThousands(undefined as any)).toBe('')
      expect(formatThousands('abc')).toBe('')
    })

    it('should clean non-digit characters', () => {
      expect(formatThousands('1a2b3c4')).toBe('1.234')
      expect(formatThousands('Rp 1.234')).toBe('1.234')
    })
  })
})
