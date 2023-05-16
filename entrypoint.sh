#!/bin/sh -l

git config --global --add safe.directory "$GITHUB_WORKSPACE"
npx semantic-release --extends /usr/local/lib/release.config.js
