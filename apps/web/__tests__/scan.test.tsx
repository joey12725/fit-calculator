import { describe, it, expect, vi } from 'vitest';
import { takePhoto } from '../components/CameraStep';
import { useScanStore } from '../store/scan';

function mockCanvas(orig: (tag: string) => HTMLElement) {
  const canvas = orig('canvas') as HTMLCanvasElement;
  Object.defineProperty(canvas, 'getContext', {
    value: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
  });
  Object.defineProperty(canvas, 'toBlob', {
    value: (cb: (b: Blob) => void) => cb(new Blob(['x'], { type: 'image/jpeg' })),
  });
  return canvas as HTMLCanvasElement;
}

describe('Camera utilities', () => {
  it('takePhoto returns Blob', async () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 1 });
    Object.defineProperty(video, 'videoHeight', { value: 1 });

    const orig = document.createElement.bind(document);
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => (tag === 'canvas' ? mockCanvas(orig) : orig(tag)));

    const blob = await takePhoto(video);
    expect(blob).toBeInstanceOf(Blob);
    spy.mockRestore();
  });
});

describe('Scan store', () => {
  it('stores 8 photos after flow', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({}) },
      writable: true,
    });
    useScanStore.getState().reset();
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    for (const pose of ['stand', 'lean'] as const) {
      for (let i = 0; i < 4; i++) {
        useScanStore.getState().addPhoto(pose, blob);
      }
    }
    expect(useScanStore.getState().photos.stand).toHaveLength(4);
    expect(useScanStore.getState().photos.lean).toHaveLength(4);
  });
});
