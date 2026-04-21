# G-unlock
G-unlock is an open source userscript and browser extension that unlocks hidden Google search results.

The extension scans hidden search results that were censored by Google due to complaints.  
The tool scans those complaints and extracts the links, returning them back to the search results, all in a matter of seconds.

[Project repository](https://github.com/mr-pr0/G-unlock).

## Install in Chrome/Opera/Brave/Chromium
~~[Chrome Web Store]~~

The extension was taken down by Google from the Chrome store. Please use manual install.

## Install in Firefox
~~[Firefox Add-Ons]~~

Use the userscript install link below for the simplest Firefox setup, or install a packaged build from [G-unlock releases](https://github.com/mr-pr0/G-unlock/releases) when one is available.

## Install as userscript
- Install in Violentmonkey: [G-unlock userscript](https://raw.githubusercontent.com/mr-pr0/G-unlock/main/g-unlock.user.js)
- Direct install/update URL: `https://raw.githubusercontent.com/mr-pr0/G-unlock/main/g-unlock.user.js`
- If Violentmonkey does not open automatically, use `Install from URL` in Violentmonkey and paste the direct install/update URL.
- Allow access to defined URLs if userscript manager asks for permission.

## Validation
- GitHub Actions runs userscript validation on every push and pull request.
- Current CI checks:
  - `node --check g-unlock.user.js`
  - smoke tests from `tests/userscript-smoke.test.mjs`

## Manual install in Chrome
- Download the latest zip release from [G-unlock releases](https://github.com/mr-pr0/G-unlock/releases).
- Extract the downloaded zip to a permanent path (Chrome will need to load it every time it restarts).
- Open Chrome and go to chrome://extensions/ and check the box for Developer mode in the top right.
- Click the Load unpacked extension button and select the unzipped folder for your extension to install it.

For other Chromium-compatible browsers, install the latest release from [G-unlock releases](https://github.com/mr-pr0/G-unlock/releases) and confirm it as a known source if your browser asks.

After installing the extension, every time you Google a keyword, it will transparently scan the hidden URLs and injects them at the bottom of the page.

Maintained at [mr-pr0/G-unlock](https://github.com/mr-pr0/G-unlock).
