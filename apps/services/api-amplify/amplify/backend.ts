import { defineBackend } from "@aws-amplify/backend";
import { storage } from "./storage/resource";
import { auth } from "./auth/resource";
import { apiEventsFunction } from "./functions/api-events/resource";
import { apiTeamsFunction } from "./functions/api-teams/resource";
import { apiTournamentsFunction } from "./functions/api-tournaments/resource";
import { apiScheduleFunction } from "./functions/api-schedule/resource";
import { apiScheduleParamsFunction } from "./functions/api-schedule-params/resource";
import {
  BasePathMapping,
  Cors,
  DomainName,
  EndpointType,
  LambdaIntegration,
  RestApi,
  SecurityPolicy,
} from "aws-cdk-lib/aws-apigateway";
import {
  Stack,
  aws_route53 as route53,
  aws_certificatemanager as acm,
  aws_route53_targets as route53Targets,
} from "aws-cdk-lib";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  storage,
  auth,
  apiEventsFunction,
  apiTeamsFunction,
  apiTournamentsFunction,
  apiScheduleFunction,
  apiScheduleParamsFunction,
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

backend.storage.resources.bucket.grantReadWrite(
  backend.apiScheduleFunction.resources.lambda,
);

backend.storage.resources.bucket.grantReadWrite(
  backend.apiScheduleParamsFunction.resources.lambda,
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

backend.apiScheduleFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName,
);

backend.apiScheduleParamsFunction.addEnvironment(
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

const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
  backend.stack,
  "KyleFlynnDevZone",
  {
    hostedZoneId: "Z010722415N45PUJB9NCF",
    zoneName: "kyleflynn.dev",
  },
);

const certificate = new acm.Certificate(backend.stack, "ApiCertificate", {
  domainName: "api.global.kyleflynn.dev",
  validation: acm.CertificateValidation.fromDns(hostedZone),
});

const customDomain = new DomainName(backend.stack, "AmplifyApiDomain", {
  domainName: "api.global.kyleflynn.dev",
  certificate,
  endpointType: EndpointType.REGIONAL,
  securityPolicy: SecurityPolicy.TLS_1_2,
});

new BasePathMapping(backend.stack, "AmplifyApiMapping", {
  domainName: customDomain,
  restApi,
});

new route53.ARecord(backend.stack, "ApiCustomDomainAlias", {
  zone: hostedZone,
  recordName: "api.global",
  target: route53.RecordTarget.fromAlias(
    new route53Targets.ApiGatewayDomain(customDomain),
  ),
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

const scheduleLambdaIntegration = new LambdaIntegration(
  backend.apiScheduleFunction.resources.lambda,
);

const scheduleParamsLambdaIntegration = new LambdaIntegration(
  backend.apiScheduleParamsFunction.resources.lambda,
);

const eventsPath = restApi.root.addResource("event");
const eventPath = eventsPath.addResource("{eventKey}");

const teamsPath = restApi.root.addResource("teams").addResource("{eventKey}");
const teamPath = teamsPath.addResource("{teamKey}");

const tournamentsPath = restApi.root.addResource("tournament");
const tournamentsForEventPath = tournamentsPath.addResource("{eventKey}");
const tournamentPath = tournamentsForEventPath.addResource("{tournamentKey}");

const scheduleItemsPath = restApi.root.addResource("schedule-items");
const scheduleItemsForEventPath = scheduleItemsPath.addResource("{eventKey}");
const scheduleItemsForTournamentPath =
  scheduleItemsForEventPath.addResource("{tournamentKey}");
const scheduleItemPath = scheduleItemsForTournamentPath.addResource("{id}");

const scheduleParamsPath = restApi.root.addResource("schedule-params");
const scheduleParamsForEventPath = scheduleParamsPath.addResource("{eventKey}");
const scheduleParamsForTournamentPath =
  scheduleParamsForEventPath.addResource("{tournamentKey}");

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

scheduleItemsPath.addMethod("GET", scheduleLambdaIntegration);
scheduleItemsPath.addMethod("POST", scheduleLambdaIntegration);
scheduleItemsForEventPath.addMethod("GET", scheduleLambdaIntegration);
scheduleItemsForTournamentPath.addMethod("GET", scheduleLambdaIntegration);
scheduleItemsForTournamentPath.addMethod("DELETE", scheduleLambdaIntegration);
scheduleItemPath.addMethod("PATCH", scheduleLambdaIntegration);

scheduleParamsPath.addMethod("GET", scheduleParamsLambdaIntegration);
scheduleParamsPath.addMethod("POST", scheduleParamsLambdaIntegration);
scheduleParamsForEventPath.addMethod("GET", scheduleParamsLambdaIntegration);
scheduleParamsForTournamentPath.addMethod(
  "GET",
  scheduleParamsLambdaIntegration,
);
scheduleParamsForTournamentPath.addMethod(
  "PATCH",
  scheduleParamsLambdaIntegration,
);
scheduleParamsForTournamentPath.addMethod(
  "DELETE",
  scheduleParamsLambdaIntegration,
);

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

backend.addOutput({
  custom: {
    ApiDomain: {
      url: `https://api.global.kyleflynn.dev`,
      certificateArn: certificate.certificateArn,
    },
  },
});
