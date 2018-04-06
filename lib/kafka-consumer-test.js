const test = require('ava');
const Rx = require('rxjs/Rx');
const connector = require('.');
const loggers = require('./loggers');

// Skipped because Kafka is not currently available for tests.
test.skip('Kafka consumer', t => {
  t.plan(1)

  const mockEnv = {
    KAFKA_URL: 'kafka+ssl://mock-kafka'
  }
  const topicName = 'haiku'
  const rxSubject = new Rx.Subject()

  return connector.kafkaConsumer(topicName, rxSubject, mockEnv, loggers.verbose)
    .then( v => t.is(v, rxSubject) )
})
