# Salesforce Change Data Capture Connector

Receive data from a Salesforce org in a durable, continuous flow.

💻👩‍🔬 *This project is a exploration into solving common customer use-cases with Salesforce's newest streaming technology, Change Data Capture [CDC].*

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

### Plugins

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
  * The `salesforce-cdc-connector-plugin-` name prefix is required in the package name
  * For a plugin named `example`, the npm package must be named `salesforce-cdc-connector-plugin-example`.

#### Observe function signature

```javascript
function friendlyName(
  schemaAndRecordsObservable,  // Rx.Observable (the data stream source)
  changeDataCaptureObservable, // Rx.Observable (the data stream source)
  logger                       // (optional) Function: call with log messages, default no-op
)
```

#### Install a plugin

1. `npm install salesforce-cdc-connector-plugin-example --save`
2. Update the environment variable with a comma-separated list of the plugins to load:

    ```bash
    PLUGIN_NAMES=console-output,example
    ```


Requirements
------------

* [Node.js](https://nodejs.org/) 8.9.0

Install
-------

1. Clone or fork this repo.
1. `cd salesforce-cdc-connector/` (or whatever you named the repo's directory)
1. `brew install cmake boost` (dependencies for **node-parquet**)
1. `npm install`

Configuration
-------------

Authentication is performed based on environment variables. Either of the following authentication methods may be used:

* Username + password
  * `SALESFORCE_USERNAME`
  * `SALESFORCE_PASSWORD`
  * `SALESFORCE_LOGIN_URL` (optional; defaults to **login.salesforce.com**)
* OAuth tokens
  * `SALESFORCE_URL`
    * *Must include oAuth client ID, secret, & refresh token*
    * Example: `force://{client-id}:{secret}:{refresh-token}@{instance-name}.salesforce.com`

Additional runtime config vars:

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


Usage
-----

```bash
# First time setup:
npm install

# Run the connector:
node lib/exec
```

Local development
-----------------

Set configuration values in a `.env` file based on `.env.sample`.

Testing
-------

Implemented with [AVA](https://github.com/avajs/ava), concurrent test runner.

### Unit Tests

* `npm run test:unit`
* Defined in `lib/` alongside source files
* Salesforce API calls are mocked by way of [Episode 7](https://github.com/mars/episode-7)

### All Tests

* `npm test` or `npm run test`

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
