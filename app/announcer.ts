import { Client } from "https://deno.land/x/mysql/mod.ts";
import * as config from "../config.ts";
import { config as dotEnvConfig } from 'https://deno.land/x/dotenv@v1.0.1/mod.ts';
import * as emoji from "https://deno.land/x/emoji/mod.ts";
import { XmlEntities } from "https://deno.land/x/html_entities@v1.0/mod.js";

dotEnvConfig({ export: true, path: './.env'});

const env = Deno.env.toObject();
const client = await new Client();

let art19reqcounter = 0;

client.connect({
  hostname: env.MYSQL_HOSTNAME,
  username: env.MYSQL_USERNAME,
  password: env.MYSQL_PASSWORD,
  db: env.MYSQL_DB,
});

await client.execute(`USE ${config.DATABASE}`);

const allShows = await client.query(
  "SELECT * FROM shows"
);

const milestonesReached = await client.query(
  `SELECT a.id as milestone_id, b.id as show_id, b.title, a.value, b.total_listen_count, a.created_at FROM milestones a LEFT JOIN shows b ON a.show_id = b.id WHERE a.type = 'total_listen_count' AND b.total_listen_count >= a.value`
);

export async function announceShowTotals(show_milestone: any) {
    await postData(env.SLACK_WEBHOOK_URL, { text: `${show_milestone.title} heeft momenteel in totaal ${show_milestone.total_listen_count} beluisteringen ` }, false)
     .then(data => {
      if(data.status !== 200){
        console.log(data.status); // JSON data parsed by `data.json()` call
      }
     });
  }

export async function announceShowMilestoneReached(show: any) {
    await postData(env.SLACK_WEBHOOK_URL, { text: `:tada: ${show.title} heeft de Mijlpaal van ${show.value} beluisteringen gehaald!` }, false)
     .then(data => {
        if(data.status !== 200){
          console.log(data.status); // JSON data parsed by `data.json()` call
        }
     });
  }


export async function announceAllMilestones() {
    for (const show_milestone of milestonesReached) {
      await announceShowMilestoneReached(show_milestone).then(async function(){
        await announceShowTotals(show_milestone);
      });
    }
    console.log('All milestones announced');
    return true;
  }

  // Example POST method implementation:
export async function postData(url = '', data = {}, parseAsJson = true) {
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

    return response;
  }