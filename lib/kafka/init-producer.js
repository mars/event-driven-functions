const loggers = require('../loggers');
const Kafka = require('node-rdkafka');

const getKafkaBrokers = require('./get-brokers');

function initKafkaProducer(
  env,
  logger = loggers.default
) {
  logger('       Initializing Kafka producer');

  const brokers = getKafkaBrokers(env, logger);

  const producer = new Kafka.Producer({
    'metadata.broker.list':     brokers,
    'security.protocol':        'SSL',
    // SSL certs written by `.profile` script.
    'ssl.ca.location':          'tmp/env/KAFKA_TRUSTED_CERT',
    'ssl.certificate.location': 'tmp/env/KAFKA_CLIENT_CERT',
    'ssl.key.location':         'tmp/env/KAFKA_CLIENT_CERT_KEY'
  });
  return producer;
}

module.exports = initKafkaProducer;

