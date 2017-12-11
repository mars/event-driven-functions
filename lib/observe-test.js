const test = require('ava');
const Rx = require('rxjs/Rx');
const connector = require('.');
const loggers = require('./loggers');

test('.observe', t => {
  t.plan(2)

  const topicName = '/test/name'
  const mockSalesforceApi = { 
    streaming: {
      topic: (name) => t.is(name, topicName)
    }
  }

  const returnValue = connector.observe(mockSalesforceApi, topicName)

  t.true(returnValue instanceof Rx.Observable)
})
