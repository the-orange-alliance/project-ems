# Project EMS

Not your average scorekeeping software

# Getting Started

This project is a monrepo and utilizes features from [turbrepo](https://turbo.build/).

1. Install dependencies
   b. Install turborepo via `npm install turbo --global`
   a. run `npm install` at the project root
2. Build projects and packages
   a. You can specify specific targets using turborepo (e.g. `turbo run @toa-lib/models#build`)
   b. Running `turbo build` will build all apps and libraries.
   c. It's recommended to use `npm run build` or `turbo build` as they are synonymous.
3. Start developing
   a. Execute the root-level dev command via `npm run dev`
   b. This starts the `api`, `realtime` and `web` applications.

#### Build Status:

[![Test building EMS](https://github.com/the-orange-alliance/project-ems/actions/workflows/on_commit_build.yml/badge.svg)](https://github.com/the-orange-alliance/project-ems/actions/workflows/on_commit_build.yml)
