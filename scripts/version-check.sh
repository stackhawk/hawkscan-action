#!/usr/bin/env bash

# This script checks the version in .bumpversion.cfg against tags in Git. If there's no tag for this version,
# it returns the .bumpversion current version number. Otherwise it prints an error message to std-err and returns
# nothing to std-out.

RELEASE_VERSION=$(grep "^current_version" ./.bumpversion.cfg | egrep -o '[0-9]+\.[0-9]+\.[0-9]+')

if [[ -z "${RELEASE_VERSION}" ]]; then
  >&2 echo "No valid version number found."
elif [[ $(git tag -l "v${RELEASE_VERSION}") == "v${RELEASE_VERSION}" ]]; then
  >&2 echo "Version ${RELEASE_VERSION} has already been released."
else
  echo "${RELEASE_VERSION}"
fi
