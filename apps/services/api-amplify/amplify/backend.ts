import { defineBackend } from "@aws-amplify/backend";
import { storage } from "./storage/resource";
import { auth } from "./auth/resource";
import { apiEventsFunction } from "./functions/api-events/resource";
import { apiTeamsFunction } from "./functions/api-teams/resource";
import { apiTournamentsFunction } from "./functions/api-tournaments/resource";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Stack } from "aws-cdk-lib";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  storage,
  auth,
  apiEventsFunction,
  apiTeamsFunction,
  apiTournamentsFunction,
});

backend.storage.resources.bucket.grantReadWrite(
  backend.apiEventsFunction.resources.lambda,
);

backend.storage.resources.bucket.grantReadWrite(
  backend.apiTeamsFunction.resources.lambda,
);

backend.storage.resources.bucket.grantReadWrite(
  backend.apiTournamentsFunction.resources.lambda,
);

backend.apiEventsFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName,
);

backend.apiTeamsFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName,
);

backend.apiTournamentsFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName,
);

const apiStack = backend.createStack("ems-online-api-stack");

backend.stack.addDependency(apiStack);

const restApi = new RestApi(apiStack, "ems-online-rest-api", {
  restApiName: "ems-online-rest-api-gateway",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const eventsLambdaIntegration = new LambdaIntegration(
  backend.apiEventsFunction.resources.lambda,
);

const teamsLambdaIntegration = new LambdaIntegration(
  backend.apiTeamsFunction.resources.lambda,
);

const tournamentsLambdaIntegration = new LambdaIntegration(
  backend.apiTournamentsFunction.resources.lambda,
);

const eventsPath = restApi.root.addResource("event");
const eventPath = eventsPath.addResource("{eventKey}");

const teamsPath = restApi.root.addResource("teams").addResource("{eventKey}");
const teamPath = teamsPath.addResource("{teamKey}");

const tournamentsPath = restApi.root.addResource("tournament");
const tournamentsForEventPath = tournamentsPath.addResource("{eventKey}");
const tournamentPath = tournamentsPath.addResource("{eventKey}");

eventsPath.addMethod("GET", eventsLambdaIntegration);
eventsPath.addMethod("POST", eventsLambdaIntegration);
eventPath.addMethod("GET", eventsLambdaIntegration);
eventPath.addMethod("PATCH", eventsLambdaIntegration);
eventPath.addMethod("DELETE", eventsLambdaIntegration);

teamsPath.addMethod("GET", teamsLambdaIntegration);
teamsPath.addMethod("POST", teamsLambdaIntegration);
teamPath.addMethod("PATCH", teamsLambdaIntegration);
teamPath.addMethod("DELETE", teamsLambdaIntegration);

tournamentsForEventPath.addMethod("GET", tournamentsLambdaIntegration);
tournamentsPath.addMethod("POST", tournamentsLambdaIntegration);
tournamentPath.addMethod("PATCH", tournamentsLambdaIntegration);
tournamentPath.addMethod("DELETE", tournamentsLambdaIntegration);

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
