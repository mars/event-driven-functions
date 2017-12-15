const Rx = require('rxjs/Rx');
const redis = require('redis');

const util = require('util');

const loggers = require('./loggers');

function observe(salesforceApi, topicName, env, logger = loggers.default) {
  if (salesforceApi == null) {
    throw new Error('Requires salesforceApi, a jsForce connection.');
  }
  if (topicName == null || topicName === '') {
    throw new Error('Requires a topicName.');
  }
  if (env == null || env.REDIS_URL == null) {
    throw new Error('Requires REDIS_URL env var.');
  }
  const redisClient = redis.createClient(env.REDIS_URL);
  redisClient.on("error", function (err) {
    logger(`redis error: ${err.stack}`);
    process.exit(1);
  });

  logger(`-----> Subscribing to Salesforce stream ${topicName}`);

  const replayKey = `replayId:${topicName}`;
  function saveReplayId(v) {
    return new Promise((resolve, reject) => {
      if (v != null) {
        redisClient.set(replayKey, v.toString(), (err, res) => {
          if (err) {
            reject(err);
          } else {
            logger(`       ⏺  Save checkpoint ${v}`);
            resolve(res);
          }
        }); 
      } else {
        resolve();
      }
    });
  }
  function readReplayId() {
    return new Promise((resolve, reject) => {
      if (env.REPLAY_ID != null) {
        resolve(env.REPLAY_ID);
      } else {
        redisClient.get(replayKey, (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      }
    });
  }

  return readReplayId().then( v => {
    const replayId = v == null ? null : parseInt(v, 10);
    const topic = salesforceApi.streaming.topic(topicName);
    // const changeStream = Rx.Observable.create(
    //   createChangeStreamSubscribeFn(topic, replayId, saveReplayId, logger));
    // // Setup multicasting to maintain a single change [CDC] stream subscriber.
    // const multicasted = changeStream.multicast(new Rx.Subject()).refCount();
    return createChangesObservable(topic, replayId, saveReplayId, logger);
  })
}

function createChangesObservable(topic, replayId, saveReplayId, logger) {
  if (replayId != null) {
    logger(`       ⏮  Replaying from ${replayId}`);
  }
  logger(`       ▶️  Streaming changes`);
  const subject = new Rx.Subject();
  topic.subscribeWithReplay(replayId, null, data => {
    try {
      const object = data.payload &&
        data.payload.ChangeEventHeader &&
        data.payload.ChangeEventHeader.entityName;
      // Checkpoint at the new replayId
      return saveReplayId(data.event.replayId)
        .then( v => {
          subject.next({
            type: "change",
            object,
            content: data
          });
        });
    } catch (err) {
      logger(`!      Changes subscription error: ${err.stack}`);
    }
  });
  return subject;
}

module.exports = observe;
