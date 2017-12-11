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
const defaultPlugins = 'console-output';
const localPluginPrefix = './plugin-';
const remotePluginPrefix = 'salesforce-cdc-connector-plugin-';

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

  const pluginNames = (env.PLUGIN_NAMES || defaultPlugins).split(/[,\s]+/);
  const plugins = requirePlugins(pluginNames, logger);
  if (plugins.observe == null) {
    throw new Error('At least one observe plugin is required.');
  }

  const forceComVersion = env.FORCE_API_VERSION || defaultForceComVersion;
  const salesforceApi   = yield Episode7.call(initSalesforceApi, env, forceComVersion, logger);

  // Subscribe to Change Data Capture stream (by default, the firehose)
  const topicName = env.OBSERVE_TOPIC_NAME || defaultObserveTopicName;
  const changeObservable = yield Episode7.call(observe, salesforceApi, topicName, logger);

  // Bulk query for all records
  const readAllObservable = yield Episode7.call(readAll, salesforceApi, env.SELECT_SOBJECTS, logger);

  plugins.observe.forEach( observe => {
    if (typeof observe === 'function') {
      observe(readAllObservable, changeObservable, logger);
    }
  });

  changeObservable.subscribe({
    complete: () => logger(`-----> Changes completed.`)
  });

  readAllObservable.subscribe({
    complete: () => logger(`-----> Read All completed.`)
  });
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
  logger(`-----> Loaded ${names.length === 1 ? 'plugin' : 'plugins'}: ${names.join(', ')}`);
  return plugins;
}

module.exports = run;
