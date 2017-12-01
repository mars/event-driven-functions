const getSchema               = require('./get-schema');
const initSalesforceApi       = require('./init-salesforce-api');
const observe                 = require('./observe');
const readAll                 = require('./read-all');
const run                     = require('./run');

module.exports = {
  default: run,
  getSchema,
  initSalesforceApi,
  observe,
  readAll,
  run
};
