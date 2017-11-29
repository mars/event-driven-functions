const Rx = require('rxjs/Rx');

const loggers = require('./loggers');

function observe(salesforceApi, topicName, logger = loggers.default) {
  if (salesforceApi == null) {
    throw new Error('Requires salesforceApi, a jsForce connection.');
  }
  if (topicName == null || topicName === '') {
    throw new Error('Requires a topicName.');
  }

  logger(`-----> Subscribing to Salesforce stream ${topicName}`);

  const topic = salesforceApi.streaming.topic(topicName);
  const observable = Rx.Observable.create(createSubscriptionObserver(topic));
  return observable;
}

function createSubscriptionObserver(topic) {
  return function subscriptionObserver(observer) {
    topic.subscribe(function(message) {
      observer.next(message);
    });
  }
}

module.exports = observe;
