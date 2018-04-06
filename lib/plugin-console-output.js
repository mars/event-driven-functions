const loggers = require('./loggers');

module.exports = {
  observe: function observeForConsoleOutput(
    schemaAndRecordsObservable,
    eventsObservable,
    env,
    salesforceApi,
    logger = loggers.default
  ) {
    logger(`       🌩  Live with Salesforce API: ${salesforceApi.instanceUrl}`)
    eventsObservable.subscribe({
      next: x       => logger(`       ✏️  ${x.type}: ${x.name}`)
    });
    schemaAndRecordsObservable.subscribe({
      next: x       => logger(`       📘 ${x.type}: ${x.name}`)
    });
  }
}
