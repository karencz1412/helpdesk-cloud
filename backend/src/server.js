import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { ticketsRouter } from './routes/tickets.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { metricsMiddleware, register } from './metrics.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use(metricsMiddleware);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'helpdesk-backend' }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

app.listen(env.port, () => console.log(`HelpDesk API en puerto ${env.port}`));
