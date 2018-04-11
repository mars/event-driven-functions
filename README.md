# Salesforce Data Connector

Receive data from a Salesforce org: schemas, bulk records, CDC (change data capture) streams, and Platform Events.

💻👩‍🔬 *This project is a exploration into solving emerging use-cases for Salesforce data.*

Latest Changes
--------------

From [v1.0](https://github.com/heroku/salesforce-data-connector/releases/tag/v1.0.0) → [v2.0](https://github.com/heroku/salesforce-data-connector/releases/tag/v2.0.0):

* Internal Rx messages
  * ✅ new type added: `kafka`, including `commit` callback
  * 💢 property renamed: `object` → `name`
* Environment variables
  * ✅ added: `CONSUME_KAFKA_TOPIC_NAME`
  * 💢 renamed: `OBSERVE_TOPIC_NAME` → `OBSERVE_SALESFORCE_TOPIC_NAME`
  * 💢 default removed; set with: `OBSERVE_SALESFORCE_TOPIC_NAME=/data/ChangeEvents`
  * 💢 renamed: `SOBJECT_NAMES` → `SELECT_SOBJECTS`
* Kafka
  * 💢 default topic renamed: `salesforce-cdc-connector` → `salesforce-data-connector`
* Node modules
  * 💢 top-level export renamed: `observe` → `salesforceObserver`


Architecture
------------

A reactive streaming provider of Salesforce schema, data, changes, events, and Kafka messages.

### Internal Message Types

* **Schema**

    ```json
    {
      "type": "schema",
      "name": "Account",
      "content": { }
    }
    ```

  `content` contains sobjects/describe API response.
* **Records**

    ```json
    {
      "type": "records",
      "name": "Account",
      "content": [ ]
    }
    ```

  `content` contains array of records from Bulk API.
* **Change**

    ```json
    {
      "type": "change",
      "name": "Account",
      "content": { }
    }
    ```

  `content` contains CDC event data.
* **Event**

    ```json
    {
      "type": "event",
      "name": "/event/PreApproval_Query__e",
      "content": { }
    }
    ```

  `content` contains Platform Event data.
* **Kafka message**

    ```json
    {
      "type": "kafka",
      "name": "create_PreApproval_Result__e",
      "content": { },
      "commit": function() {}
    }
    ```

  `content` contains Kafka message data, and `commit` contains a callback function to explicitly commit receipt of each individual message for the consumer group.


Requirements
------------

* [Node.js](https://nodejs.org/) 8.9 with npm 5
* [redis](https://redis.io) 
  * optional; not required if using `READ_MODE=records`

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

Deploy
------

```bash
heroku create
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-apt
heroku buildpacks:add heroku/nodejs

heroku config:set \
  SALESFORCE_USERNAME=mmm@mmm.mmm \
  SALESFORCE_PASSWORD=nnnnnttttt \
  VERBOSE=true \
  PLUGIN_NAMES=console-output,kafka-output \
  OBSERVE_SALESFORCE_TOPIC_NAME=/data/ChangeEvents \
  SELECT_SOBJECTS=Account \
  READ_MODE=changes

# To use `READ_MODE=changes` or `all`
heroku addons:create heroku-redis:premium-0

# To use `PLUGIN_NAMES=kafka-output`
heroku addons:create heroku-kafka:basic-0

git push heroku master
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

### Output CDC messages to console

Sample command:

```bash
READ_MODE=changes \
OBSERVE_SALESFORCE_TOPIC_NAME=/data/ChangeEvents \
node lib/exec
```

🔁 *This command runs continuously, listening for change events.*

### Output Platform Events to console

Sample command:

```bash
READ_MODE=changes \
OBSERVE_SALESFORCE_TOPIC_NAME=/event/PreApproval_Query__e \
node lib/exec
```

🔁 *This command runs continuously, listening for the Platform Event.*

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
READ_MODE=records \
PLUGIN_NAMES=console-output,parquet-output \
SELECT_SOBJECTS=Product2,Pricebook2 \
node lib/exec
```

🛑 *This command exits after all parquet files are written.*

Set `PLUGIN_NAMES=parquet-output` to activate the plugin.

The parquet files will be written locally to the current working directory. Those files also **upload to S3 if the `AWS_*` & `BUCKET_NAME` env vars are set**.

The parquet plugin does not use change events, because they cannot be updated in-place. Unless the change stream is needed by a different plugin, configure the app to exit upon completion by setting `READ_MODE=records`.

### Output to Kafka

To enable streaming changes to Kafka, attach the [Heroku Kafka add-on](https://elements.heroku.com/addons/heroku-kafka). This will set the following config vars on the app:

```
KAFKA_PREFIX=vvvvv
KAFKA_URL=wwwww
KAFKA_TRUSTED_CERT=xxxxx
KAFKA_CLIENT_CERT=yyyyy
KAFKA_CLIENT_CERT_KEY=zzzzz
```

The `KAFKA_*_CERT` values must be written to eponymous files in `tmp/env/`. For Heroku deployment, this is automated by the [`.profile` script](.profile).

Additionally, the topic to push change messages to is `salesforce-data-connector` by default, or set your on custom topic name with:

```
PRODUCE_KAFKA_TOPIC_NAME=aaaaa
```

Before attempting to output to Kafka, create this topic in Heroku Kafka:

```bash
# The CLI plugin must be installed before first use.
heroku plugins:install heroku-kafka

# Create the topic.
heroku kafka:topics:create salesforce-data-connector --partitions 5
heroku kafka:consumer-groups:create salesforce-data-connector
```

Sample command:

```bash
READ_MODE=changes \
PLUGIN_NAMES=console-output,kafka-output \
OBSERVE_SALESFORCE_TOPIC_NAME=/data/ChangeEvents \
SELECT_SOBJECTS=Account \
node lib/exec
```

To see live message flow in another terminal, tail the Kafka topic:

```
heroku kafka:topics:tail salesforce-data-connector
```


Configuration
-------------

### Configure Authentication

Performed based on environment variables. Either of the following authentication methods may be used:

* Username + password
  * `SALESFORCE_USERNAME`
  * `SALESFORCE_PASSWORD` (password+securitytoken)
  * `SALESFORCE_LOGIN_URL` (optional; defaults to **login.salesforce.com**)
* Existing OAuth token
  * `SALESFORCE_INSTANCE_URL`
  * `SALESFORCE_ACCESS_TOKEN`
  * Retrieve from an sfdx scratch org with:

    ```bash
    sfdx force:org:create -s -f config/project-scratch-def.json -a SalesforceDataConnector
    sfdx force:org:display
    ```
* OAuth client
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
    * `changes` for streams (CDC [change data capture] or Platform Events)
    * `all` for both records & changes
  * example: `READ_MODE=records`
  * default value: `all`
* `OUTPUT_PATH`
  * location to write output files
  * example: `OUTPUT_PATH=~/salesforce-data-connector`
  * default value: `tmp/`
* `OBSERVE_SALESFORCE_TOPIC_NAME`
  * effective when `READ_MODE=changes` or `all`
  * the path part of a Streaming API URL
  * example: `OBSERVE_SALESFORCE_TOPIC_NAME=/event/PreApproval_Query__e`
  * default value: no Salesforce observer
* `CONSUME_KAFKA_TOPIC_NAME`
  * effective when `READ_MODE=changes` or `all`
  * example: `CONSUME_KAFKA_TOPIC_NAME=create_PreApproval_Result__e`
  * default value: unset, no Kafka consumer
* `REDIS_URL`
  * connection config to Redis datastore
  * required for *changes* stream, when `READ_MODE=all` or `changes`
  * example: `REDIS_URL=redis://localhost:6379`
  * default: unset, no Redis
* `REPLAY_ID`
  * force a specific replayId for CDC streaming
  * ensure to unset this after usage to prevent the stream from sticking
  * example: `REPLAY_ID=5678` (or `-2` for all possible events)
  * default: unset, receive all new events


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

#### `observe` function signature

```javascript
function friendlyName(
  schemaAndRecordsObservable,  // Rx.Observable (the data stream source)
  eventsObservable,            // Rx.Observable (the data stream source)
  env,                         // object containing current environment variables
  salesforceApi,               // the authenticated jsForce connection
  logger                       // (optional) Function: call with log messages, default no-op
) → Promise
```

When the observe function returns a Promise, the initializer will wait to proceed until resolved or exit the process upon reject.

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
