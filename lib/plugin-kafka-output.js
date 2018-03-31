const loggers = require('./loggers');

const initKafkaProducer = require('./kafka/init-producer');

module.exports = {
  observe: function observeForKafkaOutput(
    schemaAndRecordsObservable,
    changeDataCaptureObservable,
    env,
    salesforceApi,
    logger = loggers.default
  ) {
    const kafkaUrl = env.KAFKA_URL;
    if (kafkaUrl == null) {
      throw new Error('Requires KAFKA_URL env var');
    }
    const kafkaTopic = `${env.KAFKA_PREFIX}${env.OUTPUT_KAFKA_TOPIC || 'salesforce-cdc'}`;
    logger(`-----> Kafka output topic ${kafkaTopic}`);

    const producer = initKafkaProducer(env, logger);
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
              kafkaTopic,
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
