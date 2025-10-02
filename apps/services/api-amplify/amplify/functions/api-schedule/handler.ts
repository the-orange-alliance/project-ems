import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { ScheduleItem, scheduleItemZod } from "@toa-lib/models";
import { getDefaultHeaders } from "../../util/default-headers";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET = process.env.STORAGE_BUCKET_NAME!;
const FILE_KEY = "data/schedules.json";

async function readScheduleItems(): Promise<ScheduleItem[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return [];
    return scheduleItemZod.array().parse(JSON.parse(body));
  } catch (err) {
    console.error("Error reading schedule items:", err);
    return [];
  }
}

async function writeScheduleItems(scheduleItems: ScheduleItem[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(scheduleItems, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const method = event.httpMethod;
  const scheduleItems = await readScheduleItems();

  switch (method) {
    case "GET":
      // GET /:eventKey - Get all schedule items for event
      if (
        event.pathParameters?.eventKey &&
        !event.pathParameters?.tournamentKey
      ) {
        const eventKey = event.pathParameters.eventKey;
        const filtered = scheduleItems.filter(
          (item) => item.eventKey === eventKey,
        );
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET /:eventKey/:tournamentKey - Get schedule items for event/tournament
      if (
        event.pathParameters?.eventKey &&
        event.pathParameters?.tournamentKey
      ) {
        const eventKey = event.pathParameters.eventKey;
        const tournamentKey = event.pathParameters.tournamentKey;
        const filtered = scheduleItems.filter(
          (item) =>
            item.eventKey === eventKey && item.tournamentKey === tournamentKey,
        );
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET / - Get all schedule items
      return {
        statusCode: 200,
        body: JSON.stringify(scheduleItems),
        headers: { ...getDefaultHeaders() },
      };

    case "POST":
      // POST / - Insert schedule items (expects array)
      if (!event.body) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing body",
          headers: { ...getDefaultHeaders() },
        };
      }

      try {
        const body = scheduleItemZod.array().parse(JSON.parse(event.body));
        if (body.length === 0) {
          return {
            statusCode: 400,
            body: "Bad Request: Empty schedule items array",
            headers: { ...getDefaultHeaders() },
          };
        }

        // Add new schedule items to existing ones
        const updatedScheduleItems = [...scheduleItems, ...body];
        await writeScheduleItems(updatedScheduleItems);

        return {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: { ...getDefaultHeaders() },
        };
      } catch (error) {
        return {
          statusCode: 400,
          body: "Bad Request: Invalid schedule item data",
          headers: { ...getDefaultHeaders() },
        };
      }

    case "PATCH":
      // PATCH /:eventKey/:tournamentKey/:id - Update schedule item
      if (
        !event.pathParameters?.eventKey ||
        !event.pathParameters?.tournamentKey ||
        !event.pathParameters?.id
      ) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing eventKey, tournamentKey, or id",
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
        const body = scheduleItemZod.parse(JSON.parse(event.body));
        const { eventKey, tournamentKey, id } = event.pathParameters;

        const updatedScheduleItems = scheduleItems.map((item) =>
          item.eventKey === eventKey &&
          item.tournamentKey === tournamentKey &&
          item.id === Number(id)
            ? body
            : item,
        );

        await writeScheduleItems(updatedScheduleItems);

        return {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: { ...getDefaultHeaders() },
        };
      } catch (error) {
        return {
          statusCode: 400,
          body: "Bad Request: Invalid schedule item data",
          headers: { ...getDefaultHeaders() },
        };
      }

    case "DELETE":
      // DELETE /:eventKey/:tournamentKey - Delete schedule items for event/tournament
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

      const filteredScheduleItems = scheduleItems.filter(
        (item) =>
          !(item.eventKey === eventKey && item.tournamentKey === tournamentKey),
      );

      await writeScheduleItems(filteredScheduleItems);

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
