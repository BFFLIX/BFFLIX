const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testMatch: ["**/_tests_/**/*.test.ts", "**/src/**/*.test.ts"],
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};