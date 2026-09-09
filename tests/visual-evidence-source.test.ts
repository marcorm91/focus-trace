import { beforeEach, describe, expect, it, vi } from 'vitest';

const browserMocks = vi.hoisted(() => ({
  get: vi.fn(),
  captureVisibleTab: vi.fn(),
}));

vi.mock('#imports', () => ({
  browser: {
    tabs: {
      get: browserMocks.get,
      captureVisibleTab: browserMocks.captureVisibleTab,
    },
  },
}));

import {
  captureVisibleTabFromSource,
  visibleTabCaptureSource,
} from '../lib/extension/visible-tab-capture';

beforeEach(() => {
  browserMocks.get.mockReset();
  browserMocks.captureVisibleTab.mockReset();
});

describe('visual evidence source identity', () => {
  it('accepts only the requested active tab and normalized scan document', () => {
    expect(visibleTabCaptureSource({
      id: 41,
      windowId: 7,
      active: true,
      url: 'https://example.test/form#field',
    }, 41, 'https://example.test/form')).toEqual({
      tabId: 41,
      windowId: 7,
      pageUrl: 'https://example.test/form',
    });

    expect(visibleTabCaptureSource({
      id: 42,
      windowId: 7,
      active: true,
      url: 'https://example.test/form',
    }, 41, 'https://example.test/form')).toBeUndefined();

    expect(visibleTabCaptureSource({
      id: 41,
      windowId: 7,
      active: false,
      url: 'https://example.test/form',
    }, 41, 'https://example.test/form')).toBeUndefined();
  });

  it('rejects navigation while preserving ordinary anchor changes', () => {
    expect(visibleTabCaptureSource({
      id: 41,
      windowId: 7,
      active: true,
      url: 'https://example.test/form?step=2',
    }, 41, 'https://example.test/form?step=1')).toBeUndefined();

    expect(visibleTabCaptureSource({
      id: 41,
      windowId: 7,
      active: true,
      url: 'https://example.test/app#/settings',
    }, 41, 'https://example.test/app#/profile')).toBeUndefined();

    expect(visibleTabCaptureSource({
      id: 41,
      windowId: 7,
      active: true,
      url: 'https://example.test/form#help',
    }, 41, 'https://example.test/form#field')).toEqual({
      tabId: 41,
      windowId: 7,
      pageUrl: 'https://example.test/form',
    });
  });

  it('returns a capture only when the source remains visible afterwards', async () => {
    const source = {
      tabId: 41,
      windowId: 7,
      pageUrl: 'https://example.test/form',
    };
    browserMocks.get.mockResolvedValue({
      id: 41,
      windowId: 7,
      active: true,
      url: 'https://example.test/form',
    });
    browserMocks.captureVisibleTab.mockResolvedValue('data:image/png;base64,expected');

    await expect(captureVisibleTabFromSource(source, { format: 'png' }))
      .resolves.toBe('data:image/png;base64,expected');
    expect(browserMocks.get).toHaveBeenCalledTimes(2);
  });

  it('discards pixels captured while another tab becomes active', async () => {
    const source = {
      tabId: 41,
      windowId: 7,
      pageUrl: 'https://example.test/form',
    };
    browserMocks.get
      .mockResolvedValueOnce({
        id: 41,
        windowId: 7,
        active: true,
        url: 'https://example.test/form',
      })
      .mockResolvedValueOnce({
        id: 41,
        windowId: 7,
        active: false,
        url: 'https://example.test/form',
      });
    browserMocks.captureVisibleTab.mockResolvedValue('data:image/png;base64,wrong-tab');

    await expect(captureVisibleTabFromSource(source, { format: 'png' }))
      .resolves.toBeUndefined();
  });
});
