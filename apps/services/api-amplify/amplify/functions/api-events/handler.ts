import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { Event, eventZod } from "@toa-lib/models";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET =
  "amplify-dt9tnqan5956b-onl-emsonlinestoragebucketea-zuaqdjvdwmlx"; // injected by Amplify
const FILE_KEY = "data/events.json";

async function readEvents(): Promise<Event[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return [];
    return eventZod.array().parse(JSON.parse(body));
  } catch (err) {
    console.error("Error reading events:", err);
    return [];
  }
}

async function writeEvents(events: Event[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(events, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const method = event.httpMethod;
  const body = event.body ? eventZod.parse(JSON.parse(event.body)) : null;
  const events = await readEvents();
  switch (method) {
    case "GET":
      return { statusCode: 200, body: JSON.stringify(events) };

    case "POST":
      if (!body) {
        return { statusCode: 400, body: "Bad Request: Missing body" };
      }

      events.push(body);
      await writeEvents(events);
      return { statusCode: 200, body: JSON.stringify(events) };

    case "PUT":
      if (!body) {
        return { statusCode: 400, body: "Bad Request: Missing body" };
      }

      if (!event.pathParameters?.eventKey) {
        return { statusCode: 400, body: "Bad Request: Missing eventKey" };
      }

      await writeEvents(
        events.map((ev) => (ev.eventKey === body.eventKey ? body : ev)),
      );
      return { statusCode: 200, body: JSON.stringify(body) };

    case "DELETE":
      if (!event.pathParameters?.eventKey) {
        return { statusCode: 400, body: "Bad Request: Missing eventKey" };
      }

      const eventKey = event.pathParameters.eventKey;

      await writeEvents(events.filter((ev) => ev.eventKey !== eventKey));
      return { statusCode: 200, body: JSON.stringify({ deleted: eventKey }) };

    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
};
