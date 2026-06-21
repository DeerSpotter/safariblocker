# SafariBlocker

Rootless iOS tweak package source for `com.p2kdev.safariblocker`.

SafariBlocker is a Safari focused jailbreak tweak for controlling unwanted new tabs, popups, domains, and specific URLs. It provides a PreferenceLoader settings panel where users can manage allow and block lists directly on device, add entries manually with a plus button popup, and back up or restore all lists with one JSON file.

## Current package

- Package: `com.p2kdev.safariblocker`
- Name: `SafariBlocker`
- Version: `1.3.4`
- Architecture: `iphoneos-arm64`
- Minimum firmware: iOS 15.0
- Install type: rootless jailbreak package
- Dependencies: `mobilesubstrate`, `preferenceloader`, `firmware (>= 15.0)`

## Main capabilities

### Safari blocking controls

SafariBlocker is designed to block unwanted Safari tab behavior with configurable rules. The tweak exposes separate rule lists for:

- **Whitelisted domains**: domains that should be allowed even when blocking rules are active.
- **Blocked domains**: domains that should be blocked.
- **Blocked URLs**: specific URLs that should be blocked.

The tweak also includes a **Show Blocked Message** setting. When enabled, blocked navigation can show a blocked message instead of silently closing or preventing the action.

### Manual plus button entry

Each list page supports manual entry from the Settings UI:

1. Open **Settings**.
2. Open **SafariBlocker**.
3. Tap one of these pages:
   - **Specify Whitelisted Domains...**
   - **Specify Blocked Domains...**
   - **Specify Blocked URLs...**
4. Press the **+** button in the navigation bar.
5. Enter a domain or URL in the popup.
6. Tap **Submit** to save, or **Cancel** to close without saving.

The Settings controller trims blank space, prevents duplicate entries, saves the entry to the correct list, posts the tweak settings changed notification, and reloads the page.

### Backup and restore

The Settings menu includes a **Backup and Restore** section with:

- **Export List Backup**
- **Import List Backup**

Export creates one JSON backup file containing all three managed lists:

```json
{
  "allowedDomains": "example.com;trusted-site.com",
  "blockedDomains": "bad-domain.com;ads.example",
  "blockedURLs": "https://example.com/bad-page"
}
```

The export action opens the iOS share sheet so the backup can be saved to Files, sent elsewhere, or stored for later.

Import opens the iOS document picker, reads a selected SafariBlocker JSON backup file, restores the three list values, posts the settings changed notification, reloads the Settings UI, and displays an import summary.

## Settings menu overview

The PreferenceLoader panel currently includes:

- **Show Blocked Message**
- **Whitelisted Domains**
  - **Specify Whitelisted Domains...**
- **Blocked Domains**
  - **Specify Blocked Domains...**
- **Blocked URLs**
  - **Specify Blocked URLs...**
- **Backup and Restore**
  - **Export List Backup**
  - **Import List Backup**
- **Support**
  - **Follow me on Twitter @p2kdev**

## Repository layout

```text
.github/workflows/build-deb.yml
assets/hex/
package/
prefs/
scripts/rebuild-binaries.sh
```

### Important paths

- `package/DEBIAN/control`
  - Debian package metadata.
- `package/var/jb/Library/MobileSubstrate/DynamicLibraries/`
  - Rootless MobileSubstrate tweak payload.
- `package/var/jb/Library/PreferenceBundles/SafariBlocker.bundle/`
  - Preference bundle resources installed to the device.
- `package/var/jb/Library/PreferenceLoader/Preferences/SafariBlocker.plist`
  - PreferenceLoader entry that exposes SafariBlocker in Settings.
- `prefs/`
  - Rebuilt PreferenceLoader bundle source for the enhanced Settings UI.
- `assets/hex/`
  - Extracted binary payload files stored as hex chunks so the package can be rebuilt from repository contents.
- `scripts/rebuild-binaries.sh`
  - Restores binary payload files into `package/` before packaging.

## Building with GitHub Actions

The repository includes a workflow at:

```text
.github/workflows/build-deb.yml
```

The workflow:

1. Checks out the repository.
2. Installs Theos and iOS SDKs.
3. Adds a minimal `Preferences.framework` linker stub needed for the PreferenceLoader bundle build.
4. Restores extracted binary payload files from `assets/hex/`.
5. Builds the enhanced Settings preference bundle from `prefs/`.
6. Copies the rebuilt Settings bundle binary into the package payload.
7. Builds the rootless `.deb` package with `dpkg-deb`.
8. Uploads the `.deb` and `SHA256SUMS` as workflow artifacts.
9. Attaches release assets automatically when building from a `v*` tag.

To build from GitHub:

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Select **Build SafariBlocker deb**.
4. Click **Run workflow**.
5. Download the `safariblocker-deb` artifact when the run completes.

The expected package name follows the version in `package/DEBIAN/control`, for example:

```text
com.p2kdev.safariblocker_v1.3.4_iphoneos-arm64.deb
```

## Building locally

A local build requires a Debian packaging toolchain and, for rebuilding the Settings bundle, a working Theos environment with an iPhoneOS SDK.

Restore binary payload files and build the package:

```bash
scripts/rebuild-binaries.sh package
mkdir -p dist
PACKAGE_VERSION="$(awk '/^Version:/ { print $2 }' package/DEBIAN/control)"
PACKAGE_ARCH="$(awk '/^Architecture:/ { print $2 }' package/DEBIAN/control)"
dpkg-deb --root-owner-group --build package "dist/com.p2kdev.safariblocker_v${PACKAGE_VERSION}_${PACKAGE_ARCH}.deb"
sha256sum dist/*.deb
```

For a full local build that also rebuilds the enhanced Settings bundle, use Theos from `prefs/` before packaging:

```bash
cd prefs
make clean package FINALPACKAGE=1
cd ..
```

Then copy the staged `SafariBlocker.bundle/SafariBlocker` binary into:

```text
package/var/jb/Library/PreferenceBundles/SafariBlocker.bundle/SafariBlocker
```

## Notes

This repository was originally populated from the extracted `com.p2kdev.safariblocker_v1.3.1_iphoneos-arm64.deb` package. The current repository keeps the original rootless package payload structure and adds a rebuilt Settings bundle source under `prefs/` for the enhanced list management, plus-popup entry, and backup/restore features.

## Credits

Original package metadata credits:

- Maintainer: `P2KDev <p2kdev@gmail.com>`
- Author: `P2KDev <p2kdev@gmail.com>`
