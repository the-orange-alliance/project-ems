#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PublicAppStack } from "../lib/infra-stack";

const app = new cdk.App();

new PublicAppStack(app, "ems-ecr-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
