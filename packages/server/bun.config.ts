import type { BunPlugin } from 'bun';

const testPlugin: BunPlugin = {
  name: 'test-plugin',
  setup(builder) {
    // Mock external modules during testing
    builder.config({
      external: [
        '@full-self-coding/core',
        'express',
        'cors',
        'helmet',
        'compression',
        'uuid',
        'fs-extra',
        'supertest'
      ]
    });
  }
};

export default {
  plugins: [process.env.NODE_ENV === 'test' ? testPlugin : null].filter(Boolean),
  test: {
    preload: ['./src/test-setup.ts']
  }
};