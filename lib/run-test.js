const test = require('ava');
const cdcConnector = require('.');
const loggers = require('./loggers');

test('Run', t => {
  t.plan(6)
  const mockEnv = {}
  const mockSalesforceApi = { sobjects: {} }
  const mockObservable = { subscribe: () => {} }

  const subjectGenerator = cdcConnector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, cdcConnector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, cdcConnector.observe)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    '/data/ChangeEvents',
    loggers.default
  ])

  yielded = subjectGenerator.next(mockObservable)

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with custom topic name', t => {
  t.plan(6)
  const mockEnv = { OBSERVE_TOPIC_NAME: '/test/name' }
  const mockSalesforceApi = { sobjects: {} }
  const mockObservable = { subscribe: () => {} }

  const subjectGenerator = cdcConnector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, cdcConnector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, cdcConnector.observe)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    mockEnv.OBSERVE_TOPIC_NAME,
    loggers.default
  ])

  yielded = subjectGenerator.next(mockObservable)

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})
