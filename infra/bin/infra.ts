#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PublicEcrCicdStack } from "../lib/infra-stack";

const app = new cdk.App();

new PublicEcrCicdStack(app, "ems-ecr-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
