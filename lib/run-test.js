const test = require('ava');
const cdcConnector = require('.');
const loggers = require('./loggers');

test('Run', t => {
  t.plan(4)
  const mockEnv = { }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = cdcConnector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, cdcConnector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '37.0', loggers.default])

  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})
