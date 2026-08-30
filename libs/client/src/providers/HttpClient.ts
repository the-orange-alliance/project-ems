import { ZodType } from 'zod';
import { HttpError } from '../types/HttpError.js';

type ResponseType = 'json' | 'blob' | 'arrayBuffer' | 'text';

/**
 * HTTP client request options.
 */
export interface RequestOptions<T> {
  /** HTTP method for the request */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body for the HTTP request */
  body?: unknown;
  /** HTTP headers for the request */
  headers?: HeadersInit;
  /** Query parameters for the request */
  query?: Record<string, string | number | boolean | undefined>;
  /** Zod schema for validating the response */
  schema?: ZodType<T>;
  /** Expected response type for the HTTP request - some of our endpoints may return different types of data */
  responseType?: ResponseType;
}

/**
 * HTTP client configuration.
 */
export interface ClientConfig<TError = unknown> {
  /** Backend to be used for the HTTP client */
  baseUrl: string;
  /** Function to get default headers for the HTTP client, such as authorization */
  getDefaultHeaders?: () => Promise<HeadersInit> | HeadersInit;
  /** Callback for handling response errors */
  onResponseError?: (error: HttpError<TError>) => void;
  /** Function to extract error message from the error payload */
  getErrorMessage: (payload: TError) => string;
  /** Zod schema for validating the error response */
  errorSchema?: ZodType<TError>;
}

export class HttpClient<TError = unknown> {
  private baseUrl: string;

  constructor(private config: ClientConfig<TError>) {
    this.baseUrl = config.baseUrl;
  }

  public setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private static async getResponseFromType(
    type: ResponseType,
    response: Response
  ): Promise<unknown> {
    try {
      switch (type) {
        case 'json':
          return await response.json();
        case 'blob':
          return await response.blob();
        case 'arrayBuffer':
          return await response.arrayBuffer();
        case 'text':
          return await response.text();
        default:
          return await response.json();
      }
    } catch (error) {
      console.error(
        `[ResponseParseError] Failed to parse response for endpoint: ${response.url}`,
        { error }
      );
      throw error;
    }
  }

  public async request<T = unknown>(
    endpoint: string,
    options: RequestOptions<T> = {}
  ): Promise<T | null> {
    const { method = 'GET', headers, query, body, schema } = options;

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined) url.searchParams.append(key, String(val));
      });
    }

    const defaultHeaders = this.config.getDefaultHeaders
      ? await this.config.getDefaultHeaders()
      : {};

    const response = await fetch(url.toString(), {
      method,
      headers: new Headers({
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...defaultHeaders,
        ...headers
      }),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      let rawPayload: unknown;
      try {
        rawPayload = await response.json();
      } catch (e) {
        rawPayload = {
          error: {
            message: e instanceof Error ? e.message : 'Unknown network error'
          }
        };
      }

      let parsedPayload: TError;
      if (this.config.errorSchema) {
        // Notice the use of safeParse here. This allows us to gracefully handle cases
        // where the backend returns an unexpected error format, without throwing an exception.
        const parseResult = this.config.errorSchema.safeParse(rawPayload);
        parsedPayload = parseResult.success
          ? parseResult.data
          : (rawPayload as TError);
      } else {
        parsedPayload = rawPayload as TError;
      }

      const errorMessage = this.config.getErrorMessage(parsedPayload);
      const httpError = new HttpError<TError>(
        response,
        parsedPayload,
        errorMessage
      );

      if (this.config.onResponseError) {
        this.config.onResponseError(httpError);
      }
      throw httpError;
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    const res: unknown = await HttpClient.getResponseFromType(
      options.responseType ?? 'json',
      response
    );
    let data: unknown = res;

    if (schema) {
      try {
        data = schema.parse(res);
      } catch (zodError) {
        console.error(`[ZodParseError] ${endpoint}`, { res, zodError });
        throw zodError;
      }
    }

    return data as T;
  }

  public async get<T = unknown>(
    endpoint: string,
    options: Omit<RequestOptions<T>, 'method'> = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options
    });
  }

  public async post<T = unknown>(
    endpoint: string,
    options: Omit<RequestOptions<T>, 'method'> = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...options
    });
  }

  public async put<T = unknown>(
    endpoint: string,
    options: Omit<RequestOptions<T>, 'method'> = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      ...options
    });
  }

  public async delete<T = unknown>(
    endpoint: string,
    options: Omit<RequestOptions<T>, 'method'> = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  public async patch<T = unknown>(
    endpoint: string,
    options: Omit<RequestOptions<T>, 'method'> = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      ...options
    });
  }
}
