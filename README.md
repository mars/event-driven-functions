# Salesforce Change Data Capture Connector

Receive data from a Salesforce org in a durable, continuous flow.

💻👩‍🔬 *This project is a exploration into solving common customer use-cases with Salesforce's newest streaming technology, Change Data Capture [CDC].*

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
