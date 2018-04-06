const loggers = require('./loggers');
const Rx = require('rxjs/Rx');
const parquet = require('node-parquet');
const s3Put = require('./s3-put');

const defaultS3Path = '/salesforce-data-connector/';

module.exports = {
  observe: function observeForParquetOutput(
    schemaAndRecordsObservable,
    changeDataCaptureObservable,
    env,
    salesforceApi,
    logger = loggers.default
  ) {
    writeToParquet(schemaAndRecordsObservable, env, logger);
  }
}

function writeToParquet(schemaAndRecordsObservable, env, logger) {
  let targetSchemas = {};
  let targetWriters = {};

  schemaAndRecordsObservable
    .subscribeOn(Rx.Scheduler.queue)
    .filter( x => x.type === 'schema' )
    .subscribe({
      next: x => {
        try {
          targetSchemas[x.name] = sObjectDescribeToParquetSchema(x.content, x.name, logger)
        } catch (err) {
          logger(`!      writeToParquet failed for "${x.name}" schema: ${err.stack}`)
          throw data;
        }
      }
    });

  schemaAndRecordsObservable
    .subscribeOn(Rx.Scheduler.queue)
    .filter( x => x.type === 'records' )
    .subscribe({
      next: x => {
        const name = x.name;
        const records = x.content;
        const targetSchema = targetSchemas[name];
        const fields = Object.keys(targetSchema);
        logger(`       🚚  write to parquet ${records.length} ${name} ${records.length === 1 ? 'record' : 'records'}`);
        try {
          // Pluck just the Parquet part of the sObject schemas into their own object.
          const parquetSchema = {};
          Object.entries(targetSchema).map( s => parquetSchema[s[0]] = s[1].parquet );

          // Create an array of records with column values in sparse arrays.
          const data = records.map( r => {
            const recordData = [];
            for (i in fields) {
              const n = fields[i];

              // Leave the array empty (sparse) for null & undefined values.
              // …otherwise parquet-cpp will hang!
              if (r[n] == null) { continue; }

              const transform = targetSchema[n].transform;
              recordData[i] = transform ? transform(r[n]) : r[n];
            }
            return recordData;
          });

          const writer = targetWriters[name] = targetWriters[name] ||
            new parquet.ParquetWriter(parquetFilepath(name, env.OUTPUT_PATH), parquetSchema, 'snappy');
          writer.write(data);
        } catch (err) {
          logger(`!      writeToParquet failed for "${name}" records: ${err.stack}`)
          throw data;
        }
      },
      complete: () => {
        // All chunks processed, so close all the parquet files.
        Object.entries(targetWriters).forEach( v => v[1].close() )

        if (env.BUCKET_NAME != null) {
          const s3Puts = Object.entries(targetWriters).map( v => {
            const filename = parquetFilepath(v[0], env.OUTPUT_PATH);
            return s3Put(filename, `${defaultS3Path}${filename}`, env, logger);
          });
          Promise.all(s3Puts).then( allResponses => {
            logger('       🏁  finished uploading parquet files');
          })
        } else {
          logger('       🏁  finished writing parquet files');
        }
      }
    });

}

function sObjectDescribeToParquetSchema(describeFields, objectName, logger) {
  let targetSchema = {};
  Object.entries(describeFields).forEach( v => {
    targetSchema[v[0]] = sObjectFieldToParquetSchema(v[1], objectName, logger);
  });
  return targetSchema;
}

function sObjectFieldToParquetSchema(fieldDesc, objectName, logger) {
  let output = {
    // the Parquet schema object for this field
    parquet: {}
    //// a function to transform the Salesforce value to the Parquet value
    //transform: null
  };
  switch (fieldDesc.type) {
    case 'boolean':
      output.parquet.type = 'bool';
      break;
    case 'base64':
    case 'combobox':
    case 'email':
    case 'encryptedstring':
    case 'id':
    case 'masterrecord':
    case 'multipicklist':
    case 'phone':
    case 'picklist':
    case 'reference':
    case 'string':
    case 'textarea':
    case 'url':
      output.parquet.type = 'string';
      break;
    case 'currency':
    case 'double':
    case 'percent':
      output.parquet.type = 'double';
      break;
    case 'int':
      output.parquet.type = 'int64';
      break;
    case 'date':
    case 'datetime':
      output.parquet.type = 'timestamp';
      output.transform = transformTimestampToDate;
      break;
    case 'junctionidlist':
      output.parquet.type = 'group';
      output.parquet.schema = {
        type: 'string',
        repeated: true
      };
      break;
    default:
      logger(`!      sObjectFieldToParquetSchema unhandled field type "${fieldDesc.type}" for ${objectName}.${fieldDesc.name}`)
  }
  if (fieldDesc.nillable) {
    output.parquet.optional = true;
  }
  return output;
}

function transformTimestampToDate(v) {
  return v != null ? new Date(v) : v;
}

function parquetFilepath(objectName, path) {
  path = path || 'tmp';
  if (! /\/$/.test(path)) {
    path = `${path}/`
  }
  return `${path}salesforce-${objectName}.parquet`;
}
