const util = require('util');

const Episode7 = require('episode-7');
const Rx = require('rxjs/Rx');
const jsforce = require('jsforce');
const Promise = jsforce.Promise;

const getCompatibleFieldnames = require('./get-compatible-fieldnames');
const loggers                 = require('./loggers');

const bulkPollInterval = 2000; // 2-seconds

function* readAll(salesforceApi, logger = loggers.default) {
  logger(`-----> Loading records from Salesforce`);
  
  const readAllObservable = new Rx.Subject();

  const readableObjects = ['Account'];

  for (objectName of readableObjects) {
    logger(`-----> Bulk read "${objectName}" records`);

    const fieldNames = yield Episode7.call(getCompatibleFieldnames, salesforceApi, objectName);

    const newJobInfo = yield Episode7.call([salesforceApi.bulk, salesforceApi.bulk._request], {
      method : 'POST',
      path: '/job',
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operation: "query",
        object: objectName,
        contentType: "JSON"
      })
    });
    logger(`       new job info: ${util.inspect(newJobInfo)}`);

    const newBatchInfo = yield Episode7.call([salesforceApi.bulk, salesforceApi.bulk._request], {
      method : 'POST',
      path : `/job/${newJobInfo.id}/batch`,
      headers: {
        "Content-Type": "application/json"
      },
      responseType: "application/json",
      body: `SELECT ${fieldNames.join(', ')} FROM ${objectName}`
    });
    logger(`       new batch info: ${util.inspect(newBatchInfo)}`);

    let batchStatus
    do {
      batchStatus = yield Episode7.call(throttledCheckStatus);
      function throttledCheckStatus() {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            salesforceApi.bulk._request({
              method : 'GET',
              path : `/job/${newJobInfo.id}/batch/${newBatchInfo.id}`,
              headers: {
                "Content-Type": "application/json"
              },
              responseType: "application/json"
            })
            .then(result => resolve(result))
            .catch(err => reject(err));
          }, bulkPollInterval)
        });
      }
      logger(`       batch status: ${util.inspect(batchStatus)}`);
    } while (batchStatus.state !== 'Completed');

    const batchResults = yield Episode7.call([salesforceApi.bulk, salesforceApi.bulk._request], {
      method : 'GET',
      path : `/job/${newJobInfo.id}/batch/${newBatchInfo.id}/result`,
      headers: {
        "Content-Type": "application/json"
      },
      responseType: "application/json"
    });
    logger(`       batch results: ${util.inspect(batchResults)}`);

    for (resultId of batchResults) {
      salesforceApi.bulk._request({
        method : 'GET',
        path : `/job/${newJobInfo.id}/batch/${newBatchInfo.id}/result/${resultId}`,
        headers: {
          "Content-Type": "application/json"
        },
        responseType: "application/json"
      })
      .then(batchResult => readAllObservable.next(batchResult));
    }
  }

  return readAllObservable;
}

module.exports = readAll;
