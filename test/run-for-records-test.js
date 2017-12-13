const dotenv = require('dotenv');
const test = require('ava');
const connector = require('../lib');
const Episode7 = require('episode-7');

test.beforeEach( t => {
  dotenv.config();
});

test('Run for records', t => {
  t.plan(6)

  const env = Object.assign( process.env, {
    SELECT_SOBJECTS: 'Product2,Pricebook2',
    READ_MODE: 'records',
    PLUGIN_NAMES: 'console-output',
    VERBOSE: true
  })

  const loglines = []
  const loggerSpy = {
    write: m => loglines.push(m)
  }

  return Episode7.run(connector.run, env, loggerSpy)
    .then( result => {
      t.true(
        loglines.some( m => /selecting 2 objects/i.test(m) ),
        'selects 2 objects'
      )
      t.true(
        loglines.some( m => /schema\/Pricebook2/i.test(m) ),
        'receives Pricebook2 schema'
      )
      t.true(
        loglines.some( m => /schema\/Product2/i.test(m) ),
        'receives Product2 schema'
      )
      t.true(
        loglines.some( m => /records\/Pricebook2/i.test(m) ),
        'receives Pricebook2 records'
      )
      t.true(
        loglines.some( m => /records\/Product2/i.test(m) ),
        'receives Product2 records'
      )
      t.true(
        loglines.some( m => /Read all completed/i.test(m) ),
        'read all completes'
      )
    })
})
