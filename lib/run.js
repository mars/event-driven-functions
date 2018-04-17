const Episode7          = require('episode-7');
const Rx                = require('rxjs/Rx');

const initSalesforceApi = require('./init-salesforce-api');
const loggers           = require('./loggers');
const readAll           = require('./read-all');
const salesforceObserver = require('./salesforce-observer');
const kafkaConsumer     = require('./kafka-consumer');

const defaultForceComVersion  = '41.0';
const defaultPlugins          = 'console-output';
const localPluginPrefix       = './plugin-';
const remotePluginPrefix      = 'salesforce-data-connector-plugin-';
const defaultReadMode         = 'all';
const readModeValues          = ['all', 'records', 'changes'];
const valueSeparator          = /[,\s]+/;

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

  logger('-----> Salesforce Data Connector ☁️');

  const pluginNames = (env.PLUGIN_NAMES || defaultPlugins).split(valueSeparator);
  const plugins = requirePlugins(pluginNames, logger);
  if (plugins.observe == null) {
    throw new Error(`At least one observe plugin is required`);
  }

  const readMode = env.READ_MODE || defaultReadMode;
  if (!readModeValues.includes(readMode)) {
    throw new Error(`Read mode "${readMode}" not recognized`);
  }
  logger(`       Read mode: ${readMode}`);
  const shouldReadChanges = readMode === 'changes' || readMode === 'all';
  const shouldReadRecords = readMode === 'records' || readMode === 'all';

  const forceComVersion = env.FORCE_API_VERSION || defaultForceComVersion;
  const salesforceApi   = yield Episode7.call(initSalesforceApi, env, forceComVersion, logger);

  // Subscribe to event streams
  const changeObservable = new Rx.Subject();
  if (shouldReadChanges) {
    let isStreaming = false;

    const salesforceTopicNames = env.OBSERVE_SALESFORCE_TOPIC_NAMES
      && env.OBSERVE_SALESFORCE_TOPIC_NAMES.length > 0
        ? env.OBSERVE_SALESFORCE_TOPIC_NAMES.split(valueSeparator)
        : [];

    // TODO this should auto-configure for only the SELECT_SOBJECTS
    if (salesforceTopicNames.length > 0) {
      // Subscribe to Salesforce Streaming API
      yield Episode7.call(
        salesforceObserver,
        salesforceApi,
        salesforceTopicNames,
        changeObservable,
        env,
        logger);
      isStreaming = true;
    }
    
    const kafkaTopicNames = env.CONSUME_KAFKA_TOPIC_NAMES
      && env.CONSUME_KAFKA_TOPIC_NAMES.length > 0
        ? env.CONSUME_KAFKA_TOPIC_NAMES.split(valueSeparator)
        : [];

    if (kafkaTopicNames.length > 0) {
      // Subscribe to Kafka topic
      yield Episode7.call(
        kafkaConsumer,
        kafkaTopicNames,
        changeObservable,
        env,
        logger);
      isStreaming = true;
    }

    if (!isStreaming) {
      const err = new Error(`At least one stream should be initialized when READ_MODE=${readMode}; set either OBSERVE_SALESFORCE_TOPIC_NAME or CONSUME_KAFKA_TOPIC_NAME`);
      changeObservable.error(err);
    }
  } else {
    changeObservable.complete();
  }

  // Bulk query for all records
  let readAllObservable;
  if (shouldReadRecords) {
    readAllObservable = yield Episode7.call(
      readAll,
      salesforceApi,
      env.SELECT_SOBJECTS,
      logger);
  } else {
    readAllObservable = Rx.Observable.never();
  }

  // Initialize each plugin, awaiting each
  const initObservePlugins = () => {
    const observePlugins = plugins.observe
      .filter( observe => typeof observe === 'function')
      .map( observe => observe(
        readAllObservable,
        changeObservable,
        env,
        salesforceApi,
        logger));
    return Promise.all(observePlugins);
  };

  yield Episode7.call(initObservePlugins);

  yield Episode7.call(waitForCompletion,
    shouldReadRecords,
    readAllObservable,
    shouldReadChanges,
    changeObservable,
    logger);
}

// Merges the plugins into a single object.
function requirePlugins(names, logger = loggers.default) {
  const plugins = {};
  const pluginNames = new Set(names);
  pluginNames.forEach( name => {
    let module;

    // Try to load local plugin module.
    let moduleName = `${localPluginPrefix}${name}`;
    try {
      module = require(moduleName);
    } catch(error) {
      logger(`!      Local plugin "${name}" not available: ${error.stack}`);

      // Try to load remote plugin module.
      moduleName = `${remotePluginPrefix}${name}`;
      try {
        module = require(moduleName);
      } catch(error) {
        throw new Error(`Failed to require the module for "${name}". Try \`npm install ${moduleName} --save\`. Original error was: ${error.message}`);
      }
    }

    for (let pluginType in module) {
      plugins[pluginType] = (plugins[pluginType] || []).concat(module[pluginType]);
    }
  });
  logger(`       Loaded ${names.length === 1 ? 'plugin' : 'plugins'}: ${names.join(', ')}`);
  return plugins;
}

function waitForCompletion(
  shouldReadRecords,
  readAllObservable,
  shouldReadChanges,
  changeObservable,
  logger = loggers.default
) {
  return new Promise((resolve, reject) => {
    let readRecordsComplete = false;
    let readChangesComplete = false;

    if (shouldReadRecords) {
      readAllObservable.subscribe({
        complete: () => {
          logger('-----> Read all completed.')
          readRecordsComplete = true;
          if (!shouldReadChanges || (shouldReadChanges && readChangesComplete)) {
            resolve();
          }
        },
        error: err => reject(err)
      });
    }

    if (shouldReadChanges) {
      changeObservable.subscribe({
        complete: () => {
          logger('-----> Changes completed.')
          readChangesComplete = true;
          if (!shouldReadRecords || (shouldReadRecords && readRecordsComplete)) {
            resolve();
          }
        },
        error: err => reject(err)
      });
    }
  });
}

module.exports = run;
