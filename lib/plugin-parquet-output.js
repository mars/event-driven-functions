const loggers = require('./loggers');
const Rx = require('rxjs/Rx');
const parquet = require('node-parquet');
const util = require('util');

module.exports = {
  observe: function observeForParquetOutput(
    schemaAndRecordsObservable,
    changeDataCaptureObservable,
    logger = loggers.default
  ) {
    schemaAndRecordsObservable.subscribe({ error: err  => logger(`!      ${err}`) });
    writeToParquet(schemaAndRecordsObservable, logger);
  }
}

function writeToParquet(schemaAndRecordsObservable, logger) {
  let targetSchemas = {};
  let targetWriters = {};

  schemaAndRecordsObservable
    .subscribeOn(Rx.Scheduler.queue)
    .filter( x => x.type === 'schema' )
    .subscribe({
      next: x => targetSchemas[x.object] = sObjectDescribeToParquetSchema(x.content, x.object, logger)
    });

  schemaAndRecordsObservable
    .subscribeOn(Rx.Scheduler.queue)
    .filter( x => x.type === 'records' )
    .subscribe({
      next: x => {
        const object = x.object;
        const records = x.content;
        const targetSchema = targetSchemas[object];
        const fields = Object.keys(targetSchema);

        logger(`       🚚  write to parquet ${records.length} ${object} ${records.length === 1 ? 'record' : 'records'}`);

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

        const writer = targetWriters[object] = targetWriters[object] ||
          new parquet.ParquetWriter(`salesforce-${object}.parquet`, parquetSchema, 'snappy');
        writer.write(data);
      },
      complete: () => {
        logger(`       🏁  closing all parquet files`)
        Object.entries(targetWriters).forEach( v => v[1].close() )
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