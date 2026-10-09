import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { designScale, ScaleToFit } from './scale-to-fit.js';

function setViewport(width: number, height: number) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);
}

describe('designScale', () => {
  it.each([
    [1920, 1080, 1],
    [1280, 720, 2 / 3],
    [3840, 2160, 2],
    // Non-16:9 screens fit the tighter axis.
    [2560, 1080, 1],
    [1280, 1024, 2 / 3]
  ])('%ix%i -> %d', (width, height, expected) => {
    expect(designScale(width, height)).toBeCloseTo(expected);
  });

  it('falls back to 1 for a zero-sized viewport', () => {
    expect(designScale(0, 0)).toBe(1);
  });
});

describe('ScaleToFit', () => {
  it('lays out at 1080p and scales down to 720p', () => {
    setViewport(1280, 720);
    render(<ScaleToFit>content</ScaleToFit>);
    const box = screen.getByTestId('scale-to-fit');
    expect(box.style.width).toBe('1920px');
    expect(box.style.height).toBe('1080px');
    expect(box.style.transform).toMatch(/^scale\(0\.666/);
  });

  it('scales up on a 4K wall instead of shrinking the text', () => {
    setViewport(3840, 2160);
    render(<ScaleToFit>content</ScaleToFit>);
    const box = screen.getByTestId('scale-to-fit');
    expect(box.style.width).toBe('1920px');
    expect(box.style.transform).toBe('scale(2)');
  });

  it('fills a non-16:9 screen edge to edge', () => {
    setViewport(2560, 1080);
    render(<ScaleToFit>content</ScaleToFit>);
    const box = screen.getByTestId('scale-to-fit');
    expect(box.style.width).toBe('2560px');
    expect(box.style.height).toBe('1080px');
  });

  it('rescales on window resize', () => {
    setViewport(1920, 1080);
    render(<ScaleToFit>content</ScaleToFit>);
    const box = screen.getByTestId('scale-to-fit');
    expect(box.style.transform).toBe('scale(1)');
    setViewport(1280, 720);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(box.style.transform).toMatch(/^scale\(0\.666/);
  });
});
