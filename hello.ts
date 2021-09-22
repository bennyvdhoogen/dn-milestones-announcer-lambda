import { Client } from "https://deno.land/x/mysql/mod.ts";
import { DATABASE, TABLE } from "./config.ts";
import { config as dotEnvConfig } from 'https://deno.land/x/dotenv@v1.0.1/mod.ts';

dotEnvConfig({ export: true });

const env = Deno.env.toObject();
const slack_webhook_url = env.SLACK_WEBHOOK_URL;

const client = await new Client();
client.connect({
  hostname: env.MYSQL_HOSTNAME,
  username: env.MYSQL_USERNAME,
  password: env.MYSQL_PASSWORD,
  db: env.MYSQL_DB,
});
await client.execute(`USE ${DATABASE}`);

const allShows = await client.query(
  "SELECT * FROM shows"
);

const milestonesReached = await client.query(
  `SELECT a.id as milestone_id, b.id as show_id, b.title, a.value, b.total_listen_count, a.created_at FROM milestones a LEFT JOIN shows b ON a.show_id = b.id WHERE a.type = 'total_listen_count' AND b.total_listen_count >= a.value`
);


async function announceShowTotals(show_milestone: any) {
  postData(env.SLACK_WEBHOOK_URL, { text: `${show_milestone.title} heeft momenteel in totaal ${show_milestone.total_listen_count} beluisteringen ` }, false)
   .then(data => {
     console.log(data); // JSON data parsed by `data.json()` call
   });
}

async function announceShowMilestoneReached(show: any) {
  postData(env.SLACK_WEBHOOK_URL, { text: `:tada: ${show.title} heeft de Mijlpaal van ${show.value} beluisteringen gehaald!` }, false)
   .then(data => {
     console.log(data); // JSON data parsed by `data.json()` call
   });
}


async function announceAllMilestones() {
  for (const show_milestone of milestonesReached) {
    announceShowMilestoneReached(show_milestone).then(function(){
      setTimeout(function(){
        announceShowTotals(show_milestone)
      },500);
    });
  }

  return true;
}

console.log(allShows);

// Example POST method implementation:
async function postData(url = '', data = {}, parseAsJson = true) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });

  if (parseAsJson) {
    return response.json(); // parses JSON response into native JavaScript objects
  }

  console.log(response);

  return response;
}

// postData(env.SLACK_WEBHOOK_URL, { text: "hello world" })
//   .then(data => {
//     console.log(data); // JSON data parsed by `data.json()` call
//   });


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

  await announceAllMilestones();

  return {
    statusCode: 200,
    headers: { "content-type": "text/html;charset=utf8" },
    body: `Welcome to deno ${Deno.version.deno} 🦕 | D&N ShowTotals Announcer`,
  };
}
