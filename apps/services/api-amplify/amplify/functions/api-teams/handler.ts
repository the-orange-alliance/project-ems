import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { Team, teamZod } from "@toa-lib/models";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET = process.env.STORAGE_BUCKET_NAME!;
const FILE_KEY = "data/events.json";

async function readTeams(): Promise<Team[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return [];
    return teamZod.array().parse(JSON.parse(body));
  } catch (err) {
    console.error("Error reading events:", err);
    return [];
  }
}

async function writeTeams(teams: Team[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(teams, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const method = event.httpMethod;
  const body = event.body ? teamZod.parse(JSON.parse(event.body)) : null;
  const teams = await readTeams();
  switch (method) {
    case "GET":
      return { statusCode: 200, body: JSON.stringify(teams) };

    case "POST":
      if (!body) {
        return { statusCode: 400, body: "Bad Request: Missing body" };
      }

      teams.push(body);
      await writeTeams(teams);
      return { statusCode: 200, body: JSON.stringify(teams) };

    case "PUT":
      if (!body) {
        return { statusCode: 400, body: "Bad Request: Missing body" };
      }

      if (!event.pathParameters?.eventKey || !event.pathParameters?.teamKey) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing eventKey or teamKey",
        };
      }

      await writeTeams(
        teams.map((ev) =>
          ev.eventKey === body.eventKey && ev.teamKey === body.teamKey
            ? body
            : ev,
        ),
      );
      return { statusCode: 200, body: JSON.stringify(body) };

    case "DELETE":
      if (!event.pathParameters?.eventKey || !event.pathParameters?.teamKey) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing eventKey or teamKey",
        };
      }

      const eventKey = event.pathParameters.eventKey;
      const teamKey = event.pathParameters.teamKey;

      await writeTeams(
        teams.filter(
          (ev) => ev.eventKey !== eventKey && ev.teamKey !== Number(teamKey),
        ),
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ deleted: { eventKey, teamKey } }),
      };

    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
};
