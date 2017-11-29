const url = require('url');
const jsforce = require('jsforce');
const jsforceConnection = require('jsforce-connection').connectionFromUrl;
const Episode7 = require('episode-7');
const loggers = require('./loggers');

/*
Accepts Salesforce auth by username/password or an oauth client/refresh URL via env vars:
  * `SALESFORCE_URL`
  * `SALESFORCE_USERNAME`
  * `SALESFORCE_PASSWORD`
  * `SALESFORCE_LOGIN_URL`

Returns the jsforce Salesforce connection adapter.
*/
function* initSalesforceApi(env, forceComVersion, logger = loggers.default) {
  let usePasswordAuth;

  if (env.SALESFORCE_URL != null) {
    // Use SALESFORCE_URL for instantly reliable connection
    return jsforceConnection(env.SALESFORCE_URL, forceComVersion);

  } else if (env.SALESFORCE_USERNAME != null && env.SALESFORCE_PASSWORD != null) {
    // Use plain jsforce with username/password
    const salesforceApi = new jsforce.Connection({
      loginUrl: env.SALESFORCE_LOGIN_URL,
      version: forceComVersion
    });

    yield Episode7.call(
      [salesforceApi, salesforceApi.login],
      env.SALESFORCE_USERNAME,
      env.SALESFORCE_PASSWORD
    );
    
    const identity = yield Episode7.call([salesforceApi, salesforceApi.identity]);
    logger('-----> Identity', identity.username);

    return salesforceApi;

  } else {
    throw new Error('Requires either `SALESFORCE_URL` (containing auth) or `SALESFORCE_USERNAME`+`SALESFORCE_PASSWORD` environment vars.');
  }
}

module.exports = initSalesforceApi;
