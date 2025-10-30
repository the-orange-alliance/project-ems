import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { getDefaultHeaders } from "../../util/default-headers";
import { Match, MatchParticipant } from "@toa-lib/models";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET = process.env.STORAGE_BUCKET_NAME!;
const FILE_KEY = "data/matches.json";

async function readMatches(): Promise<Match<any>[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: FILE_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return [];
    const json = JSON.parse(body);
    return Array.isArray(json) ? (json as Match<any>[]) : [];
  } catch (err) {
    console.error("Error reading matches:", err);
    return [];
  }
}

async function writeMatches(matches: Match<any>[]) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: FILE_KEY,
      Body: JSON.stringify(matches, null, 2),
      ContentType: "application/json",
    }),
  );
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
) => {
  const method = event.httpMethod;
  const matches = await readMatches();

  switch (method) {
    case "GET": {
      const p = event.pathParameters;
      const path = event.path || "";

      // GET /participants/:eventKey
      if (path.includes("/participants/") && p?.eventKey) {
        const all = matches.filter((m) => m.eventKey === p.eventKey);
        const participants = all.flatMap((m) => m.participants || []);
        return {
          statusCode: 200,
          body: JSON.stringify(participants),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET /all/:eventKey/:tournamentKey/:id (return single match with participants; no details)
      if (path.includes("/all/") && p?.eventKey && p?.tournamentKey && p?.id) {
        const id = Number(p.id);
        const found = matches.find(
          (m) =>
            m.eventKey === p.eventKey &&
            m.tournamentKey === p.tournamentKey &&
            m.id === id,
        );
        return {
          statusCode: found ? 200 : 404,
          body: JSON.stringify(found ?? {}),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET /:eventKey/:tournamentKey/:id
      if (p?.eventKey && p?.tournamentKey && p?.id) {
        const id = Number(p.id);
        const filtered = matches.filter(
          (m) =>
            m.eventKey === p.eventKey &&
            m.tournamentKey === p.tournamentKey &&
            m.id === id,
        );
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET /:eventKey/:tournamentKey
      if (p?.eventKey && p?.tournamentKey) {
        const filtered = matches.filter(
          (m) =>
            m.eventKey === p.eventKey && m.tournamentKey === p.tournamentKey,
        );
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET /:eventKey
      if (p?.eventKey) {
        const filtered = matches.filter((m) => m.eventKey === p.eventKey);
        return {
          statusCode: 200,
          body: JSON.stringify(filtered),
          headers: { ...getDefaultHeaders() },
        };
      }

      // GET / - all matches
      return {
        statusCode: 200,
        body: JSON.stringify(matches),
        headers: { ...getDefaultHeaders() },
      };
    }

    case "POST": {
      // POST /:eventKey - Insert matches (expects array of matches with optional participants)
      if (!event.body) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing body",
          headers: { ...getDefaultHeaders() },
        };
      }
      try {
        const payload = JSON.parse(event.body);
        const items: Match<any>[] = Array.isArray(payload)
          ? payload
          : [payload];
        if (items.length === 0) {
          return {
            statusCode: 400,
            body: "Bad Request: Empty matches array",
            headers: { ...getDefaultHeaders() },
          };
        }

        const updated = [...matches, ...items];
        await writeMatches(updated);
        return {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: { ...getDefaultHeaders() },
        };
      } catch (e) {
        return {
          statusCode: 400,
          body: "Bad Request: Invalid match data",
          headers: { ...getDefaultHeaders() },
        };
      }
    }

    case "PATCH": {
      const p = event.pathParameters;
      if (!p?.eventKey || !p?.tournamentKey || !p?.id) {
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

      // PATCH participants route: /participants/:eventKey/:tournamentKey/:id
      if ((event.path || "").includes("/participants/")) {
        try {
          const incoming: MatchParticipant[] = JSON.parse(event.body);
          const id = Number(p.id);
          const updated = matches.map((m) => {
            if (
              m.eventKey === p.eventKey &&
              m.tournamentKey === p.tournamentKey &&
              m.id === id
            ) {
              const existing = m.participants ?? [];
              // Update by station (like Fastify controller)
              const byStation = new Map<number, MatchParticipant>();
              for (const part of existing) byStation.set(part.station, part);
              for (const part of incoming) {
                const copy = { ...part } as MatchParticipant;
                // Remove any nested team field if present
                // @ts-ignore
                if ((copy as any).team) delete (copy as any).team;
                byStation.set(copy.station, {
                  ...byStation.get(copy.station),
                  ...copy,
                });
              }
              m.participants = Array.from(byStation.values()).sort(
                (a, b) => a.station - b.station,
              );
            }
            return m;
          });
          await writeMatches(updated);
          return {
            statusCode: 200,
            body: JSON.stringify({}),
            headers: { ...getDefaultHeaders() },
          };
        } catch (e) {
          return {
            statusCode: 400,
            body: "Bad Request: Invalid participant data",
            headers: { ...getDefaultHeaders() },
          };
        }
      }

      // General match update (ignore details and participants on this route)
      try {
        const incoming: Match<any> = JSON.parse(event.body);
        const id = Number(p.id);
        const updated = matches.map((m) => {
          if (
            m.eventKey === p.eventKey &&
            m.tournamentKey === p.tournamentKey &&
            m.id === id
          ) {
            const { participants, ...rest } = incoming as any;
            return { ...m, ...rest };
          }
          return m;
        });
        await writeMatches(updated);
        return {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: { ...getDefaultHeaders() },
        };
      } catch (e) {
        return {
          statusCode: 400,
          body: "Bad Request: Invalid match data",
          headers: { ...getDefaultHeaders() },
        };
      }
    }

    case "DELETE": {
      const p = event.pathParameters;
      if (!p?.eventKey || !p?.tournamentKey) {
        return {
          statusCode: 400,
          body: "Bad Request: Missing eventKey or tournamentKey",
          headers: { ...getDefaultHeaders() },
        };
      }
      const filtered = matches.filter(
        (m) =>
          !(m.eventKey === p.eventKey && m.tournamentKey === p.tournamentKey),
      );
      await writeMatches(filtered);
      return {
        statusCode: 200,
        body: JSON.stringify({}),
        headers: { ...getDefaultHeaders() },
      };
    }

    default:
      return {
        statusCode: 405,
        body: "Method Not Allowed",
        headers: { ...getDefaultHeaders() },
      };
  }
};
