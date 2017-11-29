const test = require('ava');
const cdcConnector = require('.');

test('Default export is the runner', t => {
  t.is(cdcConnector.default, cdcConnector.run);
});

test('Exports its constituent functions', t => {
  t.is(typeof cdcConnector.run, 'function');
  t.is(typeof cdcConnector.initSalesforceApi, 'function');
});
