/**
 * Custom error class for HTTP errors.
 * @template TError - The type of the error payload. This will depend on the back-end service you are calling.
 * For example, if you are calling the Annotations API, you would use the AnnotationsBackEndError type.
 */
export class HttpError<TError = unknown> extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;
  public readonly payload: TError;
  constructor(response: Response, payload: TError, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
    this.payload = payload;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
