# Salesforce Data Connector

Receive data from a Salesforce org: schemas, bulk records, and CDC (change data capture) streams.

💻👩‍🔬 *This project is a exploration into solving emerging use-cases for Salesforce data.*

Architecture
------------

A reactive streaming provider of Salesforce schema, data, and ongoing changes.

### Processes

1. Authenticate with Salesforce API
1. Push messages from CDC firehose
1. Push message for each sObject's schema & existing records

### Internal Message Types

* **Schema**

    ```json
    {
      "type": "schema",
      "object": "Account",
      "content": { }
    }
    ```

  `content` contains sobjects/describe API response.
* **Records**

    ```json
    {
      "type": "records",
      "object": "Account",
      "content": [ ]
    }
    ```

  `content` contains array of records from Bulk API.
* **Change**

    ```json
    {
      "type": "change",
      "object": "Account",
      "content": { }
    }
    ```

  `content` contains CDC event data.


Requirements
------------

* [Node.js](https://nodejs.org/) 8.9 with npm 5

Install
-------

1. Clone or fork this repo.
1. `cd salesforce-data-connector/` (or whatever you named the repo's directory)
1. `brew install cmake boost` (dependencies for **node-parquet**)
1. `npm install`

#### Install a plugin

1. `npm install salesforce-data-connector-plugin-example` (not a real plugin)
2. Update the environment variable with a comma-separated list of the plugins to load:

    ```bash
    PLUGIN_NAMES=console-output,example
    ```

Usage
-----

### First time setup

```bash
npm install
cp .env.sample .env
```

Then, update `.env` file with config values for auth & debugging:

```
VERBOSE=true
SALESFORCE_USERNAME=mmm@mmm.mmm
SALESFORCE_PASSWORD=nnnnnttttt
```

### Output to console

Sample command:

```bash
SOBJECT_NAMES=Account,Contact,Lead,Opportunity \
node lib/exec
```

🔁 *This command runs continuously, listening for change events.*

### Output to Parquet (on S3)

To enable writing to S3, add AWS config to `.env`:

```
AWS_ACCESS_KEY_ID=xxxxx
AWS_REGION=yy-yyyy-y
AWS_SECRET_ACCESS_KEY=zzzzz
BUCKET_NAME=aaaaa
```

Sample command:

```bash
PLUGIN_NAMES=console-output,parquet-output \
SOBJECT_NAMES=Product2,Pricebook2 \
READ_MODE=records \
node lib/exec
```

🛑 *This command exits after all parquet files are written.*

Set `PLUGIN_NAMES=parquet-output` to activate the plugin.

The parquet files will be written locally to the current working directory. Those files also **upload to S3 if the `AWS_*` & `BUCKET_NAME` env vars are set**.

The parquet plugin does not use change events, because they cannot be updated in-place. Unless the change stream is needed by a different plugin, configure the app to exit upon completion by setting `READ_MODE=records`.


Configuration
-------------

### Configure Authentication

Performed based on environment variables. Either of the following authentication methods may be used:

* Username + password
  * `SALESFORCE_USERNAME`
  * `SALESFORCE_PASSWORD` (password+securitytoken)
  * `SALESFORCE_LOGIN_URL` (optional; defaults to **login.salesforce.com**)
* OAuth tokens
  * `SALESFORCE_URL`
    * *Must include oAuth client ID, secret, & refresh token*
    * Example: `force://{client-id}:{secret}:{refresh-token}@{instance-name}.salesforce.com`

### Configure Runtime Behavior

* `VERBOSE`
  * enable detailed runtime logging to stderr
  * example: `VERBOSE=true`
  * default value: unset, no log output
* `PLUGIN_NAMES`
  * configure the consumers/observers of the Salesforce data streams
  * example: `PLUGIN_NAMES=console-output,parquet-output`
  * default value: `console-output`
* `SELECT_SOBJECTS`
  * a comma-separated list of Salesforce objects to read
  * example: `SELECT_SOBJECTS=Product2,Pricebook2`
  * default value: unset, all readable objects
* `READ_MODE`
  * one of three values
    * `records` for sObject schemas and bulk queries
      * *process will exit when compete*
    * `changes` for CDC (change data capture) streams
    * `all` for both records & changes
  * example: `READ_MODE=records`
  * default value: `all`
* `OUTPUT_PATH`
  * location to write output files
  * example: `OUTPUT_PATH=~/salesforce-data-connector`
  * default value: `tmp/`


Local development
-----------------

Set configuration values in a `.env` file based on `.env.sample`.

### Implementing Plugins

Observers (consumers) of the main data stream are implemented as plugins.

Each plugin's **observe function** receives two [Rx.Observables](http://reactivex.io/rxjs/manual/overview.html#observable) pushing schemas+records and change messages. RxJS provides a large palette of [reactive operators](http://reactivex.io/rxjs/manual/overview.html#operators) to transform and consume the stream.

💡 *See [plugin-console-output](./lib/plugin-console-output.js) for a reference implementation.*

When this app runs, it will try to load each plugin specified in the `PLUGIN_NAMES` environment variable, first from the relative `lib/` path and then from `node_modules/`.

* **relative modules in `lib/`**
  * Plugin names are resolved to a filename
  * The `plugin-` name prefix is required in the filename
  * For a plugin named `example`, the source file must be located in `lib/plugin-example.js`
* **npm packages in `node_modules/`**
  * Plugin names are resolve to an npm package name
  * The `salesforce-data-connector-plugin-` name prefix is required in the package name
  * For a plugin named `example`, the npm package must be named `salesforce-data-connector-plugin-example`.

#### Observe function signature

```javascript
function friendlyName(
  schemaAndRecordsObservable,  // Rx.Observable (the data stream source)
  changeDataCaptureObservable, // Rx.Observable (the data stream source)
  env,                         // object containing current environment variables
  logger                       // (optional) Function: call with log messages, default no-op
)
```

Testing
-------

Implemented with [AVA](https://github.com/avajs/ava), concurrent test runner.

`npm test` runs only unit tests. It skips integration tests, because Salesforce and AWS config is not automated.

### Unit Tests

* `npm run test:unit`
* Defined in `lib/` alongside source files
* Salesforce API calls are mocked by way of [Episode 7](https://github.com/mars/episode-7)

### Integration Tests

* `npm run test:integration`
* Defined in `test/`
* Salesforce API calls are live 🚨


Notes
-----

### Read parquet files with Spark

Download the [Spark binary distribution](https://spark.apache.org/downloads.html), unzip it, and then run its `bin/spark-shell` executable:

```
$ ./spark-2.2.0-bin-hadoop2.7/bin/spark-shell

…

Welcome to
      ____              __
     / __/__  ___ _____/ /__
    _\ \/ _ \/ _ `/ __/  '_/
   /___/ .__/\_,_/_/ /_/\_\   version 2.2.0
      /_/

…

scala>
```

Once the `scala>` command prompt appears, proceed with the following commands (example is for `Product2`):

```
val sqlContext = new org.apache.spark.sql.SQLContext(sc)
val product2Data = sqlContext.read.parquet("salesforce-Product2.parquet")
product2Data.registerTempTable("Product2")
val allRecords = sqlContext.sql("SELECT * FROM Product2")
allRecords.show()
```
