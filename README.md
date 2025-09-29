# Project EMS

Not your average scorekeeping software

# Getting Started

This project is a monrepo and utilizes features from [turbrepo](https://turbo.build/).

## Install dependencies

1. Install turborepo via `npm install turbo --global`
2. run `npm install` at the project root

## Build projects and packages

1. You can specify specific targets using turborepo (e.g. `turbo run @toa-lib/models#build`)
2. Running `turbo build` will build all apps and libraries.
3. It's recommended to use `npm run build` or `turbo build` as they are synonymous.

## Start developing

1. Execute the root-level dev command via `npm run dev`
2. This starts the `api`, `realtime` and `web` applications.

## AWS Amplify Gen 2 Support

First grab the ems-admin IAM security credentials needed to login to AWS.

Run `aws configure --profile ems-admin`

#### Build Status:

[![Test building EMS](https://github.com/the-orange-alliance/project-ems/actions/workflows/on_commit_build.yml/badge.svg)](https://github.com/the-orange-alliance/project-ems/actions/workflows/on_commit_build.yml)
