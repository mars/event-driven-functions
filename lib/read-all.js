const util = require('util');

const Episode7 = require('episode-7');
const Rx = require('rxjs/Rx');
const jsforce = require('jsforce');
const Promise = jsforce.Promise;

const getSchema               = require('./get-schema');
const loggers                 = require('./loggers');

const bulkPollInterval = 5000; // 5-seconds

function* readAll(salesforceApi, selectSobjects, logger = loggers.default) {
  logger(`-----> Read all records from Salesforce`);
  
  let readAllObservable = new Rx.Observable.empty().observeOn(Rx.Scheduler.queue);

  const globalDesc = yield Episode7.call([salesforceApi, salesforceApi.describeGlobal]);
  const readableObjects = globalDesc.sobjects
    .filter( o =>
      o.createable && o.replicateable && o.triggerable
        && !['CollaborationGroupRecord', 'IdeaComment'].includes(o.name)) // Batch jobs fail for these.
    .map( o => o.name );
  logger(`       ${readableObjects.length} readable ${readableObjects.length === 1 ? 'object' : 'objects'}`);

  if (selectSobjects != null) {
    selectSobjects = selectSobjects.split(/[,\s]+/);
    const notReadableObjects = selectSobjects.filter( n => !readableObjects.includes(n))
    if (notReadableObjects.length) {
      throw new Error(`Cannot read some of the configured sObjects: ${notReadableObjects.join(', ')}`);
    }
    logger(`       selecting ${selectSobjects.length} ${selectSobjects.length === 1 ? 'object' : 'objects'}`);
  } else {
    selectSobjects = readableObjects;
    logger('       selecting all objects');
  }

  for (objectName of selectSobjects) {
    const objectObservable = new Rx.Subject().observeOn(Rx.Scheduler.queue);
    readAllObservable = readAllObservable.merge(objectObservable);
    // Don't wait. Return ASAP.
    Episode7.run(asyncBulkQuery, salesforceApi, objectName, objectObservable, logger)
      .catch(err => { throw err });
  }

  return readAllObservable;
}

function* asyncBulkQuery(salesforceApi, objectName, outputObservable, logger = loggers.default) {
  const schema = yield Episode7.call(getSchema, salesforceApi, objectName);
  const fieldNames = Object.entries(schema).map( e => e[0] );

  outputObservable.next({
    type: "schema",
    name: objectName,
    content: schema
  });

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
    throw new Error(`Bulk query failed for "${objectName}": ${batchStatus.stateMessage}`);
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

  let batchResultsCount = batchResults.length;
  if (batchResultsCount === 0) {
    outputObservable.complete();
  }

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
      batchResultsCount = batchResultsCount - 1;
      if (batchResult.length !== 0) {
        outputObservable.next({
          type: "records",
          name: objectName,
          content: batchResult
        })
      }
      if (batchResultsCount === 0) {
        outputObservable.complete();
      }
    });
  }
}

module.exports = readAll;
