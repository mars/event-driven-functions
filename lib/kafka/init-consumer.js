const loggers = require('../loggers');
const Kafka = require('node-rdkafka');

const getKafkaBrokers = require('./get-brokers');

function initKafkaConsumer(
  env,
  groupId,
  logger = loggers.default
) {
  logger('       Initializing Kafka consumer');

  const brokers = getKafkaBrokers(env, logger);
  
  const consumer = new Kafka.KafkaConsumer({
    //'debug':                    'all',
    'api.version.request':      true,
    'event_cb':                 true,
    'client.id':                `salesforce-data-connector/${env.DYNO || 'localhost'}`,
    'group.id':                 groupId,
    'enable.auto.commit':       false,
    'metadata.broker.list':     brokers,
    'security.protocol':        'SSL',
    // SSL certs written by `.profile` script.
    'ssl.ca.location':          'tmp/env/KAFKA_TRUSTED_CERT',
    'ssl.certificate.location': 'tmp/env/KAFKA_CLIENT_CERT',
    'ssl.key.location':         'tmp/env/KAFKA_CLIENT_CERT_KEY'
  }, {});
  return consumer;
}

module.exports = initKafkaConsumer;

