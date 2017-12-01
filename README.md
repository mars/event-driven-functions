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

Each plugin's **observe function** receives an [Rx.Observable](http://reactivex.io/rxjs/manual/overview.html#observable) pushing schema, records, and change messages. RxJS provides a large palette of [reactive operators](http://reactivex.io/rxjs/manual/overview.html#operators) to regulate, transform, and consume the stream.

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
  observable,               // Rx.Observable (the data stream source)
  logger                    // (optional) Function: call with log messages, default no-op
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

* `VERBOSE=true` to output progress details to stderr

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
