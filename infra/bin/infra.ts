#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EcrCicdStack } from "../lib/infra-stack";

const app = new cdk.App();

new EcrCicdStack(app, "ems-ecr-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-2",
  },
});
