const test = require('ava');
const connector = require('.');

test('Default export is the runner', t => {
  t.is(connector.default, connector.run);
});

test('Exports its constituent functions', t => {
  t.is(typeof connector.run, 'function');
  t.is(typeof connector.initSalesforceApi, 'function');
  t.is(typeof connector.salesforceObserver, 'function');
  t.is(typeof connector.kafkaConsumer, 'function');
});
