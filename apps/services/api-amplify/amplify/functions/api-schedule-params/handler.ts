import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { ScheduleParams, defaultScheduleParams } from "@toa-lib/models";
import { getDefaultHeaders } from "../../util/default-headers";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET = process.env.STORAGE_BUCKET_NAME!;
const FILE_KEY = "data/schedule-params.json";

async function readScheduleParams(): Promise<ScheduleParams[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return [];
    return JSON.parse(body) as ScheduleParams[];
  } catch (err) {
    console.error("Error reading schedule params:", err);
    return [];
  }
}

async function writeScheduleParams(scheduleParams: ScheduleParams[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(scheduleParams, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const method = event.httpMethod;
  const scheduleParams = await readScheduleParams();

  switch (method) {
    case "GET":
      // GET /:eventKey - Get all schedule params for event
      if (
        event.pathParameters?.eventKey &&
        !event.pathParameters?.tournamentKey
      ) {
        const eventKey = event.pathParameters.eventKey;
        const filtered = scheduleParams.filter(
          (param) => param.eventKey === eventKey,
        );
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET /:eventKey/:tournamentKey - Get schedule params for event/tournament
      if (
        event.pathParameters?.eventKey &&
        event.pathParameters?.tournamentKey
      ) {
        const eventKey = event.pathParameters.eventKey;
        const tournamentKey = event.pathParameters.tournamentKey;
        const found = scheduleParams.find(
          (param) =>
            param.eventKey === eventKey &&
            param.tournamentKey === tournamentKey,
        );

        if (!found) {
          // Return default params with eventKey and tournamentKey set
          const defaultParams = {
            ...defaultScheduleParams,
            eventKey,
            tournamentKey,
          };
          return {
            statusCode: 200,
            body: JSON.stringify(defaultParams),
            headers: { ...getDefaultHeaders() },
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(found),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET / - Get all schedule params (not in Fastify controller, but keeping for completeness)
      return {
        statusCode: 200,
        body: JSON.stringify(scheduleParams),
        headers: { ...getDefaultHeaders() },
      };

    case "POST":
      // POST / - Insert schedule params (expects array)
      if (!event.body) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing body",
          headers: { ...getDefaultHeaders() },
        };
      }

      try {
        const body = JSON.parse(event.body) as ScheduleParams[];
        if (!Array.isArray(body) || body.length === 0) {
          return {
            statusCode: 400,
            body: "Bad Request: Invalid schedule params array",
            headers: { ...getDefaultHeaders() },
          };
        }

        // Add new schedule params to existing ones
        const updatedScheduleParams = [...scheduleParams, ...body];
        await writeScheduleParams(updatedScheduleParams);

        return {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: { ...getDefaultHeaders() },
        };
      } catch (error) {
        return {
          statusCode: 400,
          body: "Bad Request: Invalid schedule params data",
          headers: { ...getDefaultHeaders() },
        };
      }

    case "PATCH":
      // PATCH /:eventKey/:tournamentKey - Update/upsert schedule params
      if (
        !event.pathParameters?.eventKey ||
        !event.pathParameters?.tournamentKey
      ) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing eventKey or tournamentKey",
          headers: { ...getDefaultHeaders() },
        };
      }

      if (!event.body) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing body",
          headers: { ...getDefaultHeaders() },
        };
      }

      try {
        const body = JSON.parse(event.body) as ScheduleParams;
        const { eventKey, tournamentKey } = event.pathParameters;

        // Find existing param or create new one
        const existingIndex = scheduleParams.findIndex(
          (param) =>
            param.eventKey === eventKey &&
            param.tournamentKey === tournamentKey,
        );

        let updatedScheduleParams: ScheduleParams[];
        if (existingIndex >= 0) {
          // Update existing
          updatedScheduleParams = scheduleParams.map((param, index) =>
            index === existingIndex ? body : param,
          );
        } else {
          // Insert new
          updatedScheduleParams = [...scheduleParams, body];
        }

        await writeScheduleParams(updatedScheduleParams);

        return {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: { ...getDefaultHeaders() },
        };
      } catch (error) {
        return {
          statusCode: 400,
          body: "Bad Request: Invalid schedule params data",
          headers: { ...getDefaultHeaders() },
        };
      }

    case "DELETE":
      // DELETE /:eventKey/:tournamentKey - Delete schedule params for event/tournament
      if (
        !event.pathParameters?.eventKey ||
        !event.pathParameters?.tournamentKey
      ) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing eventKey or tournamentKey",
          headers: { ...getDefaultHeaders() },
        };
      }

      const eventKey = event.pathParameters.eventKey;
      const tournamentKey = event.pathParameters.tournamentKey;

      const filteredScheduleParams = scheduleParams.filter(
        (param) =>
          !(
            param.eventKey === eventKey && param.tournamentKey === tournamentKey
          ),
      );

      await writeScheduleParams(filteredScheduleParams);

      return {
        statusCode: 200,
        body: JSON.stringify({}),
        headers: { ...getDefaultHeaders() },
      };

    default:
      return {
        statusCode: 405,
        body: "Method Not Allowed",
        headers: { ...getDefaultHeaders() },
      };
  }
};
