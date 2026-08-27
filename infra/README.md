# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Deploying EMS to AWS

The full EMS infra stack can be deployed simply with the following command:

`npx cdk deploy --profile ems-admin`

If the ems-admin profile is not setup, run `aws configure`.

### Changing The Lightsail Image

`npx cdk deploy -c imageTag=main-${SHORT_SHA} --require-approval never`
