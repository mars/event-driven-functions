const Episode7 = require('episode-7');

// Salesforce's schema for the object.
//
// Returns an object of fieldnames -> info.
function* getSchema(salesforceApi, objectName) {

  // Metadata describe field names
  const sobjectApi = salesforceApi.sobject(objectName);
  const description = yield Episode7.call([sobjectApi, sobjectApi.describe]);
  //console.log(`getSchema ${JSON.stringify(description, null, 2)}`)
  const schema = description.fields.reduce( (result, f) => {
    // Skip compound field types (they cannot be bulk queried)
    if (f.type !== 'address' && f.type !== 'location') {
      result[f.name] = f;
    }
    return result;
  }, {});

  //console.log(`getSchema ${JSON.stringify(schema, null, 2)}`)
  return schema;
}

module.exports = getSchema;
