const loggers = require('../loggers');

function getKafkaBrokers(
  env,
  logger = loggers.default
) {
  const kafkaUrl = env.KAFKA_URL;
  if (kafkaUrl == null) {
    throw new Error('Requires KAFKA_URL env var');
  }
  const brokers = kafkaUrl
    .split(/\s*,\s*/)
    .map( v => /^kafka\+ssl:\/\/(.+)/.exec(v)[1] )
    .join(',');

  logger(`       kafka+ssl brokers ${brokers}`);
  return brokers;
}

module.exports = getKafkaBrokers;

