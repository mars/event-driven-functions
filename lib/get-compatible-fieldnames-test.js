const test = require('ava');
const dedalo = require('.');
const data_describeAccount = require('../test/data/describe-account');

test('.getCompatibleFieldnames', t => {
  const mockSObjectAPI    = { describe: () => {} }
  const mockSalesforceApi = {  sobject: () => mockSObjectAPI }
  const sObjectName       = 'Account'
  const mockConfigObjects = { Account: {} }

  const subjectGenerator = dedalo.getCompatibleFieldnames(
    mockSalesforceApi, sObjectName, mockConfigObjects)

  let yielded
  yielded = subjectGenerator.next()

  t.deepEqual(yielded.value.fn, [mockSObjectAPI, mockSObjectAPI.describe])

  yielded = subjectGenerator.next(data_describeAccount)

  // Return value
  t.true(yielded.done, 'is done')
  t.deepEqual(yielded.value, mockCompatibleFieldnames)
})



const mockCompatibleFieldnames = [
  "Id",
  "Name",
  "Type",
  "ParentId",
  "BillingStreet",
  "BillingCity",
  "BillingState",
  "BillingPostalCode",
  "BillingCountry",
  "BillingLatitude",
  "BillingLongitude",
  "BillingGeocodeAccuracy",
  "ShippingStreet",
  "ShippingCity",
  "ShippingState",
  "ShippingPostalCode",
  "ShippingCountry",
  "ShippingLatitude",
  "ShippingLongitude",
  "ShippingGeocodeAccuracy",
  "Phone",
  "Fax",
  "AccountNumber",
  "Website",
  "Sic",
  "Industry",
  "AnnualRevenue",
  "NumberOfEmployees",
  "Ownership",
  "TickerSymbol",
  "Description",
  "Rating",
  "Site",
  "Jigsaw",
  "CleanStatus",
  "AccountSource",
  "DunsNumber",
  "Tradestyle",
  "NaicsCode",
  "NaicsDesc",
  "YearStarted",
  "SicDesc",
  "DandbCompanyId",
  "CustomerPriority__c",
  "SLA__c",
  "Active__c",
  "NumberofLocations__c",
  "UpsellOpportunity__c",
  "SLASerialNumber__c",
  "SLAExpirationDate__c"
]
