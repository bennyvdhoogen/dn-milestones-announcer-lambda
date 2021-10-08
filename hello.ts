import * as announcer from './app/announcer.ts';
import * as forecaster from './app/forecaster.ts';

import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "../runtime/mod.ts";

// deno-lint-ignore require-await
export async function handler(
  _event: APIGatewayProxyEventV2,
  _context: Context,
): Promise<APIGatewayProxyResultV2> {

  await announcer.announceAllMilestones();
  await forecaster.announceUpcomingMilestones();

  return {
    statusCode: 200,
    headers: { "content-type": "text/html;charset=utf8" },
    body: `Welcome to deno ${Deno.version.deno} 🦕 | D&N ShowTotals Announcer`,
  };
}
