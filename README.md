<div style="text-align: center" align="center">
  <img alt="Open Sauced" src="https://i.ibb.co/7jPXt0Z/logo1-92f1a87f.png" width="300px" />

# @open-sauced/release

> [**semantic-release**](https://github.com/semantic-release/semantic-release) shareable config to publish to `npm` and/or `ghcr`.
> now with alpha and beta pre-releases 

[![Commits](https://img.shields.io/github/commit-activity/w/open-sauced/release?style=flat)](https://github.com/open-sauced/release/pulse)
[![Issues](https://img.shields.io/github/issues/open-sauced/release.svg?style=flat)](https://github.com/open-sauced/release/issues)
[![Releases](https://img.shields.io/github/v/release/open-sauced/release.svg?style=flat)](https://github.com/open-sauced/release/releases)
[![Discord](https://img.shields.io/discord/714698561081704529.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/U2peSNf23P)
[![Twitter](https://img.shields.io/twitter/follow/saucedopen?label=Follow&style=social)](https://twitter.com/saucedopen)

</div>

## 📦 Plugins

This shareable configuration use the following plugins:

- [`@semantic-release/commit-analyzer`](https://github.com/semantic-release/commit-analyzer)
- [`@semantic-release/release-notes-generator`](https://github.com/semantic-release/release-notes-generator)
- [`@semantic-release/changelog`](https://github.com/semantic-release/changelog)
- [`conventional-changelog-conventionalcommits`](https://github.com/conventional-changelog/conventional-changelog)
- [`@semantic-release/npm`](https://github.com/semantic-release/npm)
- [`@google/semantic-release-replace-plugin`](https://github.com/google/semantic-release-replace-plugin)
- [`@semantic-release/git`](https://github.com/semantic-release/git)
- [`@semantic-release/github`](https://github.com/semantic-release/github)
- [`@eclass/semantic-release-docker`](https://github.com/eclass/semantic-release-docker)
- [`@semantic-release/exec`](https://github.com/semantic-release/exec)
- [`execa`](https://github.com/sindresorhus/execa)
- [`npmlog`](https://github.com/npm/npmlog)

## 🖥️ Requirements

Most important limitations are:
- `GITHUB_TOKEN` for everything
- `NPM_TOKEN` for public `npm` library
- `docker` containers need to be built beforehand

You can skip here if you are using elevated [Private Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token), however we don't recommend going down that path.

No force push or admin cherries branch protections for the following branches:
- `main` - required
- `alpha` - optional, pre-release branch
- `beta` - optional, pre-release branch
- `next` - optional, next channel
- `next-major` - optional, next major
- `vX[.X.X]` - maintenance releases

If you use more than the main branch, optionally create an environment that is limiting where pushes can come from and enable the merge strategy.

We are using `production` in our examples, if you copy paste them you will find this new environment generated in your settings! 🍕

## 🧪 GitHub actions usage 

Since version 3 it is possible to use semantic-release without any trace of it or the open-sauced configuration anywhere in the dependency tree.

Docker containers are pushed as part of the release so they mirror the availability of `npm` packages.

The simplest use case for a typical NPM package, almost zero install downtime from ghcr and no more local tooling:

```yaml
name: "Release container"

on:
  push:
    branches:
      - main
      - next
      - next-major
      - alpha
      - beta

jobs:
  release:
    environment:
      name: production
      url: https://github.com/${{ github.repository }}/releases/tag/${{ env.RELEASE_TAG }}
    runs-on: ubuntu-latest
    steps:
      - name: "☁️ checkout repository"
        uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: "🚀 release"
        id: semantic-release
        uses: docker://ghcr.io/open-sauced/release:1.0.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: '♻️ cleanup'
        run: |
          echo ${{ env.RELEASE_TAG }}
          echo ${{ env.RELEASE_VERSION }}
```

Marketplace actions should default to the major tag and are essentially more stable as we have to curate every release.

A more traditional approach, only thing really different here is a minor pull overhead and using set outputs instead of environment variables:

```yaml
name: "Release"

on:
  push:
    branches:
      - main
      - next
      - next-major
      - alpha
      - beta

jobs:
  release:
    environment:
      name: production
      url: https://github.com/${{ github.repository }}/releases/tag/${{ steps.semantic-release.outputs.release-tag }}
    runs-on: ubuntu-latest
    steps:
      - name: "☁️ checkout repository"
        uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: "🚀 release"
        id: semantic-release
        uses: open-sauced/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: '♻️ cleanup'
        run: |
          echo ${{ steps.semantic-release.outputs.release-tag }}
          echo ${{ steps.semantic-release.outputs.release-version }}
```

## 📦 NPM usage

You can opt to use this package in your local tooling. Proceed as you would normally would, replacing `npm` with your package manager of choice and install the package:

```bash
npm install --save-dev @open-sauced/release
```

The shareable config can then be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "extends": "@open-sauced/release"
}
```

Now all you need to do is create a release:

```shell
npx semantic-release
```

## 🔧 Configuration

See each [plugin](#-plugins) documentation for required installation and configuration steps.

### NPM

Set `private` to true in `package.json` if you want to disable `npm`, or, change the scope of package using `publishConfig`.

Keep one of `files` or `main` keys in your `package.json` accurate depending on whether you are building a library or an application.

If you publish, make sure to also provide a valid `NPM_TOKEN` as `.npmrc` authentication is ignored in our config!

### GitHub Actions

Unless you have an `action.yml` present in your root folder, this module is not added to the release config.

If you have an `action.yml` present, our config will attempt to adjust the container version to the newly pushed `npm` and `docker` tags.

### Manifest.json

Unless you have a `manifest.json` present in your root folder, this module is not added to the release config.

If you have a `manifest.json` present, our config will attempt to adjust the `version` value to the newly pushed `npm` and `docker` tags. This version bump is limited to releases made exclusively on the `main` branch.

### Docker

Unless you have a `Dockerfile` present in your root folder, this module is not added to the release config. 

If you have a `Dockerfile` present, our config will attempt to push to `ghcr.io`.

### Environment variables

Using our configuration comes with some sensible defaults:

- `DOCKER_USERNAME=$GITHUB_REPOSITORY_OWNER`
- `DOCKER_PASSWORD=$GITHUB_TOKEN`
- `GIT_COMMITTER_NAME="open-sauced[bot]"`
- `GIT_COMMITTER_EMAIL="63161813+open-sauced[bot]@users.noreply.github.com"`
- `GIT_AUTHOR_NAME` - parsed from commit `$GITHUB_SHA`
- `GIT_AUTHOR_EMAIL` - parsed from commit `$GITHUB_SHA`

Feel free to change any of the above to whatever suits your purpose, our motivation is to keep `GITHUB_TOKEN` and/or `NPM_TOKEN` the only necessary requirements.

We are actively investigating ways to drop the 2 remaining variables as well!

## 🤝 Contributing

We encourage you to contribute to Open Sauced! Please check out the [Contributing guide](https://docs.opensauced.pizza/contributing/introduction-to-contributing/) for guidelines about how to proceed.

If you decide to fix a bug, make sure to use the conventional commit available at:

```shell
npm run push
```

<img align="right" src="https://i.ibb.co/CJfW18H/ship.gif" width="200"/>

## 🍕 Community

Got Questions? Join the conversation in our [Discord](https://discord.gg/U2peSNf23P).  
Find Open Sauced videos and release overviews on our [YouTube Channel](https://www.youtube.com/channel/UCklWxKrTti61ZCROE1e5-MQ).

## ⚖️ LICENSE

MIT © [Open Sauced](LICENSE)
