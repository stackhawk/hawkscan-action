#!/usr/bin/env bash

export INPUT_DRYRUN='false'
export INPUT_APIKEY='hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX'
export INPUT_CONFIGURATIONFILES="__tests__/stackhawk.yml"
export INPUT_VERSION='latest'
export INPUT_CODESCANNINGALERTS='true'
export INPUT_GITHUBTOKEN="${GITHUB_PAT}"
export HOST='http://localhost:8080'
export APP_ENV='unit_tests'
export INPUT_ARG

node --trace-warnings ./src/index.js
