import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.STORAGE_BUCKET_NAME; // injected by Amplify
const FILE_KEY = "data/events.json";

async function readEvents() {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    return JSON.parse(body || "[]");
  } catch (err) {
    console.error("Error reading events:", err);
    return [];
  }
}

async function writeEvents(events: Record<string, unknown>[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(events, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler = async (event: any) => {
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : null;
  let events = await readEvents();

  switch (method) {
    case "GET":
      return { statusCode: 200, body: JSON.stringify(events) };

    case "POST":
      const newEvent = { id: uuid(), ...body };
      events.push(newEvent);
      await writeEvents(events);
      return { statusCode: 201, body: JSON.stringify(newEvent) };

    case "PUT":
      events = events.map((ev: any) =>
        ev.id === body.id ? { ...ev, ...body } : ev,
      );
      await writeEvents(events);
      return { statusCode: 200, body: JSON.stringify(body) };

    case "DELETE":
      events = events.filter((ev: any) => ev.id !== body.id);
      await writeEvents(events);
      return { statusCode: 200, body: JSON.stringify({ deleted: body.id }) };

    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
};
