const { existsSync } = require("node:fs");
const { execSync } = require('node:child_process');
const log = require("npmlog");

log.info(`Executing semantic-release config setup`);

const releaseConfig = {
  "branches": [
    // maintenance releases
    "+([0-9])?(.{+([0-9]),x}).x",

    // release channels
    "main",
    "next",
    "next-major",

    // pre-releases
    {
      name: "beta",
      prerelease: true
    },
    {
      name: "alpha",
      prerelease: true
    }
  ],
  plugins: [],
}
const noteKeywords = [
  "BREAKING CHANGE",
  "BREAKING CHANGES",
  "BREAKING"
];
const {
  GITHUB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_REF,
  GIT_COMMITTER_NAME,
  GIT_COMMITTER_EMAIL,
  GIT_AUTHOR_NAME,
  GIT_AUTHOR_EMAIL,
  NPM_PACKAGE_ROOT
} = process.env;
const [owner, repo] = String(GITHUB_REPOSITORY).toLowerCase().split("/");
const addPlugin = (plugin, options) => {
  log.info(`${plugin} enabled with${options && ' options:' || 'out options'}`);
  options && log.info(null, options);
  return releaseConfig.plugins.push([plugin, options]);
};

!GIT_COMMITTER_NAME && (process.env.GIT_COMMITTER_NAME = "open-sauced[bot]");
!GIT_COMMITTER_EMAIL && (process.env.GIT_COMMITTER_EMAIL = "63161813+open-sauced[bot]@users.noreply.github.com");

try {
  const authorName = execSync(`git log -1 --pretty=format:%an ${GITHUB_SHA}`, { encoding: "utf8", stdio: "pipe" });
  const authorEmail = execSync(`git log -1 --pretty=format:%ae ${GITHUB_SHA}`, { encoding: "utf8", stdio: "pipe" });
  authorName && !GIT_AUTHOR_NAME && (process.env.GIT_AUTHOR_NAME = `${authorName}`);
  authorEmail && !GIT_AUTHOR_EMAIL && (process.env.GIT_AUTHOR_EMAIL = `${authorEmail}`);
} catch (e) {
  log.warn(`Unable to set GIT_AUTHOR_NAME and GIT_AUTHOR_EMAIL`);
  log.error(e);
}

log.info(`Adding semantic-release config plugins`);

addPlugin("@semantic-release/commit-analyzer", {
  "preset": "conventionalcommits",
  "releaseRules": [
    {breaking: true, release: "major"},
    {type: "feat", release: "minor"},
    {type: "fix", release: "patch"},
    {type: "perf", release: "patch"},
    {type: "revert", release: "patch"},
    {type: "docs", release: "minor"},
    {type: "style", release: "patch"},
    {type: "refactor", release: "patch"},
    {type: "test", release: "patch"},
    {type: "build", release: "patch"},
    {type: "ci", release: "patch"},
    {type: "chore", release: false}
  ],
  "parserOpts": {
    noteKeywords
  }
});

addPlugin("@semantic-release/release-notes-generator", {
  "preset": "conventionalcommits",
  "parserOpts": {
    noteKeywords
  },
  "writerOpts": {
    "commitsSort": ["subject", "scope"]
  },
  "presetConfig": {
    types: [
      {type: "feat", section: "🍕 Features"},
      {type: "feature", section: "🍕 Features"},
      {type: "fix", section: "🐛 Bug Fixes"},
      {type: "perf", section: "🔥 Performance Improvements"},
      {type: "revert", section: "⏩ Reverts"},
      {type: "docs", section: "📝 Documentation"},
      {type: "style", section: "🎨 Styles"},
      {type: "refactor", section: "🧑‍💻 Code Refactoring"},
      {type: "test", section: "✅ Tests"},
      {type: "build", section: "🤖 Build System"},
      {type: "ci", section: "🔁 Continuous Integration"}
    ]
  }
});

addPlugin("@semantic-release/changelog", {
  "changelogTitle": `# 📦 ${owner}/${repo} changelog

[![conventional commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![semantic versioning](https://img.shields.io/badge/semantic%20versioning-2.0.0-green.svg)](https://semver.org)

> All notable changes to this project will be documented in this file`
});

if (process.env.SKIP_NPM_PUBLISH === undefined) {
  const pkgRoot = NPM_PACKAGE_ROOT || ".";
  addPlugin("@semantic-release/npm", {
    tarballDir: "pack",
    pkgRoot,
  });
}

const actionExists = existsSync("./action.yml");
if (actionExists) {
  addPlugin("@google/semantic-release-replace-plugin", {
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
  });
}

const manifestExists = existsSync("./manifest.json");
if (manifestExists && GITHUB_REF === "refs/heads/main") {
  addPlugin("@google/semantic-release-replace-plugin", {
    "replacements": [{
      "files": [
        "manifest.json"
      ],
      "from": `"version": ".*"`,
      "to": `"version": "\${nextRelease.version}"`,
      "results": [{
        "file": "manifest.json",
        "hasChanged": true,
        "numMatches": 1,
        "numReplacements": 1
      }],
      "countMatches": true
    }]
  });
}

if (process.env.SKIP_NPM_PUBLISH === undefined) {
  const packageFilesPrefix = process.env.NPM_PACKAGE_ROOT ? `${process.env.NPM_PACKAGE_ROOT}/` : "";
  addPlugin("@semantic-release/git", {
    "assets": [
      "LICENSE*",
      "CHANGELOG.md",
      `${packageFilesPrefix}package.json`,
      `${packageFilesPrefix}package-lock.json`,
      `${packageFilesPrefix}npm-shrinkwrap.json`,
      `${packageFilesPrefix}yarn.lock`,
      `${packageFilesPrefix}pnpm-lock.yaml`,
      "public/**/*",
      "supabase/**/*",
      "action.yml",
      "manifest.json"
    ],
    "message": `chore(<%= nextRelease.type %>): release <%= nextRelease.version %> <%= nextRelease.channel !== null ? \`on \${nextRelease.channel} channel \` : '' %>[skip ci]\n\n<%= nextRelease.notes %>`
  });
}

addPlugin("@semantic-release/github", {
  "addReleases": "bottom",
  "assets": [
    {
      "path": "pack/*.tgz",
      "label": "Static distribution"
    }
  ]
});

const dockerExists = existsSync("./Dockerfile");
if (dockerExists && process.env.SKIP_DOCKER_PUBLISH === undefined) {
  addPlugin("eclass-docker-fork", {
    "baseImageName": `${owner}/${repo}`,
    "registries": [
      {
        "url": "ghcr.io",
        "imageName": `ghcr.io/${owner}/${repo}`,
        "user": "GITHUB_REPOSITORY_OWNER",
        "password": "GITHUB_TOKEN"
      }
    ]
  });
}

addPlugin("semantic-release-major-tag");

if (process.env.GITHUB_ACTIONS !== undefined) {
  addPlugin("@semantic-release/exec", {
    successCmd: `echo 'RELEASE_TAG=v\${nextRelease.version}' >> $GITHUB_ENV
echo 'RELEASE_VERSION=\${nextRelease.version}' >> $GITHUB_ENV
echo 'release-tag=v\${nextRelease.version}' >> $GITHUB_OUTPUT
echo 'release-version=\${nextRelease.version}' >> $GITHUB_OUTPUT`,
  });
}

module.exports = releaseConfig;
