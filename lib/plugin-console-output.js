const loggers = require('./loggers');

module.exports = {
  observe: function observeForConsoleOutput(
    schemaAndRecordsObservable,
    changeDataCaptureObservable,
    env,
    logger = loggers.default
  ) {
    changeDataCaptureObservable.subscribe({
      next: x       => logger(`       ✏️   ${x.type}/${x.object}`),
      error: err    => logger(`!      ${err}`)
    });
    schemaAndRecordsObservable.subscribe({
      next: x       => logger(`       📘  ${x.type}/${x.object}`),
      error: err    => logger(`!      ${err}`)
    });
  }
}
