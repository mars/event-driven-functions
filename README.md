# Event-driven Functions

Invoke javascript functions in a [Heroku app](https://www.heroku.com/platform) via [Salesforce Platform Events](https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/platform_events_define_ui.htm).

💻👩‍🔬 *This project is a exploration into an emerging pattern for extending the compute capabilities of Salesforce.*

Design
------

The high-level flow is:

> Platform Event → **this app** → Platform Event

This flow maps specific **Invoke events** (topics) to function calls that return values by producing **Return events**.

> `Heroku_Function_*_Invoke__e` → Node.js function call → `Heroku_Function_*_Return__e`

These functions are composed in a Heroku app. Each function's arguments, return values, and their types must be encoded in the Invoke and Return events' fields.

Architecture
------------

🔗 Forked from [salesforce-data-connector](https://github.com/heroku/salesforce-data-connector).

This event-driven functions app is an [observer plugin](https://github.com/heroku/event-driven-functions/blob/master/lib/plugin-invoke-functions.js) to **salesforce-data-connector**, along with an `sfdx` project providing the Salesforce customizations.

Example: UUID generator for any Salesforce Object
-------------------------------------------------

#### Invoke event

Salesforce Platform Event `Heroku_Function_Generate_UUID_Invoke__e`

```json
{
  "Context_Id": "xxxxx"
}
```

`Context_Id` should be passed-through unchanged from Invoke to Return. It provides an identifier to associate the return value with the original invocation. It is not passed in the function invocation.

This is a minimal Invoke event payload with no function arguments. The event may contain as many fields as are need for the target function's arguments.

#### Return event

Salesforce Platform Event `Heroku_Function_Generate_UUID_Return__e`

```json
{
  "Context_Id": "xxxxx",
  "Value": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx"
}
```

`Context_Id` should be passed-through unchanged from Invoke to Return.

`Value` is a minimal Return event payload. In this example it contains the string UUID.

Requirements
------------

* [Node.js](https://nodejs.org/) 8.11 with npm 5
* [redis](https://redis.io)

Usage
-----

### First time setup

```bash
git clone https://github.com/heroku/event-driven-functions.git
cd event-driven-functions/
npm install
cp .env.sample .env
```

### Salesforce setup

Next, we'll use [`sfdx`](https://developer.salesforce.com/docs/atlas.en-us.212.0.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm) to deploy the Salesforce customizations. If you don't yet have access to a Dev Hub org, or this is your first time using `sfdx`, then see [**Setup Salesforce DX** in Trailhead](https://trailhead.salesforce.com/trails/sfdx_get_started/modules/sfdx_app_dev/units/sfdx_app_dev_setup_dx).

Deploy the included `force-app` code to a scratch org:

```bash
sfdx force:org:create -s -f config/project-scratch-def.json -a EventDrivenFunctions

sfdx force:source:push
# …if errors are reported for some components, push again.

sfdx force:user:permset:assign -n Heroku_Function_Generate_UUID
```

View the scratch org description:

```bash
sfdx force:user:display
```

Then, update `.env` file with the **Instance Url** & **Access Token** values from the scratch org description:

```
SALESFORCE_INSTANCE_URL=xxxxx
SALESFORCE_ACCESS_TOKEN=yyyyy
```

⚠️ *Scratch orgs and their authorizations expire, so this setup may need to be repeated whenever beginning local development work. View the current status of the orgs with `sfdx force:org:list`.*

### Run locally

```bash
READ_MODE=changes \
PLUGIN_NAMES=invoke-functions \
OBSERVE_SALESFORCE_TOPIC_NAMES=/event/Heroku_Function_Generate_UUID_Invoke__e \
node lib/exec
```

🔁 *This command runs continuously, listening for the Platform Event.*

### Developing more functions

For a given function, three identifiers are used.

* **Function Name**
  * example `Generate_UUID`
  * used for the JavaScript module file & its `functions` export
* **Invoke Event Name**
  * example `Heroku_Function_Generate_UUID_Invoke__e`
  * used for the Platform Event that runs the function
* **Return Event Name**
  * example `Heroku_Function_Generate_UUID_Return__e`
  * used for the Platform Event that receives the function's result

Note: the **Function Name** must be embedded exactly in both **Event Names**.

To implement a new function:

1. create the new Platform Events using `sfdx` workflow
   * develop in a scratch org and pull changes into this repo
   * define each **Invoke & Return Event** and its schema (fields & their types)
   * define a new **Permission Set** for access or add to an existing Set
1. create the function as a default export in `lib/functions/`
   * use **Function Name** for the module file & its `functions` export
   * the function receives the Invoke event's payload and must honor the Return event's schema
   * see: [example `Generate_UUID.js`](lib/functions/Generate_UUID.js) & [the export](lib/functions/index.js)
1. include the new Invoke Event Name in `OBSERVE_SALESFORCE_TOPIC_NAMES` env var
   * example: `OBSERVE_SALESFORCE_TOPIC_NAMES=/event/Heroku_Function_Generate_UUID_Invoke__e,/event/Heroku_Function_Generate_Haiku_Invoke__e`

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
  * Retrieve from an [sfdx](https://developer.salesforce.com/docs/atlas.en-us.212.0.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm) scratch org with:

    ```bash
    sfdx force:org:create -s -f config/project-scratch-def.json -a EventDrivenFunctions
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
  * example: `OUTPUT_PATH=~/event-driven-functions`
  * default value: `tmp/`
* `OBSERVE_SALESFORCE_TOPIC_NAMES`
  * effective when `READ_MODE=changes` or `all`
  * the path part of a Streaming API URL
  * a comma-delimited list
  * example: `OBSERVE_SALESFORCE_TOPIC_NAMES=/event/PreApproval_Query__e`
  * default value: no Salesforce observer
* `CONSUME_KAFKA_TOPIC_NAMES`
  * effective when `READ_MODE=changes` or `all`
  * a comma-delimited list
  * example: `CONSUME_KAFKA_TOPIC_NAMES=create_PreApproval_Result__e`
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


Deployment
----------

### Deploy Salesforce components

🚧 *Salesforce packaging & deployment is not yet complete.*

Follow [Build and Release Your App with Managed Packages](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_build_man_pack.htm) to prepare a packaging org and [link its namespace with your Hub org](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_reg_namespace.htm).

Set the established `"namespace"` in [sfdx-project.json](sfdx-project.json), and then [provision & push to a fresh scratch org](#user-content-salesforce-setup).

Now, pull the Salesforce customizations back out of the scratch org in the Metadata API format:

```bash
sfdx force:source:convert --outputdir mdapi_output_dir --packagename Event_Driven_Functions_Generate_UUID
```

Login to the packaging org and create the Beta package:

```bash
sfdx force:org:list
sfdx force:auth:web:login -u PkgFunctions

sfdx force:mdapi:deploy --deploydir mdapi_output_dir --targetusername PkgFunctions

# Find the package ID in the URL of the packaging org:
#   Setup → Package Manager → View/Edit the Package
sfdx force:package1:version:create --packageid 033f4000000E0FJ --name r00000 -u PkgFunctions

sfdx force:package1:version:list -u PkgFunctions
```

Install the beta package into another org by its `METADATAPACKAGEVERSIONID`:

```bash
sfdx force:package:install --id 04tf4000001ft0KAAQ -u OctoDevEd
```


### Deploy Heroku app

```bash
heroku create

heroku config:set \
  SALESFORCE_USERNAME=mmm@mmm.mmm \
  SALESFORCE_PASSWORD=nnnnnttttt \
  VERBOSE=true \
  PLUGIN_NAMES=invoke-functions \
  OBSERVE_SALESFORCE_TOPIC_NAMES=/event/Heroku_Function_Generate_UUID_Invoke__e \
  READ_MODE=changes

heroku addons:create heroku-redis:premium-0
heroku addons:create heroku-kafka:basic-0

git push heroku master
```
