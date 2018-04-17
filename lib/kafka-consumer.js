const Rx = require('rxjs/Rx');

const loggers = require('./loggers');
const initKafkaConsumer = require('./kafka/init-consumer');

const defaultKafkaGroupId = 'salesforce-data-connector';
const connectTimeout = 5000;

function kafkaConsumer(
  topicNames,
  rxSubject,
  env,
  logger = loggers.default
) {
  return new Promise((resolve, reject) => {
    if (! topicNames instanceof Array || topicNames.length < 1) {
      throw new Error('Requires array of topicNames.');
    }
    const kafkaTopics = topicNames.map( t => `${env.KAFKA_PREFIX}${t}` );
    const groupId = `${env.KAFKA_PREFIX}${env.CONSUME_KAFKA_GROUP_ID || defaultKafkaGroupId}`;
    logger(`-----> Consuming Kafka ${kafkaTopics.length === 1 ? 'topic' : 'topics'}: ${kafkaTopics.join(', ')}; group: ${groupId}`);

    const consumer = initKafkaConsumer(env, groupId, logger);

    const connectTimoutId = setTimeout(() => {
      const message = `Failed to connect Kafka consumer (${connectTimeout}-ms timeout)`;
      const e = new Error(message);
      reject(e);
    }, connectTimeout)
    consumer.connect();

    consumer.on('ready', (id, metadata) => {
      consumer.subscribe(kafkaTopics);
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
          name: data.topic,
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
