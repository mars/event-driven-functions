const loggers = require('../loggers');
const uuidv4 = require('uuid/v4');

/*
Salesforce Platform Event-driven function.

Input event: `Heroku_Function_Generate_UUID_Invoke__e`
Output event: `Heroku_Function_Generate_UUID_Return__e`
*/
module.exports = function(payload, logger = loggers.default) {
  logger(`       ❄️  Generate_UUID for ${payload.Context_Id__c}`);
  
  // Return the payload expected by the Return event's schema
  return {
    // Must always pass Context ID through unchanged.
    Context_Id__c: payload.Context_Id__c,
    // Additional return values as defined by the Return event.
    Value__c: uuidv4()
  };
}
