const Episode7 = require('episode-7');

// Salesforce's supported fieldnames & configured foreign keys for the object.
//
// Returns an array of field names.
function* getCompatibleFieldnames(salesforceApi, objectName) {

  // Metadata describe field names
  const sobjectApi = salesforceApi.sobject(objectName);
  const description = yield Episode7.call([sobjectApi, sobjectApi.describe]);
  //console.log(`getCompatibleFieldnames ${JSON.stringify(description, null, 2)}`)
  const compatFieldNames = description.fields.reduce( (filteredNames, f) => {
    // Skip compound field types (they cannot be bulk queried)
    if (f.type !== 'address' && f.type !== 'location') {
      filteredNames.push(f.name);
    }
    return filteredNames;
  }, []);

  return compatFieldNames;
}

module.exports = getCompatibleFieldnames;
