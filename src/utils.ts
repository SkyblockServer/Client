import { join } from 'path';
import { API_HOST, Endpoints } from './constants';

export function getURL(endpoint: keyof typeof Endpoints, ws = false): string {
  let url = join(API_HOST, Endpoints[endpoint]);

  if (ws) url = url.replace('http', 'ws');

  return url;
}
