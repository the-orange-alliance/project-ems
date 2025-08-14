import z from "zod";
import * as EMSModels from "@toa-lib/models";
import { ApiErrorZod } from "./Errors.js";

// Generic
export const EventKeyParams = z.object({ eventKey: z.string() });
export const EventTournamentKeyParams = z.object({ eventKey: z.string(), tournamentKey: z.string() });
export const EventTournamentIdParams = z.object({ eventKey: z.string(), tournamentKey: z.string(), id: z.string() });
export const EventTournamentTeamKeyParams = z.object({ eventKey: z.string(), tournamentKey: z.string(), teamKey: z.string() });
export const EventTournamentRankParams = z.object({ eventKey: z.string(), tournamentKey: z.string(), rank: z.string() });
export const EmptySchema = z.object({});
export const SuccessSchema = z.object({ success: z.boolean() });

// Teams
export const EventTeamKeyParams = z.object({ eventKey: z.string(), teamKey: z.string() });

// EMSModels is a collection of schemas, types, and interfaces. We can only accept zod schemas, so lets select them
function extractZodSchemas(obj: any): Record<string, z.ZodTypeAny> {
    const schemas: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof z.ZodType) {
            schemas[key] = value;
        } else if (typeof value === "object" && value !== null) {
            const nested = extractZodSchemas(value);
            for (const [nestedKey, nestedValue] of Object.entries(nested)) {
                schemas[`${key}.${nestedKey}`] = nestedValue;
            }
        }
    }

    // Capatilize the keys and remove "Zod" suffix
    const capitalizedSchemas: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(schemas)) {
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/Zod$/, '');
        capitalizedSchemas[capitalizedKey] = value;
    }

    return capitalizedSchemas;
}

export const EMSModelsSchemas = extractZodSchemas(EMSModels);

const SchemaRef: Record<string, z.ZodTypeAny> = {
    EventKeyParams,
    EventTournamentKeyParams,
    EventTournamentIdParams,
    EventTournamentTeamKeyParams,
    EventTournamentRankParams,
    EmptySchema,
    EventTeamKeyParams,
    SuccessSchema,
    ApiError: ApiErrorZod,

    // EMS-Lib schemas
    ...EMSModelsSchemas
}

export default SchemaRef;