const Rx = require('rxjs/Rx');
const redis = require('redis');

const util = require('util');

const loggers = require('./loggers');

function observe(salesforceApi, topicName, rxSubject, env, logger = loggers.default) {
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
    return subscribeAndPush(topic, replayId, saveReplayId, rxSubject, logger);
  })
}

function subscribeAndPush(topic, replayId, saveReplayId, rxSubject, logger) {
  if (replayId != null) {
    logger(`       ⏮  Replaying from ${replayId}`);
  }
  logger(`       ▶️  Streaming changes`);
  const authFailureExt = new AuthFailureExtension(logger);
  // const loggingExt = new LoggingExtension(logger);
  topic.subscribeWithReplay(replayId, [authFailureExt], data => {
    try {
      const object = data.payload &&
        data.payload.ChangeEventHeader &&
        data.payload.ChangeEventHeader.entityName;

      // Broadcast the change
      rxSubject.next({
        type: object ? "change" : "event",
        name: object ? object : topic.name,
        content: data
      });

      // Checkpoint at the new replayId
      return saveReplayId(data.event.replayId);

    } catch (err) {
      logger(`!      Changes subscription error: ${err.stack}`);
    }
  });
  return rxSubject;
}


/**
 * Detect auth failure extension
 *
 * Based on new feature in Salesforce Spring '18:
 * https://releasenotes.docs.salesforce.com/en-us/spring18/release-notes/rn_messaging_cometd_auth_validation.htm?edition=&impact=
 *
 * {"ext":{"sfdc":{"failureReason":"401::Authentication invalid"},"replay":true,"payload.format":true},"advice":{"reconnect":"none"},"channel":"/meta/handshake","id":"2x","error":"403::Handshake denied","successful":false}
 */
const AuthFailureExtension = function(logger) {
  this.incoming = function(message, callback) {
    if (
      (message.channel === '/meta/connect' ||
        message.channel === '/meta/handshake')
      && message.advice
      && message.advice.reconnect == 'none'
    ) {
      logger(`!      Exiting because Salesforce authentication was lost: ${message.error}`);
      process.exit(1);
    }
    callback(message);
  }
};

/**
 * Log all incoming CometD messages
 */
const LoggingExtension = function(logger) {
  this.incoming = function(message, callback) {
    logger(`       👁‍🗨 message from Salesforce ${JSON.stringify(message)}`);
    callback(message);
  }
};

module.exports = observe;
