import { EventEmitter } from 'node:events';
import { AuthEventMap } from '../events/auth.events';
import type { AiEventMap } from '../events/ai.types';

// Every event name -> its listener arguments. Add other domains with `&`.
export type AppEventMap = AuthEventMap & AiEventMap;

// One typed emitter for the entire application
export const appEvents = new EventEmitter<AppEventMap>();

// Node warns at 11+ listeners per event. 20 is plenty for us.
appEvents.setMaxListeners(20);
