const run                     = require('./run');
const initSalesforceApi       = require('./init-salesforce-api');

module.exports = {
  default: run,
  run: run,
  initSalesforceApi
};
