const util = require('util');

const Episode7 = require('episode-7');
const Rx = require('rxjs/Rx');
const jsforce = require('jsforce');
const Promise = jsforce.Promise;

const getCompatibleFieldnames = require('./get-compatible-fieldnames');
const loggers                 = require('./loggers');

const bulkPollInterval = 5000; // 5-seconds

function* readAll(salesforceApi, logger = loggers.default) {
  logger(`-----> Loading records from Salesforce`);
  
  const readAllObservable = new Rx.Subject();

  const globalDesc = yield Episode7.call([salesforceApi, salesforceApi.describeGlobal]);
  const readableObjects = globalDesc.sobjects
    .filter( o =>
      o.createable && o.replicateable && o.triggerable
        && !['CollaborationGroupRecord', 'IdeaComment'].includes(o.name)) // Batch jobs fail for these.
    .map( o => o.name );
  logger(`       ${readableObjects.length} readable ${readableObjects.length === 1 ? 'object' : 'objects'}`);

  for (objectName of readableObjects) {
    logger(`-----> Bulk read "${objectName}" records`);

    // Don't wait. Return ASAP.
    Episode7.run(asyncBulkQuery, salesforceApi, objectName, readAllObservable, logger)
      .catch(err => console.error(`readAll failed for object "${objectName}": ${err.stack}`));
  }

  return readAllObservable;
}

function* asyncBulkQuery(salesforceApi, objectName, observable, logger = loggers.default) {
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

  const newBatchInfo = yield Episode7.call([salesforceApi.bulk, salesforceApi.bulk._request], {
    method : 'POST',
    path : `/job/${newJobInfo.id}/batch`,
    headers: {
      "Content-Type": "application/json"
    },
    responseType: "application/json",
    body: `SELECT ${fieldNames.join(', ')} FROM ${objectName}`
  });
  logger(`       Awaiting "${objectName}" batch…`);

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
  } while (batchStatus.state !== 'Completed' && batchStatus.state !== 'Failed');

  if (batchStatus.state === 'Failed') {
    logger(`       Batch failed for "${objectName}": ${batchStatus.stateMessage}`);
  }

  logger(`       Fetching "${objectName}" results…`);

  const batchResults = yield Episode7.call([salesforceApi.bulk, salesforceApi.bulk._request], {
    method : 'GET',
    path : `/job/${newJobInfo.id}/batch/${newBatchInfo.id}/result`,
    headers: {
      "Content-Type": "application/json"
    },
    responseType: "application/json"
  });

  for (resultId of batchResults) {
    salesforceApi.bulk._request({
      method : 'GET',
      path : `/job/${newJobInfo.id}/batch/${newBatchInfo.id}/result/${resultId}`,
      headers: {
        "Content-Type": "application/json"
      },
      responseType: "application/json"
    })
    .then(batchResult => {
      if (batchResult.length === 0) {
        logger(`       No "${objectName}" records found`);
      } else {
        logger(`       Pushing "${objectName}" records onto stream`);
        observable.next(batchResult)
      }
    });
  }
}

module.exports = readAll;
