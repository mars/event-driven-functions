Notes
=====
*from a first time sfdx → package installer*

Linking the namespace in a Hub org
----------------------------------
In the Hub org, go to Setup → App Manager.

Edit “SalesforceDX Namespace Registry” and check the URLs. Their hostname must match the **my.salesforce.com** domain. Update all URLs (specifically the Callback URL) to the `XXXX.my.salesforce.com` domain name. Do not set it as the  `XXXXX.lightning.force.com` variant.

Example: `https://octo-hub.my.salesforce.com/environmenthub/soma-callback.apexp`

Push to Scratch org error
-------------------------

I ran into an issue when following the “Build and Release Your App with Managed Packages” docs: https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_build_man_pack.htm

…ends-up my problem was due to developing components in a scratch org without a namespace, and then registering a namespace in the hub org & adding it to `sfdx-project.json`. After that, some of the components would not push to a namespaced scratch org:

```
=== Push Errors
PROJECT PATH                                                                            ERROR
──────────────────────────────────────────────────────────────────────────────────────  ─────────────────────────────────────────────────────────────────────────────────────
force-app/main/default/eventDeliveries/Set_UUID_for_Account_1.delivery-meta.xml         In field: EventSubscription - no EventSubscription named Set_UUID_for_Account_1 found
force-app/main/default/eventSubscriptions/Set_UUID_for_Account_1.subscription-meta.xml  Event type Heroku_Function_Generate_UUID_Return__e does not exist.
```

These `eventDeliveries` & `eventSubscriptions` (from a Process Builder workflow) capture a reference which embed the namespace. Worked around this issue by manually prefixing the namespace `PlatformLabsFn__` to **EventDelivery/eventParameters/parameterValue** & **EventSubscription/eventType** XML element values.

It surprised me that `source:pull` & `source:push` code may embed namespaces and therefore not be portable. If a globally unique namespace gets embedded into the source code, how do we share/open source code that doesn’t require folks going through a search and replace operation?


Deploy metadata to Salesforce error
-----------------------------------

```
event-driven-functions [master] --- sfdx force:mdapi:deploy:report

Deployment finished in 8000ms

=== Result
Status:  Failed
jobid:  0Aff400000QN1vmCAD
Completed:  2018-04-18T21:37:25.000Z
Component errors:  5
Components deployed:  17
Components total:  22
Tests errors:  0
Tests completed:  0
Tests total:  0
Check only: false

=== Component Failures [5]
TYPE   FILE                                                                    NAME                                    PROBLEM
─────  ──────────────────────────────────────────────────────────────────────  ──────────────────────────────────────  ──────────────────────────────────────────────────────────────────────
Error  mdapi_output_dir/layouts/Account-Account %28Marketing%29 Layout.layout  Account-Account %28Marketing%29 Layout  In field: QuickAction - no QuickAction named FeedItem.RypplePost found
Error  mdapi_output_dir/layouts/Account-Account %28Sales%29 Layout.layout      Account-Account %28Sales%29 Layout      In field: QuickAction - no QuickAction named FeedItem.RypplePost found
Error  mdapi_output_dir/layouts/Account-Account %28Support%29 Layout.layout    Account-Account %28Support%29 Layout    In field: QuickAction - no QuickAction named FeedItem.RypplePost found
Error  mdapi_output_dir/layouts/Account-Account Layout.layout                  Account-Account Layout                  In field: QuickAction - no QuickAction named FeedItem.RypplePost found
Error  mdapi_output_dir/profiles/Admin.profile                                 Admin                                   Unknown user permission: CreateWorkBadgeDefinition
```

Worked around by deleted these problematic XML elements from the source code.

Flows from Process Builder
--------------------------

```
=== Component Failures [2]
TYPE   FILE                                                     NAME                         PROBLEM
─────  ───────────────────────────────────────────────────────  ───────────────────────────  ───────────────────────────────────────────────────────────────────────────
Error  mdapi_output_dir/flows/Generate_UUID_for_Account-1.flow  Generate_UUID_for_Account-1  The version of the flow you're updating is active and can't be overwritten.
Error  mdapi_output_dir/flows/Set_UUID_for_Account-1.flow       Set_UUID_for_Account-1       The version of the flow you're updating is active and can't be overwritten.
```

Delete the flows from the metadata source (the `mdapi_output_dir/flows/` directory & the `<types>…</types>` element named **flow** from `mdapi_output_dir/package.xml`), and then attempt another deploy.

Also delete these from the packaging org to remove them from the next version.

Manually Pruned Package Fails to Install
-----------------------------------------

```
19:05:22 --- event-driven-functions [salesforce-deployment ▲ ] --- sfdx force:package:install --id 04tf4000001ft4hAAA -u OctoDevEd
ERROR:  The package version is not fully available. If this is a recently created package version, please try again in a few minutes or contact the package publisher.
```

Eventually this proceeded, landing on a new error:

```
19:06:07 --- event-driven-functions [salesforce-deployment ▲ ] --- sfdx force:package:install --id 04tf4000001ft4hAAA -u OctoDevEd
PackageInstallRequest is currently InProgress. You can continue to query the status using
sfdx force:package:install:get -i 0Hf1I000000ED1eSAG -u mars@octo.com

19:08:32 --- event-driven-functions [salesforce-deployment ▲ ] --- sfdx force:package:install:get -i 0Hf1I000000ED1eSAG -u mars@octo.com
ERROR:  Encountered errors installing the package!,Installation errors: 
1) (Set_UUID_for_Account_1) Event type PlatformLabsFn__Heroku_Function_Generate_UUID_Return__e does not exist., Details: Set_UUID_for_Account_1: Event type PlatformLabsFn__Heroku_Function_Generate_UUID_Return__e does not exist.
2) (Set_UUID_for_Account_1) In field: EventSubscription - no EventSubscription named Set_UUID_for_Account_1 found, Details: Set_UUID_for_Account_1: In field: EventSubscription - no EventSubscription named Set_UUID_for_Account_1 found
ERROR:  Installation errors: 
1) (Set_UUID_for_Account_1) Event type PlatformLabsFn__Heroku_Function_Generate_UUID_Return__e does not exist., Details: Set_UUID_for_Account_1: Event type PlatformLabsFn__Heroku_Function_Generate_UUID_Return__e does not exist.
2) (Set_UUID_for_Account_1) In field: EventSubscription - no EventSubscription named Set_UUID_for_Account_1 found, Details: Set_UUID_for_Account_1: In field: EventSubscription - no EventSubscription named Set_UUID_for_Account_1 found.
```


Epilog
------

"If only this was as easy as npm" —a friend
