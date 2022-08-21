const { base, getModuleNameMapper } = require('../../jest.config.base');

module.exports = Object.assign({}, base, {
  displayName: require('./package.json').name,
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],

  moduleNameMapper: getModuleNameMapper(require('./tsconfig.json')),

  setupFilesAfterEnv: ['<rootDir>/src/SetupTests.ts'],
});
