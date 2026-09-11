/** Jest cho apps/web — chỉ chạy pure unit tests (schema builders, utils).
 *  E2E/UI tests của web nằm ở apps/api/test (Supertest qua HTTP thật). */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\\.spec\\.ts$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
