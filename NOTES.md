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