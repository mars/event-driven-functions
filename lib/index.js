const getCompatibleFieldnames = require('./get-compatible-fieldnames');
const initSalesforceApi       = require('./init-salesforce-api');
const observe                 = require('./observe');
const readAll                 = require('./read-all');
const run                     = require('./run');

module.exports = {
  default: run,
  getCompatibleFieldnames,
  initSalesforceApi,
  observe,
  readAll,
  run
};
