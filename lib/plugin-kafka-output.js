const loggers = require('./loggers');
const Kafka = require('node-rdkafka');

module.exports = {
  observe: function observeForKafkaOutput(
    schemaAndRecordsObservable,
    changeDataCaptureObservable,
    env,
    logger = loggers.default
  ) {
    logger('-----> Initializing Kafka output');

    const kafkaUrl = env.KAFKA_URL;
    if (kafkaUrl == null) {
      throw new Error('Requires KAFKA_URL env var');
    }
    const outputKafkaBrokers = kafkaUrl
      .split(/\s*,\s*/)
      .map( v => /^kafka\+ssl:\/\/(.+)/.exec(v)[1] )
      .join(',')
    const outputKafkaTopic = `${env.KAFKA_PREFIX}${env.OUTPUT_KAFKA_TOPIC || 'salesforce-cdc'}`;

    const producer = new Kafka.Producer({
      'metadata.broker.list':     outputKafkaBrokers,
      'security.protocol':        'SSL',
      'ssl.ca.location':          'tmp/env/KAFKA_TRUSTED_CERT',
      'ssl.certificate.location': 'tmp/env/KAFKA_CLIENT_CERT',
      'ssl.key.location':         'tmp/env/KAFKA_CLIENT_CERT_KEY'
    });

    // Connect to the broker manually
    producer.connect();

    // Wait for the ready event before proceeding
    producer.on('ready', () => {
      logger('       Connected to Kafka');
      changeDataCaptureObservable.subscribe({
        next: x => {
          try {
            logger(`       📩  Produce change for ${x.object}`);
            producer.produce(
              // Topic to send the message to
              outputKafkaTopic,
              // optionally we can manually specify a partition for the message
              // this defaults to -1 - which will use librdkafka's default partitioner (consistent random for keyed messages, random for unkeyed messages)
              null,
              // Message to send. Must be a buffer
              new Buffer(JSON.stringify(x.content)),
              // for keyed messages, we also specify the key - note that this field is optional
              x.object,
              // you can send a timestamp here. If your broker version supports it,
              // it will get added. Otherwise, we default to 0
              Date.now(),
              // you can send an opaque token here, which gets passed along
              // to your delivery reports
              null
            )
          } catch (err) {
            logger(`!     Error producing Kafka message: ${err.stack}`)
          }
        }
      });
    });

    // Any errors we encounter, including connection errors
    producer.on('event.error', err => {
      logger(`!     Kafka producer error: ${err.stack}`)
    });

    producer.on('delivery-report', (err, report) => {
      if (err) {
        logger(`!     Kafka delivery report error: ${err.stack}`)
      } else {
        logger(`      📋 Kafka delivery report: ${report}`);
      }
    });
  }
}
