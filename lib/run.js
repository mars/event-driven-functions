const dotenv = require('dotenv');
dotenv.config();

const Episode7          = require('episode-7');
const Rx                = require('rxjs/Rx');

const initSalesforceApi = require('./init-salesforce-api');
const loggers           = require('./loggers');
const readAll           = require('./read-all');
const observe           = require('./observe');

const defaultForceComVersion = '41.0';
const defaultObserveTopicName = '/data/ChangeEvents';

// Main worker function.
function* run(env, logStream) {
  if (typeof env !== 'object') {
    throw new Error('Environment object is required.')
  }
  if (logStream != null && typeof logStream.write !== 'function') {
    throw new Error('Log stream (optional) does not appear to be a stream.');
  }

  let logger;
  if (env.VERBOSE === true || env.VERBOSE === 'true' || env.VERBOSE === '1') {
    // Log stream should not be mixed with stdout.
    if (logStream == null) {
      logger = loggers.verbose;
    } else {
      logger = v => logStream.write(v, 'utf8');
    }
  } else {
    // No-op
    logger = loggers.default;
  }

  const forceComVersion = env.FORCE_API_VERSION || defaultForceComVersion;
  const salesforceApi   = yield Episode7.call(initSalesforceApi, env, forceComVersion, logger);

  // Subscribe to Change Data Capture stream (by default, the firehose)
  const topicName = env.OBSERVE_TOPIC_NAME || defaultObserveTopicName;
  const cdcObservable = yield Episode7.call(observe, salesforceApi, topicName, logger);

  // Bulk query for all records
  const readAllObservable = yield Episode7.call(readAll, salesforceApi, logger);

  // Join CDC & bulk query results into a single stream
  const recordsObservable = cdcObservable.merge(readAllObservable);

  recordsObservable.subscribe({
    next: x => logger(`       ✉️  ${x.type}/${x.object}`),
    error: err => logger(`!       ${err}`),
    complete: () => logger('-----> recordsObservable complete')
  });
}

module.exports = run;
