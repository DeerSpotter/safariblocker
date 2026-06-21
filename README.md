# SafariBlocker

Rootless iOS tweak package source for `com.p2kdev.safariblocker`.

This repository was populated from the extracted `com.p2kdev.safariblocker_v1.3.1_iphoneos-arm64.deb` package.

## Layout

- `package/DEBIAN/control` contains the package metadata.
- `package/var/jb/...` contains the text based rootless filesystem payload.
- `assets/hex/` contains the extracted binary payload files stored as hex chunks so the package can be rebuilt from repository contents.
- `scripts/rebuild-binaries.sh` restores the binary payload files into `package/` before building.
- `.github/workflows/build-deb.yml` builds the `.deb` automatically.

## Build locally

```bash
scripts/rebuild-binaries.sh package
mkdir -p dist
dpkg-deb --root-owner-group --build package dist/com.p2kdev.safariblocker_v1.3.1_iphoneos-arm64.deb
sha256sum dist/com.p2kdev.safariblocker_v1.3.1_iphoneos-arm64.deb
```

## GitHub Actions

The workflow builds on pushes, pull requests, tags, and manual runs. It uploads the built `.deb` and `SHA256SUMS` as workflow artifacts. When pushed as a tag such as `v1.3.1`, it also attaches the built `.deb` to the GitHub release.
