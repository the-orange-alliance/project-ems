export function requestFGC(
  path: string,
  options: RequestInit,
  token: string
): Promise<Response> {
  return fetch(`https://api.first.global${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    mode: 'no-cors'
  });
}
