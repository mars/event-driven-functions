const dotenv = require('dotenv');
dotenv.config();

const Episode7 = require('episode-7');

const initSalesforceApi = require('./init-salesforce-api');
const loggers           = require('./loggers');

const defaultForceComVersion = '37.0';

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

  // Do all the things.
}

module.exports = run;
