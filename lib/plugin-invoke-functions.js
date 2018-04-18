const loggers = require('./loggers');
const functions = require('./functions');

const platformEventInvokeMatcher  = /^\/event\/Heroku_Function_(.+)?_Invoke__e$/;
const platformEventReturnTemplate = name => `Heroku_Function_${name}_Return__e`;
const valueSeparator              = /[,\s]+/;

module.exports = {
  observe: function observeForInvokeFunctions(
    schemaAndRecordsObservable,
    platformEventsObservable,
    env,
    salesforceApi,
    logger = loggers.default
  ) {
    const observeTopicNames = env.OBSERVE_SALESFORCE_TOPIC_NAMES
      && env.OBSERVE_SALESFORCE_TOPIC_NAMES.length > 0
        ? env.OBSERVE_SALESFORCE_TOPIC_NAMES.split(valueSeparator)
        : [];
    if (! observeTopicNames instanceof Array || observeTopicNames.length < 1) {
      throw new Error('Requires OBSERVE_SALESFORCE_TOPIC_NAMES env var');
    }

    observeTopicNames.map( observeTopicName => {
      platformEventsObservable.subscribe({
        next: event => {
          // Only act on `Heroku_Function_*_Invoke__e` events
          const eventName = event.name || '';
          const eventMatch = eventName.match(platformEventInvokeMatcher);
          if (eventMatch) {
            const functionName = eventMatch[1];
            /* Example event.content →
              {
                "schema": "xxxxx",
                "payload": {
                  "Context_Id__c": "xxxxx"
                },
                "event": {
                  "replayId": 8
                }
              }
            */
            const eventPayload = event && event.content && event.content.payload;
            const contextId = eventPayload && eventPayload.Context_Id__c;
            if (contextId == null) {
              logger(`       ❌ Context_Id__c is required in topic ${observeTopicName}, Salesforce instance ${salesforceApi && salesforceApi.instanceUrl}`)
              return;
            } else {
              logger(`       📥 Invoke: ${functionName} for ${contextId}`);

              const returnEventName = platformEventReturnTemplate(functionName);

              const functionToInvoke = functions[functionName];
              if (! functionToInvoke instanceof Function) {
                logger(`       ❌ Function does not exist: ${functionName} for ${contextId}. Please ensure the function has been implemented and exported by name from lib/functions/index.js`);
                return;
              }

              let result;
              try {
                result = functionToInvoke(eventPayload, logger);
              } catch (err) {
                logger(`       ❌ Error invoking function: ${functionName} for ${contextId}: ${err.stack}`);
                return;
              }

              if (result == null) {
                logger(`       ❎ No return value from ${functionName} for ${contextId}`);
              } else {
                // TODO move this async Salesforce API work into a separate. durable Kafka consumer.
                salesforceApi
                  .sobject(returnEventName)
                  .create(result, (err, res) => {
                    if (err || !res.success) {
                      logger(`       ❌ Failed to publish function return event: ${returnEventName} for ${contextId}, Salesforce instance ${salesforceApi && salesforceApi.instanceUrl}, topic ${observeTopicName}: ${err.stack}`);

                      if (!res.success && res.errors instanceof Array) {
                        logger(`       ⛔️ Salesforce errors: ${res.errors.join('; ')}`);
                      }
                      return;
                    } else {
                      logger(`       📤 Return: ${functionName} for ${contextId}`);
                    }
                  });
              }
            }
          }
        }
      });
    });
  }
}
