const { existsSync } = require('fs');
const execa = require('execa');

const plugins = [];
const {
  GITHUB_SHA,
  GITHUB_REPOSITORY,
  GIT_COMMITTER_NAME,
  GIT_COMMITTER_EMAIL,
  GIT_AUTHOR_NAME,
  GIT_AUTHOR_EMAIL,
} = process.env;
const successCmd = `
echo 'RELEASE_TAG=v\${nextRelease.version}' >> $GITHUB_ENV
echo 'RELEASE_VERSION=\${nextRelease.version}' >> $GITHUB_ENV
echo '::set-output name=release-tag::v\${nextRelease.version}'
echo '::set-output name=release-version::\${nextRelease.version}'
`;
const [owner, repo] = String(GITHUB_REPOSITORY).toLowerCase().split('/');

!GIT_COMMITTER_NAME && (process.env.GIT_COMMITTER_NAME = "open-sauced[bot]");
!GIT_COMMITTER_EMAIL && (process.env.GIT_COMMITTER_EMAIL = "63161813+open-sauced[bot]@users.noreply.github.com");

try {
  const { stdout: authorName } = execa.sync('git', ['log', '-1', '--pretty=format:%an', GITHUB_SHA]);
  const { stdout: authorEmail } = execa.sync('git', ['log', '-1', '--pretty=format:%ae', GITHUB_SHA]);
  authorName && !GIT_AUTHOR_NAME && (process.env.GIT_AUTHOR_NAME = `${authorName}`);
  authorEmail && !GIT_AUTHOR_EMAIL && (process.env.GIT_AUTHOR_EMAIL = `${authorEmail}`);
} catch (error) {
  console.log(error);
}

plugins.push([
  "@semantic-release/commit-analyzer", {
    "preset": "conventionalcommits",
    "releaseRules": [
      {type: "build", release: "minor"},
      {type: "ci", release: "patch"},
      {type: "docs", release: "minor"},
      {type: "style", release: "patch"},
      {type: "refactor", release: "patch"},
      {type: "test", release: "patch"},
      {type: "revert", release: "patch"},
      {type: "chore", release: false}
    ],
    "parserOpts": {
      "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
    }
  }
]);

plugins.push([
  "@semantic-release/release-notes-generator", {
    "preset": "conventionalcommits",
    "parserOpts": {
      "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
    },
    "writerOpts": {
      "commitsSort": ["subject", "scope"]
    },
    "presetConfig": {
      types: [
        {type: 'feat', section: 'Features'},
        {type: 'feature', section: 'Features'},
        {type: 'fix', section: 'Bug Fixes'},
        {type: 'perf', section: 'Performance Improvements'},
        {type: 'revert', section: 'Reverts'},
        {type: 'docs', section: 'Documentation'},
        {type: 'style', section: 'Styles'},
        {type: 'refactor', section: 'Code Refactoring'},
        {type: 'test', section: 'Tests'},
        {type: 'build', section: 'Build System'},
        {type: 'ci', section: 'Continuous Integration'}
      ]
    }
  }
]);

plugins.push([
  "@semantic-release/changelog", {
    "changelogTitle": `# 📦 ${owner}/${repo} changelog

[![conventional commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![semantic versioning](https://img.shields.io/badge/semantic%20versioning-2.0.0-green.svg)](https://semver.org)

> All notable changes to this project will be documented in this file`
  }
]);

plugins.push([
  "@semantic-release/npm", {
    "tarballDir": "pack"
  }
]);

try {
  const actionExists = existsSync('./action.yml');

  if (actionExists) {
    plugins.push([
      "@google/semantic-release-replace-plugin", {
        "replacements": [{
          "files": [
            "action.yml"
          ],
          "from": `image: 'docker://ghcr.io/${owner}/${repo}:.*'`,
          "to": `image: 'docker://ghcr.io/${owner}/${repo}:\${nextRelease.version}'`,
          "results": [{
            "file": "action.yml",
            "hasChanged": true,
            "numMatches": 1,
            "numReplacements": 1
          }],
          "countMatches": true
        }]
      }
    ]);
  }
} catch(err) {
  console.error("Fatal lstat on action.yml: ", err);
}

plugins.push(["semantic-release-license"]);

plugins.push([
  "@semantic-release/git", {
    "assets": [
      'LICENSE',
      'LICENSE.md',
      'COPYING',
      'COPYING.md',
      "CHANGELOG.md",
      "package.json",
      "package-lock.json",
      "npm-shrinkwrap.json",
      "public/diagram.svg",
      "action.yml"
    ],
    "message": `chore(release): \${nextRelease.version} [skip ci]\n\n\${nextRelease.notes}`
  }
]);

plugins.push([
  "@semantic-release/github", {
    "addReleases": 'bottom',
    "assets": [
      {
        "path": "pack/*.tgz",
        "label": "Static distribution"
      }
    ]
  }
]);

try {
  const dockerExists = existsSync('./Dockerfile');

  if (dockerExists) {
    plugins.push([
      "eclass-docker-fork",
      {
        "baseImageName": `${owner}/${repo}`,
        "registries": [
          {
            "url": "ghcr.io",
            "imageName": `ghcr.io/${owner}/${repo}`,
            "user": "GITHUB_REPOSITORY_OWNER",
            "password": "GITHUB_TOKEN"
          }
        ]
      }
    ]);
  }
} catch(err) {
  console.error("Fatal lstat on Dockerfile: ", err);
}

if (process.env.GITHUB_ACTIONS === "true") {
  plugins.push([
    "@semantic-release/exec", {
      successCmd
    }
  ]);
}

module.exports = {
  "branches": [
    // maintenance releases
    "+([0-9])?(.{+([0-9]),x}).x",

    // release channels
    "main",
    "next",
    "next-major",

    // pre-releases
    {
      name: 'beta',
      prerelease: true
    },
    {
      name: 'alpha',
      prerelease: true
    }
  ],
  plugins,
}
