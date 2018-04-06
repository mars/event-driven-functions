const test = require('ava');
const Rx = require('rxjs/Rx');
const connector = require('.');
const loggers = require('./loggers');

// Skipped because Redis is not currently available for tests.
test.skip('.observe', t => {
  t.plan(2)

  const mockEnv = {
    REDIS_URL: 'redis://localhost:6379'
  }
  const topicName = '/test/name'
  const mockSalesforceApi = { 
    streaming: {
      topic: (name) => t.is(name, topicName)
    }
  }

  const returnValue = connector.salesforceObserver(mockSalesforceApi, topicName, mockEnv, loggers.verbose)

  t.true(returnValue instanceof Rx.Observable)
})
