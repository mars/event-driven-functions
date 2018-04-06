const test = require('ava');
const connector = require('.');
const loggers = require('./loggers');
const Rx = require('rxjs/Rx');

test('Run', t => {
  t.plan(9)
  const mockEnv = { OBSERVE_SALESFORCE_TOPIC_NAME: '/data/ChangeEvents' }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = connector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, connector.salesforceObserver)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    '/data/ChangeEvents',
    new Rx.Subject(),
    mockEnv,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  t.is(yielded.value.fn, connector.readAll)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    undefined,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  // initObservePlugins
  // This dynamic Promise.all cannot be easily mocked
  yielded = subjectGenerator.next()
  t.is(typeof yielded.value.fn, 'function')

  // waitForCompletion
  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with custom topic name', t => {
  t.plan(8)
  const mockEnv = { OBSERVE_SALESFORCE_TOPIC_NAME: '/test/name' }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = connector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, connector.salesforceObserver)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    mockEnv.OBSERVE_SALESFORCE_TOPIC_NAME,
    new Rx.Subject(),
    mockEnv,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  t.is(yielded.value.fn, connector.readAll)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    undefined,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  // initObservePlugins
  // This dynamic Promise.all cannot be easily mocked
  yielded = subjectGenerator.next()

  // waitForCompletion
  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with sObject selection', t => {
  t.plan(8)
  const mockEnv = {
    OBSERVE_SALESFORCE_TOPIC_NAME: '/data/ChangeEvents',
    SELECT_SOBJECTS: 'Product2,Pricebook2'
  }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = connector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, connector.salesforceObserver)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    '/data/ChangeEvents',
    new Rx.Subject(),
    mockEnv,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  t.is(yielded.value.fn, connector.readAll)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    mockEnv.SELECT_SOBJECTS,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  // initObservePlugins
  // This dynamic Promise.all cannot be easily mocked
  yielded = subjectGenerator.next()

  // waitForCompletion
  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with read mode "records"', t => {
  t.plan(6)
  const mockEnv = { READ_MODE: 'records' }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = connector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, connector.readAll)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    undefined,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  // initObservePlugins
  // This dynamic Promise.all cannot be easily mocked
  yielded = subjectGenerator.next()

  // waitForCompletion
  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with read mode "changes"', t => {
  t.plan(6)
  const mockEnv = {
    READ_MODE: 'changes',
    OBSERVE_SALESFORCE_TOPIC_NAME: '/data/ChangeEvents'
  }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = connector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, connector.salesforceObserver)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    '/data/ChangeEvents',
    new Rx.Subject(),
    mockEnv,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  // initObservePlugins
  // This dynamic Promise.all cannot be easily mocked
  yielded = subjectGenerator.next()

  // waitForCompletion
  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with read mode "changes" and Kafka consumer', t => {
  t.plan(8)
  const mockEnv = {
    READ_MODE: 'changes',
    OBSERVE_SALESFORCE_TOPIC_NAME: '/data/ChangeEvents',
    CONSUME_KAFKA_TOPIC_NAME: 'haiku'
  }
  const mockSalesforceApi = { sobjects: {} }

  const subjectGenerator = connector.run(mockEnv)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.initSalesforceApi)
  t.deepEqual(yielded.value.args, [mockEnv, '41.0', loggers.default])

  yielded = subjectGenerator.next(mockSalesforceApi)

  t.is(yielded.value.fn, connector.salesforceObserver)
  t.deepEqual(yielded.value.args, [
    mockSalesforceApi,
    '/data/ChangeEvents',
    new Rx.Subject(),
    mockEnv,
    loggers.default
  ])

  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, connector.kafkaConsumer)
  t.deepEqual(yielded.value.args, [
    'haiku',
    new Rx.Subject(),
    mockEnv,
    loggers.default
  ])

  yielded = subjectGenerator.next(Rx.Observable.never())

  // initObservePlugins
  // This dynamic Promise.all cannot be easily mocked
  yielded = subjectGenerator.next()

  // waitForCompletion
  yielded = subjectGenerator.next()

  t.true(yielded.done, 'is done')
  t.is(yielded.value, undefined)
})

test('Run with unrecognized read mode', t => {
  t.plan(1)
  const mockEnv = { READ_MODE: 'imaginary' }

  const subjectGenerator = connector.run(mockEnv)

  t.throws( () => subjectGenerator.next(), `Read mode "${mockEnv.READ_MODE}" not recognized`)
})

test('Run with missing plugin', t => {
  t.plan(1)
  const mockEnv = { PLUGIN_NAMES: 'imaginary' }

  const subjectGenerator = connector.run(mockEnv)

  t.throws( () => subjectGenerator.next(), /Failed to require the module/)
})
