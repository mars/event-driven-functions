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

**The solution is to avoid using a namespace**, producing an unmanaged package. Eventually these namespace issues should be resolved by Salesforce to make packaging work regardless of namespacing.


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

Delete the flows that are already deployed from a previous version from the metadata source (the `mdapi_output_dir/flows/` directory & the `<types>…</types>` element named **flow** from `mdapi_output_dir/package.xml`), and then attempt another deploy.

Also delete these from the packaging org to remove them from the next version.

What is the best way to revise Process Builder flows through packaging lifecycle?
