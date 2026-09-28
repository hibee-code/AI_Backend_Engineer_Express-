import { app } from './app';
//import { registerAuthEventListeners } from './events/auth.events';
import { config } from './lib/config';
import { logger } from './lib/logger';

//registerAuthEventListeners();

const PORT = config.PORT;
app.listen(PORT, () => {
  logger.info({
    event: 'server:started',
    port: PORT,
    environment: config.NODE_ENV,
  });
});
