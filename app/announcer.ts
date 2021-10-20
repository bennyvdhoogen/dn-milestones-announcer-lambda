import { Client } from "https://deno.land/x/mysql/mod.ts";
import * as config from "../config.ts";
import * as httpClient from "./httpClient.ts";
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
  `SELECT a.id as milestone_id, a.announced_at, b.id as show_id, b.title, a.value, b.total_listen_count, a.created_at, (SELECT MAX(value) FROM milestones c WHERE c.show_id = a.show_id AND announced_at IS NOT NULL)  as max_announced FROM milestones a LEFT JOIN shows b ON a.show_id = b.id WHERE a.type = 'total_listen_count' AND b.total_listen_count >= a.value AND a.announced_at IS NULL HAVING (a.value > max_announced OR max_announced IS NULL) ORDER BY a.value DESC;`
);

export async function announceShowTotals(show_milestone: any) {
    const value_formatted = new Intl.NumberFormat('nl-NL').format(show_milestone.total_listen_count);
    await httpClient.postData(env.SLACK_WEBHOOK_URL, { text: `${show_milestone.title} heeft momenteel in totaal ${value_formatted} beluisteringen ` }, false)
     .then(data => {
      if(data.status !== 200){
        console.log(data.status); // JSON data parsed by `data.json()` call
      }
     });
  }

export async function announceShowMilestoneReached(show_milestone: any) {
    const value_formatted = new Intl.NumberFormat('nl-NL').format(show_milestone.value);
    await httpClient.postData(env.SLACK_WEBHOOK_URL, { text: `:tada: ${show_milestone.title} heeft de Mijlpaal van ${value_formatted} beluisteringen gehaald!` }, false)
     .then(async function(data) {
        if(data.status === 200){
          await client.execute(`
            UPDATE milestones SET announced_at = NOW() WHERE id = '${show_milestone.milestone_id}';
          `);
        } else {
          console.log(data);
        }
     });
  }


export async function announceAllMilestones() {
    let milestonesAnnouncedInSession: Array<Int16Array> = [];
    for (const show_milestone of milestonesReached) {
      if(!milestonesAnnouncedInSession.includes(show_milestone.show_id)){
        await announceShowMilestoneReached(show_milestone).then(async function(){
          await announceShowTotals(show_milestone);
          milestonesAnnouncedInSession.push(show_milestone.show_id);
        });
      }
    }
    console.log('All milestones announced');
    return true;
  }
