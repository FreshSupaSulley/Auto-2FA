# Firefox
This is the code for the Firefox edition of Duochrome. There are slight differences in the code but the functionality always remains the same.

## Developer notes
Porting from Chrome to Firefox

- Give the manifest a temporary id to test storage API:
> `"browser_specific_settings": {"gecko": {"id": "extensionname@example.org","strict_min_version": "88.0"}},`
- Change all chrome references in popup.js to browser (don’t forget chrome.tabs). Seems like it is required.
- browser.action.setBadgeText and shit is different
> Replace `browser.action` with `browser.browserAction`
- HTML CSS tag needs this line: font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
- Add `font-size: 14px;` to h4 AND in & th { of settings. Better yet just replace h4s in chrome so you don't have to do this
- Line 294 of firefox code (as of rn): > * { width: -moz-available; }
- Body must inherit the width from html tag
- Must remove “experimental” JS (bullshit things, like having using async before a method that’s not nested)
> Wtf does this mean
- Remove temp ID when submitting

Submit by grabbing all files and compressing them. You can’t make a ZIP of the encompassing folder. I love Firefox.
