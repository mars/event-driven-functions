const Episode7 = require('episode-7');

// Salesforce's supported fieldnames & configured foreign keys for the object.
//
// Returns an array of field names.
function* getCompatibleFieldnames(salesforceApi, objectName) {

  // Metadata describe field names
  const sobjectApi = salesforceApi.sobject(objectName);
  const description = yield Episode7.call([sobjectApi, sobjectApi.describe]);
  const compatFieldNames = description.fields.reduce( (filteredNames, f) => {
    if ((f.createable || f.name === 'Id') && f.name !== 'OwnerId') {
      filteredNames.push(f.name);
    }
    return filteredNames;
  }, []);

  return compatFieldNames;
}

module.exports = getCompatibleFieldnames;
