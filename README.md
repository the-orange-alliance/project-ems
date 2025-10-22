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

## Docker Setup

EMS supports being run inside of docker containers.

1. First, install [Docker Desktop](https://docs.docker.com/desktop/)
2. Make sure your `package-lock.json` is either untouched, or synced (via running `npm i`)
3. Start the docker daemon

The dockerfile supports the repo's monorepo structure via turbo, and should take no more than 5-6 minutes to build from a no-cache state.
With cache, the build will take around 30 seconds.

### Building Docker Images

There are 2 docker containers based upon the same image that can be run -- `backend` and `web`.

The `backend` container will run `api` and `realtime` services while exposing their ports. The docker build
will also build these images in a production environment via `NODE_ENV=production`.

The `web` container wll run `ems-web` on port 80. Also built in a production environment.

You can build these images via the 2 commands:

1. `docker build -t ems-srv:latest --target backend .`
2. `docker build -t ems-web:latest --target web .`

These commands must be run from the repo root.

## AWS Amplify Gen 2 Support

First grab the ems-admin IAM security credentials needed to login to AWS.

Run `aws configure --profile ems-admin`

You might need to bootstrap your environment.

Run `npx cdk bootstrap aws://102536421230/us-east-2 --profile ems-admin`

#### Build Status:

[![Test building EMS](https://github.com/the-orange-alliance/project-ems/actions/workflows/on_commit_build.yml/badge.svg)](https://github.com/the-orange-alliance/project-ems/actions/workflows/on_commit_build.yml)
