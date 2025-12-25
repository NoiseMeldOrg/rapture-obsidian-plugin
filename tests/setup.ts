/**
 * Jest test setup file
 * Configures test environment and global mocks
 */

// Mock DOM elements for settings tests
Object.defineProperty(global, 'document', {
  value: {
    createElement: (tag: string) => ({
      tagName: tag,
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
      style: {},
      setAttribute: jest.fn(),
      empty: jest.fn(),
      createEl: jest.fn().mockReturnValue({
        tagName: 'div',
        appendChild: jest.fn(),
        createSpan: jest.fn().mockReturnValue({}),
      }),
      createDiv: jest.fn().mockReturnValue({
        createSpan: jest.fn().mockReturnValue({}),
        empty: jest.fn(),
      }),
      addClass: jest.fn(),
      querySelector: jest.fn(),
    }),
  },
});

// Mock window.open for OAuth flow
Object.defineProperty(global, 'window', {
  value: {
    open: jest.fn(),
    setInterval: jest.fn().mockReturnValue(1),
    clearInterval: jest.fn(),
  },
});

// Silence console.log and console.error during tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
