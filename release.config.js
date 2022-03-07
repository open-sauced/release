const { existsSync } = require("fs");
const { sync, commandSync } = require("execa");
const { resolve } = require("path");
const log = require("npmlog");

const plugins = [];
const noteKeywords = [
  "BREAKING CHANGE",
  "BREAKING CHANGES",
  "BREAKING"
];
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
const [owner, repo] = String(GITHUB_REPOSITORY).toLowerCase().split("/");
const addPlugin = (plugin, options) => {
  log.info(`${plugin} enabled ${options && 'with options:'}`);
  options && log.info(null, options);
  return plugins.push([plugin, options]);
};

log.info(`Executing semantic-release config setup`);

!GIT_COMMITTER_NAME && (process.env.GIT_COMMITTER_NAME = "open-sauced[bot]");
!GIT_COMMITTER_EMAIL && (process.env.GIT_COMMITTER_EMAIL = "63161813+open-sauced[bot]@users.noreply.github.com");

try {
  const { stdout: authorName } = sync("git", ["log", "-1", "--pretty=format:%an", GITHUB_SHA]);
  const { stdout: authorEmail } = sync("git", ["log", "-1", "--pretty=format:%ae", GITHUB_SHA]);
  authorName && !GIT_AUTHOR_NAME && (process.env.GIT_AUTHOR_NAME = `${authorName}`);
  authorEmail && !GIT_AUTHOR_EMAIL && (process.env.GIT_AUTHOR_EMAIL = `${authorEmail}`);
} catch (e) {
  log.error(`Unable to set GIT_COMMITTER_NAME and GIT_COMMITTER_EMAIL`, e);
}

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

addPlugin("@semantic-release/npm", {
  "tarballDir": "pack"
});

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

try {
  const {stdout} = commandSync("ls -A1 LICENSE*", {
    shell: true,
  });

  addPlugin("semantic-release-license", {
    license: {
      path: resolve(stdout)
    }
  });
} catch (e) {
  log.error(`Unable to run detect license command`, e);
}

addPlugin("@semantic-release/git", {
  "assets": [
    "LICENSE*",
    "CHANGELOG.md",
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "public/**/*",
    "supabase/**/*",
    "action.yml"
  ],
  "message": `chore(<%= nextRelease.type %>): release <%= nextRelease.version %> <%= nextRelease.channel !== null ? \`on \${nextRelease.channel} channel \` : '' %>[skip ci]\n\n<%= nextRelease.notes %>`
});

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
if (dockerExists) {
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

if (process.env.GITHUB_ACTIONS !== undefined) {
  addPlugin("@semantic-release/exec", {
    successCmd,
  });
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
      name: "beta",
      prerelease: true
    },
    {
      name: "alpha",
      prerelease: true
    }
  ],
  plugins,
}
