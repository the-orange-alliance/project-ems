import { defineBackend } from "@aws-amplify/backend";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Stack } from "aws-cdk-lib";

const backend = defineBackend({});

// Create one stack for everything
const emsStack = backend.createStack("ems-online-stack");

/**
 * Storage (S3)
 */
const bucket = new s3.Bucket(emsStack, "ems-storage");

/**
 * Auth (Cognito)
 */
const userPool = new cognito.UserPool(emsStack, "ems-user-pool", {
  selfSignUpEnabled: true,
});
const userPoolClient = new cognito.UserPoolClient(
  emsStack,
  "ems-user-pool-client",
  {
    userPool,
  },
);

/**
 * Lambda function
 */
const eventsLambda = new lambda.Function(emsStack, "api-events-fn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("functions/api-events"), // your function dir
});

/**
 * API Gateway
 */
const restApi = new RestApi(emsStack, "rest-api", {
  restApiName: "ems-rest-api",
  deploy: true,
  deployOptions: {
    stageName: "dev", // can make configurable
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_METHODS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const eventsLambdaIntegration = new LambdaIntegration(eventsLambda);

const eventItemsPath = restApi.root.addResource("events");
eventItemsPath.addMethod("GET", eventsLambdaIntegration);
eventItemsPath.addMethod("POST", eventsLambdaIntegration);
eventItemsPath.addMethod("PUT", eventsLambdaIntegration);
eventItemsPath.addMethod("DELETE", eventsLambdaIntegration);

/**
 * Amplify Outputs
 */
backend.addOutput({
  custom: {
    API: {
      [restApi.restApiName]: {
        endpoint: restApi.url,
        region: Stack.of(restApi).region,
        apiName: restApi.restApiName,
      },
    },
    Auth: {
      userPoolId: userPool.userPoolId,
      userPoolClientId: userPoolClient.userPoolClientId,
    },
    Storage: {
      bucketName: bucket.bucketName,
    },
  },
});
