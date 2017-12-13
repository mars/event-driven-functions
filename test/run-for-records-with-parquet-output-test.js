const dotenv = require('dotenv');
const fs = require('fs');
const mkdirp = require('mkdirp');
const glob = require('glob');
const test = require('ava');
const connector = require('../lib');
const Episode7 = require('episode-7');

test.beforeEach( t => {
  dotenv.config();

  t.context = {}
  const randPart = getRandomInt(100000, 999999)
  t.context.outputPath = `tmp/test-${randPart}/`
  mkdirp.sync(t.context.outputPath)
  cleanTestData(t.context.outputPath)

  // Prevent AVA from exiting early when waiting on Parquet writer
  // (which hangs ;-( for some error conditions)
  t.context.testTimer = setTimeout(() => {}, 30000)
});
test.afterEach( t => {
  cleanTestData(t.context.outputPath)
  fs.rmdirSync(t.context.outputPath)

  clearTimeout(t.context.testTimer)
});

test('Run for records with parquet output', t => {
  t.plan(2)

  const outputPath = t.context.outputPath

  const env = Object.assign( process.env, {
    SELECT_SOBJECTS: 'Product2,Pricebook2',
    READ_MODE: 'records',
    PLUGIN_NAMES: 'parquet-output',
    OUTPUT_PATH: outputPath,
    VERBOSE: true
  })

  const loglines = []
  const loggerSpy = {
    write: m => loglines.push(m)
  }

  return Episode7.run(connector.run, env, loggerSpy)
    .then( result => {
      const pricebook2FStat = fs.statSync(`${outputPath}salesforce-Pricebook2.parquet`)
      t.true(
        pricebook2FStat.isFile(),
        'writes Pricebook2 parquet file'
      )
      const product2FStat = fs.statSync(`${outputPath}salesforce-Pricebook2.parquet`)
      t.true(
        product2FStat.isFile(),
        'writes Product2 parquet file'
      )
    })
})

function cleanTestData(outputPath) {
  const oldFiles = glob.sync(`${outputPath}*.parquet`)
  oldFiles.forEach( f => fs.unlinkSync(f) )
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
