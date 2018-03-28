const loggers = require('./loggers');

module.exports = {
  observe: function observeForConsoleOutput(
    schemaAndRecordsObservable,
    changeDataCaptureObservable,
    env,
    salesforceApi,
    logger = loggers.default
  ) {
    logger(`       🌩  Live with Salesforce API: ${salesforceApi.instanceUrl}`)
    changeDataCaptureObservable.subscribe({
      next: x       => logger(`       ✏️  ${x.type}: ${x.object}`)
    });
    schemaAndRecordsObservable.subscribe({
      next: x       => logger(`       📘 ${x.type}: ${x.object}`)
    });
  }
}
