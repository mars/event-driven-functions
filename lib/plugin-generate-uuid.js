const loggers = require('./loggers');
const uuidv4 = require('uuid/v4');

module.exports = {
  observe: function observeForGenerateUUID(
    schemaAndRecordsObservable,
    platformEventsObservable,
    env,
    salesforceApi,
    logger = loggers.default
  ) {
    const observeTopicName = env.OBSERVE_SALESFORCE_TOPIC_NAME;
    if (observeTopicName == null) {
      throw new Error('Requires OBSERVE_SALESFORCE_TOPIC_NAME env var');
    }
    const returnEventName = env.RETURN_UUID_EVENT_NAME;
    if (returnEventName == null) {
      throw new Error('Requires RETURN_UUID_EVENT_NAME env var');
    }

    // Reply to each Generate UUID Invoke
    platformEventsObservable.subscribe({
      next: event => {
        // Only act on the configured Platform Event
        if (event.name === observeTopicName) {
          /* Example event.content →
            {
              "schema": "xxxxx",
              "payload": {
                "Context_Id": "xxxxx",
                "Value": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx"
              },
              "event": {
                "replayId": 8
              }
            }
          */
          const eventPayload = event && event.content && event.content.payload;
          const contextId = eventPayload && eventPayload.Context_Id;
          if (contextId == null) {
            logger(`       ❌ Context_Id is required in topic ${observeTopicName}, Salesforce instance ${salesforceApi && salesforceApi.instanceUrl}`)
            return;
          } else {
            logger(`       📥 Invoke: Generate UUID ${contextId}`)

            const result = {
              Context_Id: contextId,
              Value: uuidv4()
            };

            salesforceApi
              .sobject(returnEventName)
              .create(result, (err, res) => {
                if (err || !res.success) {
                  logger(`       ❌ Failed to publish Function Return: Generate UUID ${contextId}, Salesforce instance ${salesforceApi && salesforceApi.instanceUrl}, topic ${observeTopicName}: ${err.stack}`)

                  if (!res.success && res.errors instanceof Array) {
                    logger(`       ⛔️ Salesforce errors: ${res.errors.join('; ')}`);
                  }
                  return;
                } else {
                  logger(`       📤 Return: Generate UUID ${contextId}`)
                }
              });
          }
        }
      }
    });
  }
}
