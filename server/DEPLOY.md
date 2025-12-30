# Deployment notes — Elastic Beanstalk (single-instance MVP)

Quick guide to deploy the `server/` app to AWS Elastic Beanstalk for an initial public launch.

Environment variables
- `PORT` (optional) — EB sets this automatically; default 4000 locally.
- `CLIENT_URL` — URL allowed for CORS / socket origins (e.g. `https://app.example.com`).
- `REDIS_URL` — Optional. When present, the server enables the Socket.IO Redis adapter and uses Redis pub/sub for multi-instance scaling. Example: `redis://:password@your-redis-endpoint:6379`.
- `NODE_ENV` — `production` on EB.

Health check
- The server exposes `/health` which returns JSON `{ status: 'ok', uptime, env, rooms, timestamp }`.
- Configure EB health check path to `/health`.

Graceful shutdown
- The server listens for `SIGTERM` and `SIGINT`, performs `server.close()` and `io.close()`, quits Redis clients, and forces exit after 30s.
- EB will send `SIGTERM` when stopping/terminating instances — this behavior supports draining connections.

WebSocket / ALB notes
- Use an Application Load Balancer (ALB) for websockets. Ensure the listener and target group have appropriate idle timeouts (larger than typical round durations), and health checks point to `/health`.
- For multi-instance scaling, do NOT rely on in-memory room state. Use Redis + `REDIS_URL` to enable `@socket.io/redis-adapter`.
- Sticky sessions are a stopgap; prefer Redis adapter for correctness.

Redis recommendation
- For production scaling, provision an AWS ElastiCache Redis cluster (single-node for start, upgrade to cluster mode later).
- Set `REDIS_URL` in EB environment to the Redis endpoint (include password if used).

Start script
- `server/package.json` has `start: node index.js` which EB will use by default.

Deployment checklist
1. Create EB application & environment (Node.js platform).  
2. Configure environment variables: `CLIENT_URL`, `REDIS_URL` (if available).  
3. Set health check path to `/health`.  
4. Upload code (zip) or use EB CLI / Git integration.  
5. Monitor logs. If you scale to >1 instance, enable Redis and set `REDIS_URL`.

Troubleshooting
- If socket connections are failing behind ALB, confirm ALB supports WebSockets and that target group's protocol is TCP or HTTP with sticky sessions disabled if you're using Redis.
- Increase ALB idle timeout if connections are dropped prematurely.

Notes
- This guide aims for minimal operational friction for an MVP. When you need HA and horizontal scaling, add ElastiCache Redis and ensure the `REDIS_URL` is set before scaling.
