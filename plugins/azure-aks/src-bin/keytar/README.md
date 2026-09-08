# Packaged keytar runtime

This directory provides the external `keytar` module used by `azure-api-bundle.js` on macOS. The loader selects a native binary using `process.platform` and `process.arch`, allowing one plugin package to support Intel and Apple Silicon Macs.

The native binaries are from the keytar 7.9.0 GitHub release:

- `darwin-x64`: `keytar-v7.9.0-napi-v3-darwin-x64.tar.gz`, SHA-256 `4ce56e3896e76a2deaef13f8a36207efa6d94d96678d30200952d83d327eb5f9`
- `darwin-arm64`: `keytar-v7.9.0-napi-v3-darwin-arm64.tar.gz`, SHA-256 `195f0855e26f83e0d61e228d1b61c7769baa993244518dc9879d9d57104c7cec`

Source: `https://github.com/atom/node-keytar/releases/tag/v7.9.0`
