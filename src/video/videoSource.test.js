import { describe, it, expect } from 'vitest'
import { parseVideoMix } from './videoSource.js'

describe('parseVideoMix', () => {
    it('defaults to 1 when missing', () => expect(parseVideoMix(null)).toBe(1))
    it('defaults to 1 when undefined', () => expect(parseVideoMix(undefined)).toBe(1))
    it('defaults to 1 when empty', () => expect(parseVideoMix('')).toBe(1))
    it('reads a value inside 0..1', () => expect(parseVideoMix('0.5')).toBe(0.5))
    it('accepts 0', () => expect(parseVideoMix('0')).toBe(0))
    it('accepts 1', () => expect(parseVideoMix('1')).toBe(1))
    it('throws above 1', () => expect(() => parseVideoMix('1.5')).toThrow(/video_mix "1.5"/))
    it('throws below 0', () => expect(() => parseVideoMix('-0.1')).toThrow(/video_mix/))
    it('throws on non-numeric', () => expect(() => parseVideoMix('lots')).toThrow(/video_mix "lots"/))
})
