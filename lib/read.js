const test = require('ava');
const cdcConnector = require('.');
const patientBulkOp = require('jsforce-patient-bulk-op');
const loggers = require('./loggers');

test.beforeEach( t => {
  const context = t.context;
  context.bulkTimeout = 300000;
  context.bulkPollInterval = 2000;
});

test('.readAll', t => {
  const context = t.context;
  const mockSalesforceApi = { bulk: { load: () => {} }}

  const subjectGenerator = cdcConnector.readAll(mockSalesforceApi)

  let yielded
  yielded = subjectGenerator.next()

  t.is(yielded.value.fn, fingerprint.exists)
  t.deepEqual(yielded.value.args, [mockSalesforceApi, mockInput, loggers.default])

  yielded = subjectGenerator.next(false)

  t.is(yielded.value.fn, cdcConnector.filterCompatibleFields)
  t.deepEqual(yielded.value.args, [mockSalesforceApi, 'Account', mockInput.config.objects, mockInput.records, loggers.default])

  yielded = subjectGenerator.next(mockInput.records.Account)

  t.is(yielded.value.fn, cdcConnector.filterCompatibleFields)
  t.deepEqual(yielded.value.args, [mockSalesforceApi, 'Contact', mockInput.config.objects, mockInput.records, loggers.default])

  yielded = subjectGenerator.next(mockInput.records.Contact)

  t.is(yielded.value.fn, patientBulkOp)
  t.deepEqual(yielded.value.args, [mockSalesforceApi, 'Account', mockInput.records.Account, "insert", context.bulkTimeout, context.bulkPollInterval, loggers.default])

  yielded = subjectGenerator.next([
    { id: "a0", success: true, errors: [] },
    { id: "b0", success: true, errors: [] }
  ])

  t.is(yielded.value.fn, patientBulkOp)
  t.deepEqual(yielded.value.args, [mockSalesforceApi, 'Contact', [
    { Id: "x", LastName: "X", AccountId: "a0" },
    { Id: "y", LastName: "Y", AccountId: "b0" }
  ], "insert", context.bulkTimeout, context.bulkPollInterval, loggers.default])

  yielded = subjectGenerator.next([
    { id: "x0", success: true, errors: [] },
    { id: "y0", success: true, errors: [] }
  ])

  t.is(yielded.value.fn, fingerprint.save)
  t.deepEqual(yielded.value.args, [mockSalesforceApi, mockInput, loggers.default])

  yielded = subjectGenerator.next()

  // Return value
  t.true(yielded.done, 'is done')
  t.deepEqual(yielded.value.config, mockInput.config)
  t.deepEqual(yielded.value.records, {
    Account: [
      { Id: "a", Name: "A" },
      { Id: "b", Name: "B" }
    ],
    Contact: [
      { Id: "x", LastName: "X", AccountId: "a0" },
      { Id: "y", LastName: "Y", AccountId: "b0" }
    ]
  })
  t.deepEqual(yielded.value.responses, {
    Account: [
      { id: "a0", success: true, errors: [] },
      { id: "b0", success: true, errors: [] }
    ],
    Contact: [
      { id: "x0", success: true, errors: [] },
      { id: "y0", success: true, errors: [] }
    ]
  })
})
