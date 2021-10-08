import * as announcer from './app/announcer.ts';
import * as forecaster from './app/forecaster.ts';

await announcer.announceAllMilestones();
await forecaster.announceUpcomingMilestones();
