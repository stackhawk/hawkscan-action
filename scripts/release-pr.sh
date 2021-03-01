#!/usr/bin/env bash

# Declare variables
BASE=main
REPO_URL="https://github.com/stackhawk/hawkscan-action"

function help() {
  local error=$1
  if [[ -n "${error}" ]]; then
    echo >&2 "ERROR: ${error}"
  fi
  cat <<EOF
Usage: "$(basename "${0}") --bump PART [--base BASE] [--commit MSG] [--title TITLE] [--help]"
  -b | --bump PART    REQUIRED: Bump the version before creating a PR. PART must be one of 'major', 'minor', or 'patch'
  -B | --base BASE    Target the BASE branch instead of 'main' [Default: main]
  -c | --commit MSG   Commit message [Default: "prepare for pull request to BASE"]
  -t | --title TITLE  PR title [Default: "Bump version: CURRENT_VERSION → NEW_VERSION"]
  -h | --help         Print this usage guide

This script will take the following actions to prepare this GitHub Action for release to the GitHub Marketplace
 - Bump the NPM version as specified
 - Package the Action and all dependencies and licenses to the ./dist directory
 - Commit and push changes to GitHub
 - Create a PR
 - Give a link to the release page for publication to GitHub Marketplace
EOF
}

function parse_args() {
  while [[ ${#} -gt 0 ]]; do
    local key="${1}"
    case ${key} in
    -b | --bump)
      PART=${2}
      if [[ ! ${PART} =~ (major|minor|patch) ]]; then
        ERROR="The only valid options for '--bump' are major, minor, or patch"
        help "${ERROR}"
        exit 1
      fi
      shift 2;;
    -B | --base)
      BASE=${2}
      shift 2;;
    -c | --commit)
      MSG=${2}
      shift 2;;
    -t | --title)
      TITLE=${2}
      shift 2;;
    -h | --help)
      help
      exit 0
      ;;
    *)
      ERROR="Unknown option: '${1}'."
      help "${ERROR}"
      exit 1
      ;;
    esac
  done

  if [[ -z $MSG ]]; then
    MSG="prepare for pull request to ${BASE}"
  fi
  if [[ -z $PART ]]; then
    ERROR="Missing required option '--bump PART'"
    help "${ERROR}"
    exit 1
  fi
}

function planner() {
  local mode=${1}
  if [[ ${mode} == "plan" ]]; then
    echo
    echo "Congratulations! This script is about to run the following commands:"
  elif [[ ${mode} == "run" ]]; then
    echo "Here we go!"
  else
    echo >&2 "ERROR: This shouldn't happen"
    exit 1
  fi

  # Here's the plan:
  bump_version "${mode}"
  package_prep "${mode}"
  git_commit "${mode}"
  git_push "${mode}"
  gh_pr "${mode}"

  if [[ ${mode} == "plan" ]]; then
    echo "Check the plan above. Hit return to continue, or <ctrl>-c to bail."
    read -r
  fi
}

function check_deps() {
  echo -n "Checking dependencies... "
  for prereq in gh bump2version jq; do
    if ! command -v "${prereq}" >/dev/null; then
      echo "Not OK!"
      echo >&2 "ERROR: Prerequisite '${prereq}' not found."
      exit 1
    fi
  done
  echo "OK"
}

function check_repo() {
  echo -n "Checking if repo is clean... "
  local branch=$(git branch --show-current)
  if [[ ${branch} =~ ^(master|main|develop)$ ]]; then
    echo "OH NO!"
    echo " You can't push to the master, main, or develop branches. Try this from a feature branch."
    exit 1
  fi
  if output=$(git status --untracked-files=no --porcelain) && [ -z "$output" ]; then
    # Working directory clean
    echo "OK!"
  else
    # Uncommitted changes
    echo "OH NO!"
    echo " There are uncommitted changes in this repo."
    echo " Please commit any staged changes before running this again:"
    echo "${output}"
    exit 1
  fi
}

function check_version() {
  echo "Checking version info"
  bump_list=$(bump_version run --dry-run --list)
  CURRENT_VERSION=$(echo "${bump_list}" | grep current_version | cut -d'=' -f2)
  NEW_VERSION=$(echo "${bump_list}" | grep new_version | cut -d'=' -f2)
  echo " Current version:  ${CURRENT_VERSION}"
  echo " Proposed version: ${NEW_VERSION}"
  if [[ $(git tag -l "v${NEW_VERSION}") == "v${NEW_VERSION}" ]]; then
    >&2 echo "ERROR: There is already a release for version ${NEW_VERSION}!"
    exit 1
  fi
}

function git_pull() {
  echo "Pulling any remote commits..."
  run "git pull" run
}

function package_prep() {
  local mode=${1}
  run "npm run all" "${mode}"
  run "git add dist" "${mode}"
}

function bump_version() {
  local mode=${1}
  shift
  cmd="bump2version ${*} ${PART}"
  run "${cmd}" "${mode}"
}

function git_commit() {
  local mode=${1}
  local cmd="git commit -m \"${MSG}\" --allow-empty"
  run "${cmd}" "${mode}"
}

function git_push() {
  local mode=${1}
  run "git push" "${mode}"
}

# add --no-pr
function gh_pr() {
  local mode=${1}
  if [[ -z $TITLE ]]; then
    TITLE="Bump version: ${CURRENT_VERSION} → ${NEW_VERSION}"
  fi
  local cmd="gh pr create --web --base ${BASE} --title \"${TITLE}\""
  run "${cmd}" "${mode}"
}

function release_information() {
  echo
  echo "Yay! Once this PR has been approved and built, it will automatically be released as v${NEW_VERSION}."
  echo "You may need to edit this release to publish it to the GitHub Marketplace. Check it out at:"
  echo "  ${REPO_URL}/releases/tag/v${NEW_VERSION}"
}

function run() {
  local cmd=${1}
  local mode=${2}
  echo "Run: '${cmd}'"
  if [[ ${mode} == "run" ]]; then
    if ! eval "${cmd}"; then
      echo >&2 "ERROR: '${cmd}' failed."
      exit 1
    fi
  fi
}

# The things
function main() {
  parse_args "$@"
  check_deps
  check_repo
  git_pull
  check_version
  planner plan
  planner run
  release_information
}

# Do the things
main "$@"
