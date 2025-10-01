import { defineBackend } from "@aws-amplify/backend";
import { storage } from "./storage/resource";
import { auth } from "./auth/resource";
import { apiEventsFunction } from "./functions/api-events/resource";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Stack } from "aws-cdk-lib";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  storage,
  auth,
  apiEventsFunction,
});

const apiStack = backend.createStack("ems-online-api-stack");

backend.stack.addDependency(apiStack);

const restApi = new RestApi(apiStack, "ems-online-rest-api", {
  restApiName: "ems-online-rest-api-gateway",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_METHODS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const eventsLambdaIntegration = new LambdaIntegration(
  backend.apiEventsFunction.resources.lambda,
);

const eventItemsPath = restApi.root.addResource("events");

eventItemsPath.addMethod("GET", eventsLambdaIntegration);
eventItemsPath.addMethod("POST", eventsLambdaIntegration);
eventItemsPath.addMethod("PUT", eventsLambdaIntegration);
eventItemsPath.addMethod("DELETE", eventsLambdaIntegration);

backend.addOutput({
  custom: {
    API: {
      [restApi.restApiName]: {
        endpoint: restApi.url,
        region: Stack.of(restApi).region,
        apiName: restApi.restApiName,
      },
    },
  },
});
