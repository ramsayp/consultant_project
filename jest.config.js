const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  setupFilesAfterEnv: [
    ...(jestConfig.setupFilesAfterEnv || []),
    "<rootDir>/jest.setup.js"
  ],
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"],
  moduleNameMapper: {
    "^@salesforce/apex$": "<rootDir>/__mocks__/@salesforce/apex.js",
    "^@salesforce/apex/(.+)$": "<rootDir>/__mocks__/@salesforce/apex/$1.js",
    "^@salesforce/schema/(.+)$": "<rootDir>/__mocks__/@salesforce/schema.js",
    "^lightning/uiRecordApi$": "<rootDir>/__mocks__/lightning/uiRecordApi.js"
  }
};
