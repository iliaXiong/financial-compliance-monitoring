module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
  // 处理natural库的ES模块问题
  transformIgnorePatterns: [
    'node_modules/(?!(natural|afinn-165|emoji-emotion|gemoji)/)',
  ],
  // 模拟natural库以避免ES模块问题
  moduleNameMapper: {
    '^natural$': '<rootDir>/src/__mocks__/natural.ts',
  },
};
