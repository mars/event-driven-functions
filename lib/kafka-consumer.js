const Rx = require('rxjs/Rx');

const loggers = require('./loggers');
const initKafkaConsumer = require('./kafka/init-consumer');

const defaultKafkaGroupId = 'salesforce-data-connector';
const connectTimeout = 5000;

function kafkaConsumer(
  topicName,
  rxSubject,
  env,
  logger = loggers.default
) {
  return new Promise((resolve, reject) => {
    if (topicName == null || topicName === '') {
      throw new Error('Requires a topicName.');
    }
    const kafkaTopic = `${env.KAFKA_PREFIX}${topicName}`;
    const groupId = `${env.KAFKA_PREFIX}${env.CONSUME_KAFKA_GROUP_ID || defaultKafkaGroupId}`;
    logger(`-----> Consuming Kafka topic: ${kafkaTopic}, group: ${groupId}`);

    const consumer = initKafkaConsumer(env, groupId, logger);

    const connectTimoutId = setTimeout(() => {
      const message = `Failed to connect Kafka consumer (${connectTimeout}-ms timeout)`;
      const e = new Error(message);
      reject(e);
    }, connectTimeout)
    consumer.connect();

    consumer.on('ready', (id, metadata) => {
      consumer.subscribe([kafkaTopic]);
      consumer.consume();
      consumer.on('error', err => {
        logger(`!      Error in Kafka consumer: ${err.stack}`);
      });
      clearTimeout(connectTimoutId);
      logger(`       ✅ Kafka is ready: ${id.name}`);
      resolve();
    });

    consumer.on('data', data => {
      try {
        logger(`       📨 Consume message ${data.offset} from ${data.topic}`);
        let didCommit = false;
        let commitOnce = () => {
          if (!didCommit) {
            consumer.commitMessage(data);
            didCommit = true;
            logger(`       📥 Commit message ${data.offset} from ${data.topic}`);
          }
        };
        rxSubject.next({
          type: 'kafka',
          name: topicName,
          content: data,
          commit: commitOnce
        });
      } catch (err) {
        logger(`!      Error consuming Kafka message: ${err.stack}`)
      }
    });

    consumer.on('event.log', log => {
      logger(`       📋 Kafka consumer event: ${JSON.stringify(log)}`)
    });

    consumer.on('event.error', err => {
      logger(`!      Kafka consumer error: ${err.stack}`)
    });

    return rxSubject;
  });
}

module.exports = kafkaConsumer;
