const loggers = require('./loggers');

module.exports = {
  observe: function observeForConsoleOutput(observable, logger = loggers.default) {
    observable.subscribe({
      next: x       => logger(`       ✉️  ${x.type}/${x.object}`),
      error: err    => logger(`!      ${err}`)
    });
  }
}
