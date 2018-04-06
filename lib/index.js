const getSchema               = require('./get-schema');
const initSalesforceApi       = require('./init-salesforce-api');
const salesforceObserver      = require('./salesforce-observer');
const kafkaConsumer           = require('./kafka-consumer');
const readAll                 = require('./read-all');
const run                     = require('./run');

module.exports = {
  default: run,
  getSchema,
  initSalesforceApi,
  salesforceObserver,
  kafkaConsumer,
  readAll,
  run
};
