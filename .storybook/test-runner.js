const { createTestRunner } = require('../../../tools/storybook/create-test-runner');

module.exports = createTestRunner([
  /^app-ui-components-(atoms|molecules|organisms)-/,
  /^app-ui-components-/,
]);
