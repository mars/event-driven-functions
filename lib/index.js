const run                     = require('./run');
const initSalesforceApi       = require('./init-salesforce-api');
const observe                 = require('./observe');

module.exports = {
  default: run,
  run: run,
  initSalesforceApi,
  observe
};
