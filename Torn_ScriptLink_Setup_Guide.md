# Torn ScriptLink

**Version 1.0.2 | Torn script coordination, faction packages and sanitized list backups**

Torn ScriptLink keeps one list of the Torn userscripts you want across your PC and phone. Google Sheets is the default shared backend after you connect it. JSON is the portable, manual backup and package-sharing format.

The bundle contains an initial implementation, not a deployed service. No Google spreadsheet or live endpoint has been created for you. The core, backend and sync logic have automated tests. Live Google authorization, a real TornPDA installation and visual layout still require validation on your devices.

## The recommended structure

Use one **private, owner-controlled Google workbook** for the faction. Members access their lists through ScriptLink. Issue a different credential to each device, with that member's Torn ID assigned to both the PC and phone credentials.

Keep three concepts separate:

| Concept | Meaning | Example |
| --- | --- | --- |
| Faction catalog | Shared recommendations managed by the owner | Trading package, new-member package, war package |
| Member list | The scripts a member wants available across devices | Michael's scripts |
| Device status | A manually confirmed installation state on one device | Installed on PC, unknown on phone |

**Faction supported is a separate approval flag, not a category.** A supported trading script can appear in All, Faction supported, Mercantile and a Trader package. It is one record, shown through several views.

For the backend, use shared data tables instead of maintaining an independent database on every member tab. The implementation stores each member's versioned snapshot in `Profiles`, device access in `Devices`, recommendations in `Catalog`, and previous snapshots in `History`. Optional `M_2954173` style member tabs are editable views for category, tag and note changes. They are not the authoritative storage.

The snapshot representation puts a member's revision and data in one row write. JSON is split into fixed-size, safely prefixed cells. This avoids committing half a multi-table member update. A digest detects corrupt or incomplete snapshots. This is not a general database transaction system.

## What is and is not automated

Tampermonkey's documented APIs expose the current userscript's metadata and storage. They do not provide a general API for another userscript to enumerate, enable, disable or install all of your userscripts. A script running on one Torn page also cannot prove which other scripts are installed but disabled or matched to another page.

This build therefore supports these collection routes:

| Route | Supported behavior |
| --- | --- |
| TornPDA JSON export | Read locally, parse each userscript header, retain Torn entries and discard code and manager settings |
| Desktop userscript export | Extract the manager's ZIP yourself; select its `.user.js` files together |
| ScriptLink JSON | Preview and merge a sanitized script list |
| Manual entry | Enter a public source link and confirm the script is for Torn |

Unrecognized JSON, raw manager storage files, arbitrary web pages and ZIP contents are not guessed. Native scripts without a standard header, broad `*://*/*` matches, or unusual regular-expression include patterns may require manual entry. A userscript explicitly targeting Torn and another site is Torn-relevant and can be included; its non-Torn source code is never copied.

**This backs up the list and source links. It does not back up executable code, private edits, API keys or each script's settings.** If an upstream script disappears, the link alone cannot restore it. Keep private native-manager backups separately if you need that level of recovery. Do not distribute those raw backups without reviewing them: TornPDA's export model can contain both source code and a `customApiKey` field.

Opening Install invokes the source's ordinary installation workflow. You confirm the installation in the manager. ScriptLink does not silently install or execute downloaded code. Installation statuses are manual, dated observations, not live inventory detection. Update checks remain the native manager's job.

## Included features

- All, My scripts, Faction supported and Packages views.
- Mercantile, Aggressive, Crime, Entertainment and Management categories.
- Additional Training & Progression, Travel, Quality of Life, Utilities & Development, and Uncategorized categories.
- One primary category plus free-text tags for overlap, such as `trading, abroad, inventory`.
- Public source chain-link icon and optional installation link.
- Reference version, compatibility assessment, notes and manually recorded installed version.
- Per-device Unknown, Installed, Disabled, Missing and Incompatible states.
- Separate device credentials, owner-only catalog management and device revocation.
- Sanitized import preview; existing entries are preserved unless you choose to replace matching metadata.
- Shared-list synchronization after edits, on startup, and when returning to Torn after the refresh threshold. There is no periodic DOM polling.
- Local caching, three-way conflict detection, explicit conflict choices, server revisions, duplicate-request protection and previous server snapshots.
- JSON export of either your list or the visible category/package view; native TornPDA Save / share support where its file handler is available.
- Supplied debugger v1.0.4 embedded intact, with the requested bug and copy-log buttons in Settings.
- Supplied Donation UI Module v1.4 adapted to the Settings slot, preserving both support buttons and the animated coffee artwork.

## Why not one shared write token plus Google email?

A shared token proves only that someone knows the shared token. If the client supplies an email or member ID, any holder could claim another member's identity. It also makes revocation inconvenient and weakens attribution.

Apps Script web apps running as their owner generally cannot retrieve every external caller's Google email through `Session.getActiveUser().getEmail()`. `getEffectiveUser()` identifies the executing owner in that deployment. Browser sign-in does not automatically become a portable identity system for TornPDA's native HTTP requests.

The included approach uses a randomly generated device credential. Only its SHA-256 hash is kept in `Devices`; the server maps that hash to the assigned member and device. Requests cannot select a different member by supplying an ID. Each member may have up to ten devices. Assignment of a Torn ID is an owner action, not proof of Torn account ownership. No Torn API key is required.

If verified Google identity is required later, use a hosted sign-in/pairing page and validate Google ID tokens server-side. Bind accounts to Google's stable subject identifier, then issue device credentials. That is a separate authentication project, not a use of a shared write token or an email text field. It is not implemented here.

## Workbook privacy

Keep the master workbook restricted to its owner. The owner can see member lists and device labels. Members receive their own records and the shared catalog through the backend, not access to other members' lists.

Hidden tabs and protected ranges are not confidentiality controls. Sharing the entire workbook with faction members can expose all tabs or their contents. Do not store personal inventories in a workbook shared with the entire faction on the assumption that each member can see only one tab.

This first release has one catalog administrator, the workbook owner. Separate admin roles, public enrollment, Google OAuth pairing and a public catalog site are future additions.

## One-time Google setup

1. Create a blank Google Sheet and name it **Torn ScriptLink - Faction Hub**. Keep **General access: Restricted** and do not grant ordinary faction members workbook access.
2. In that sheet, open **Extensions > Apps Script**.
3. Replace the contents of `Code.gs` with **all** of `release/Code.gs` from this bundle. It includes the shared validation functions as well as the backend. Do not paste `src/backend.js` by itself.
4. In Apps Script's **Project Settings**, enable **Show "appsscript.json" manifest file in editor**. Open that file and replace its contents with `release/appsscript.json`.
5. Name the Apps Script project **Torn ScriptLink Bridge**, then save.
6. Select `initializeScriptLink` in the function selector and click **Run**. Authorize your own script when Google asks. It uses spreadsheet access, the spreadsheet UI, and your Google email for owner-only administration. It does not send mail or call Torn's API.
7. Return to the sheet and reload it. The **ScriptLink** menu should appear. The workbook should have `Profiles`, `History`, `Devices` and `Catalog` sheets. Leave their headers unchanged. Re-running initialization preserves existing data.
8. In Apps Script, choose **Deploy > New deployment**. Select **Web app** as the deployment type.
9. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. The public endpoint accepts requests, but valid device credentials are required to read or write data. If your organization prohibits anonymous web apps, this deployment model is unavailable under that account; use an account where it is permitted or a different authenticated backend.
10. Copy the deployed URL ending in `/exec`. Do not use the editor URL, a `/dev` URL, or a Google redirect URL.
11. In the spreadsheet's **ScriptLink** menu, select **Issue device access**. Enter the member's Torn ID, a device label such as `Michael PC`, and Desktop or TornPDA. Click **Generate credential**.
12. Copy the generated credential and keep it private. It is displayed once. It begins with `slk_`; it is not a Torn API key. Give it only to the person who will use that device. Do not paste it into a shared sheet cell, a manifest or debug report.
13. Issue another credential for the phone using the **same member Torn ID** and a different device label. Use different member IDs for different faction members.

When changing backend code later, save it and update the deployment to a new version. Merely changing the editor text does not update a versioned web-app deployment. Editing the existing deployment preserves its `/exec` URL.

## Install and connect on PC

1. Install `release/Torn ScriptLink.user.js` through Tampermonkey. Alternatively, create a new script in Tampermonkey, replace its contents with that file and save.
2. The `.user.js.txt` copy is identical and available for downloading as text. Remove the final `.txt` to install it as a file, or paste its contents into the editor.
3. Open a Torn page, enable ScriptLink if necessary, and select **🔗 ScriptLink > Settings**.
4. Paste your `/exec` URL into **Apps Script deployment URL**.
5. Paste this PC's credential into **Device credential**. Leave automatic sync enabled for normal use.
6. Select **Save connection and sync**. Confirm the status reports that it synced.
7. Export your Torn userscripts from Tampermonkey. If the manager produces a ZIP, extract it first and use ScriptLink's **Import** to select the `.user.js` files. Do not select manager settings/storage JSON files.
8. Review the sanitized preview and skipped count, then select **Import these entries**. Categorize any Uncategorized entries. Click **Sync now** if you want an immediate save instead of waiting for the short write debounce.

## Install and connect in TornPDA

1. Open TornPDA's userscript manager. Import the `.user.js` file or paste its contents into a new userscript; enable it for Torn.
2. Open a Torn page and select **🔗 ScriptLink > Settings**.
3. Enter the same `/exec` URL and the **phone's own credential**, issued under the same member ID as the PC.
4. Select **Save connection and sync**. Your shared list should appear. A new phone's installation statuses are Unknown until you confirm them.
5. To collect scripts already on that phone, export them from TornPDA's own manager as JSON. Import that JSON through **ScriptLink > Import**, inspect the preview, and confirm the list import. Code and manager settings are discarded locally.
6. For each wanted script missing from the phone, open its chain-link source page or Install link, follow TornPDA's installation prompt, then mark its status in ScriptLink.

The code prefers native `PDA_storage` when available. On older PDA versions with only a localStorage-backed GM compatibility layer, the connection credential stays in memory and must be re-entered after a reload. Metadata lists can still be cached. The implementation detects capabilities instead of assuming a particular release has them.

Apps Script returns its JSON through a Google redirect. ScriptLink permits both required Google domains. For PDA POST responses that expose the redirect, it explicitly fetches the one-time response URL with GET and does not forward the credential body. Unrecognized redirect hosts are rejected.

## Faction packages

1. Build a list in ScriptLink, then choose **Backup my list** or **Export this view** and download the sanitized JSON.
2. In the private workbook, choose **ScriptLink > Import faction catalog manifest** and paste that JSON.
3. Enter package names, separated by commas, such as `New Member, Trader`. Check **Mark these new entries faction supported** only if you have actually reviewed and chosen to support them. Import adds new rows and preserves existing catalog entries.
4. Review `Catalog`. Change Category and Compatibility using their dropdowns, and adjust the Faction supported checkbox. Keep Packages as a comma-separated list. Use the review date and notes to describe the version you assessed.
5. Choose **ScriptLink > Validate faction catalog**. Check that every public source link is correct and that names/namespaces are not duplicated.
6. Members sync, open **Packages**, select the package, and choose **Add package to my list**. They still confirm each native-manager installation.

You can also distribute the sanitized JSON directly, without a shared backend. Recipients import it into ScriptLink. The JSON carries no device credentials and does not confer trusted faction-supported status: only the authenticated catalog supplies that flag.

## Member tabs and category dropdowns

The owner can use **ScriptLink > Open / refresh member tab** and enter a member ID. This creates a view named `M_<ID>` with the member's scripts and a Category dropdown.

Edit Category, Tags and Notes, then choose **ScriptLink > Save member category edits**. The menu writes to the authoritative profile and advances its revision. If a device saved in the meantime, it rejects the stale view so you can preserve your edits, refresh and reapply them. Changing names, source URLs or row IDs in these views is not a supported editing route. Use the member's ScriptLink editor for those changes.

Member tabs belong to the private administrator workbook. They are not private per-member sharing spaces. Members normally categorize their own lists inside ScriptLink.

## Conflict and offline behavior

- The client compares its previous synced baseline, local edits and the server's current records. Independent changes merge.
- Concurrent changes to the same script or a deletion versus an edit produce a visible choice. Both alternatives are kept until you choose.
- The backend locks writes and checks the expected revision. A stale client cannot overwrite the latest snapshot merely by posting an old list.
- Each write has a request ID. Repeating the same request does not create another revision; reusing that ID with different data is rejected.
- Each credential can update only its own device's status. The shared script list is intentionally shared by all devices assigned to that member.
- If the network fails, local changes remain cached. Later sync reconciles them. Requests have deadlines and a cooldown after failures; there is no endless immediate retry loop.
- Removing a list entry removes its associated device statuses when the change syncs. It does not uninstall anything. An explicit deletion is treated as a change during merging.
- Browser Web Locks serialize local edits across tabs when supported. On older WebViews without that capability, use one editing tab at a time. Server revisions still guard cloud writes, but local storage itself has no universal atomic compare-and-swap API.

The current design supports 300 personal entries, 300 catalog entries, up to ten devices per member and bounded profile size. Very long notes or URLs can reach the profile-size cap before the entry-count cap. Apps Script quotas still apply. The server's per-device cache-based request limit is a load-control aid, not protection against an internet-scale denial-of-service attack.

## Backup and credential handling

ScriptLink exports a fresh allowlisted manifest. It never dumps browser storage or passes a native-manager export through to other people. The allowlist contains only identity, name, namespace, public source/installation URLs, reference version, category, tags, compatibility and notes.

Code, stored script options, API-key fields, cookies, credentials, Google email addresses, device IDs and installation states are not exported as fields. Public URLs are restricted to the supported source hosts. Query parameters and fragments are stripped, except for validated Torn forum thread routing. Credential-bearing paths are rejected. Free text is scrubbed for known secret patterns, the active ScriptLink credential and standalone 16-character alphanumeric values.

This is deliberately conservative and can redact an innocent 16-character word or block a legitimate unusual source path. Review the preview and correct affected source links. No regular-expression sanitizer can guarantee recognition of every deliberately disguised, encoded or arbitrary secret placed into free-form prose. Keep credentials out of names and notes, and review a package before distributing it.

The userscript never requests a Torn API key, because the features need no Torn API endpoint. Source modules and your Torn API documents were reviewed; there is no dependency on a questionable endpoint or schema assumption.

Use **Backup my list** for a manual JSON file. On TornPDA, **Save / share JSON in TornPDA** invokes the native file-share sheet where available. The ordinary Download and Copy JSON options remain available. JSON recovery restores the list, then you reconnect using a newly issued credential if necessary and reconfirm installation statuses.

Previous server snapshots accumulate in `History`. The owner can prune them using the explicit menu action, retaining the last 20 per member. There is no one-click rollback UI in this release. Do not edit `Profiles` directly during normal use. Keep an administrator backup of the workbook as well.

## Verify before faction rollout

1. Connect your PC and phone under the same member ID, with different device credentials.
2. Add one real Torn script on PC, sync, and confirm it appears on the phone.
3. Mark it Installed on PC. Confirm that the phone does not inherit Installed automatically.
4. Change its category on the phone, sync both, and confirm the PC receives it.
5. Make different edits to the same note while one device is offline. Sync both and confirm a conflict appears instead of silently discarding an edit.
6. Export JSON and inspect it. It should have `format: torn-scriptlink`, `scope: torn`, a script list and no credential or script source fields.
7. Create a test member with a different ID. Confirm that it sees the faction catalog but not your private list.
8. Revoke that test device through the owner menu and confirm further sync is denied.
9. Check the panel on a narrow phone screen and confirm the native JSON file-share workflow saves a usable file.

If these checks fail, open Settings, use the bug button and copy the redacted logs. Record the platform/version and visible error message. Do not include device credentials or raw TornPDA exports containing private settings in a support report.

## Tests and source layout

`src/core.js` supplies shared validation/import/merge logic; `src/client.js` supplies the userscript UI and transport; `src/backend.js` supplies Apps Script storage and administration. `build.py` embeds the two supplied modules and produces `release/`. Original modules remain in `vendor/` for attribution and reproducible builds. Install only the combined release userscript.

Run the dependency-free checks with Node:

```text
node tests/core.test.cjs
node tests/backend.test.cjs
node tests/sync.test.cjs
node tests/pda-transport.test.cjs
```

The optional `tests/ui.test.cjs` uses Playwright and Chromium against an isolated local test fixture. It does not log into Torn. It was prepared but could not run in the build environment because a browser binary was unavailable and its download failed. Automated backend tests emulate Apps Script services; they are not a live Google deployment test.

The supplied debugger is embedded unchanged. `release/MODULE_INTEGRATION.json` records its hash and the specific donation-module adaptations. Code uses BSD-3-Clause. This license applies to ScriptLink, not to third-party scripts listed in a manifest.

## Primary references

- [Tampermonkey GM_info](https://www.tampermonkey.net/documentation.php?q=GM_info)
- [Tampermonkey per-script storage](https://www.tampermonkey.net/documentation.php?q=GM_values)
- [TornPDA export model](https://github.com/Manuito83/torn-pda/blob/master/lib/models/userscript_model.dart)
- [TornPDA userscript manager import/export](https://github.com/Manuito83/torn-pda/blob/master/lib/pages/settings/userscripts_page.dart)
- [TornPDA GM compatibility](https://github.com/Manuito83/torn-pda/blob/master/docs/userscripts/gm-compatibility.md)
- [TornPDA native storage](https://github.com/Manuito83/torn-pda/blob/master/userscripts/TornPDA_Storage.md)
- [TornPDA HTTP handlers](https://github.com/Manuito83/torn-pda/blob/master/lib/utils/webview/webview_handlers.dart)
- [TornPDA native file sharing](https://github.com/Manuito83/torn-pda/blob/master/docs/webview/share-file-handler.md)
- [Google Apps Script Session identity limitations](https://developers.google.com/apps-script/reference/base/session)
- [Google Apps Script web-app deployment](https://developers.google.com/apps-script/guides/web)
- [Google ContentService redirects](https://developers.google.com/apps-script/guides/content)
- [Google Apps Script locks](https://developers.google.com/apps-script/reference/lock/lock-service)
- [Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
- [Google's protection/hiding limitations](https://support.google.com/docs/answer/1218656)
- [Dart HTTP redirect behavior](https://api.dart.dev/dart-io/HttpClientRequest/followRedirects.html)

References inspected during preparation on October 18, 2026. TornPDA repository behavior is capability-detected because the repository's current code may be ahead of an installed app release.
