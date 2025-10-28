import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { Tournament, tournamentZod } from "@toa-lib/models";
import { getDefaultHeaders } from "../../util/default-headers";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET = process.env.STORAGE_BUCKET_NAME!;
const FILE_KEY = "data/tournaments.json";

async function readTournaments(): Promise<Tournament[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return [];
    return tournamentZod.array().parse(JSON.parse(body));
  } catch (err) {
    console.error("Error reading tournaments:", err);
    return [];
  }
}

async function writeTournaments(tournaments: Tournament[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(tournaments, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const method = event.httpMethod;
  const tournaments = await readTournaments();

  switch (method) {
    case "GET":
      if (event.pathParameters?.eventKey) {
        const eventKey = event.pathParameters.eventKey;
        const filtered = tournaments.filter((t) => t.eventKey === eventKey);
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(tournaments),
        headers: { ...getDefaultHeaders() },
      };

    case "POST":
      const bodyArray = event.body
        ? tournamentZod.array().parse(JSON.parse(event.body))
        : null;
      if (!bodyArray) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing body",
          headers: { ...getDefaultHeaders() },
        };
      }

      tournaments.push(...bodyArray);
      await writeTournaments(tournaments);
      return {
        statusCode: 200,
        body: JSON.stringify(tournaments),
        headers: { ...getDefaultHeaders() },
      };

    case "PATCH":
      const body = event.body
        ? tournamentZod.parse(JSON.parse(event.body))
        : null;
      if (!body) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing body",
          headers: { ...getDefaultHeaders() },
        };
      }

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

      await writeTournaments(
        tournaments.map((t) =>
          t.eventKey === body.eventKey && t.tournamentKey === body.tournamentKey
            ? body
            : t,
        ),
      );
      return {
        statusCode: 200,
        body: JSON.stringify(body),
        headers: { ...getDefaultHeaders() },
      };

    case "DELETE":
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

      await writeTournaments(
        tournaments.filter(
          (t) =>
            !(t.eventKey === eventKey && t.tournamentKey === tournamentKey),
        ),
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          deleted: { eventKey, tournamentKey },
          headers: { ...getDefaultHeaders() },
        }),
      };

    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
};
