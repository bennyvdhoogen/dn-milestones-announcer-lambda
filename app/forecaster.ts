import { Client } from "https://deno.land/x/mysql/mod.ts";
import * as config from "../config.ts";
import * as httpClient from "./httpClient.ts";
import { config as dotEnvConfig } from 'https://deno.land/x/dotenv@v1.0.1/mod.ts';
import * as emoji from "https://deno.land/x/emoji/mod.ts";
import { XmlEntities } from "https://deno.land/x/html_entities@v1.0/mod.js";

dotEnvConfig({ export: true, path: './.env'});

const env = Deno.env.toObject();
const client = await new Client();

client.connect({
  hostname: env.MYSQL_HOSTNAME,
  username: env.MYSQL_USERNAME,
  password: env.MYSQL_PASSWORD,
  db: env.MYSQL_DB,
});

await client.execute(`USE ${config.DATABASE}`);
//await client.execute(`SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));`);
// Not allowed in Amazon RDS

export async function getAverageDailyIncrease(){
  const min_amount_of_measurements = 7;
  const averageDailyIncreasePerShow = await client.query(
    `SELECT AVG(count) as average_daily_increase, COUNT(show_id) as amount_days_measured, show_id FROM aggregates WHERE type = 'show_listen_count_daily_increase' GROUP BY show_id HAVING amount_days_measured >= ${min_amount_of_measurements}`
  );
  return averageDailyIncreasePerShow;
}

export async function getNextMilestoneByShow(show_id: number){
  const next_milestone = await client.query(
      `SELECT a.id, a.show_id, b.title AS show_title, a.type, a.value as next_milestone_value, b.total_listen_count as current_count FROM milestones a LEFT JOIN shows b ON a.show_id = b.id WHERE reached_at = '0000-00-00' AND show_id = ${show_id} GROUP BY show_id ORDER BY value ASC `
  );
  return next_milestone[0];
}

export async function announceForecastToSlack(daily_aggregate: any, nextMilestone: any, amountOfDaysEstimate: number){
  const amountOfDaysEstimateFormatted = Math.ceil(amountOfDaysEstimate);
  const next_milestone_value_formatted = new Intl.NumberFormat('nl-NL').format(nextMilestone.next_milestone_value);
  await httpClient.postData(env.SLACK_WEBHOOK_URL, { text: `${nextMilestone.show_title} gaat over ongeveer ${amountOfDaysEstimateFormatted} dagen de mijlpaal van ${next_milestone_value_formatted} beluisteringen behalen! ` }, false)
     .then(data => {
      if(data.status !== 200){
        console.log(data.status); // JSON data parsed by `data.json()` call
      }
     });
}

export async function announceUpcomingMilestones() {
    console.log('Calculating time to next milestones..');

    for (const daily_aggregate of await getAverageDailyIncrease()) {
      console.log(daily_aggregate);
      const nextMilestone = await getNextMilestoneByShow(daily_aggregate.show_id);
      console.log(nextMilestone);
      if (nextMilestone) {
        const remainingCount = nextMilestone.next_milestone_value - nextMilestone.current_count;
        const amountOfDaysEstimate = remainingCount / daily_aggregate.average_daily_increase;
        console.log(`Show (${daily_aggregate.show_id}) will reach the next milestone (${nextMilestone.next_milestone_value}) in ${amountOfDaysEstimate} days`);
        if (amountOfDaysEstimate < 7){
          await announceForecastToSlack(daily_aggregate, nextMilestone, amountOfDaysEstimate);
        }
      }
    }
    console.log('All milestone forecasts calculated');
    return true;
  }
