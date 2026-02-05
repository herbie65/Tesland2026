# Deploy: server database setup

## PostgreSQL on host (not in Docker)

The app container uses `network_mode: host` so it connects to the host DB at `127.0.0.1:5432`.

### Fix "permission denied for schema public" (PostgreSQL 15+)

Run once on the server as a PostgreSQL superuser (e.g. `postgres`):

```bash
# Option A: if you have postgres password
psql -h 127.0.0.1 -U postgres -d tesland_production -c "
  GRANT CREATE ON SCHEMA public TO tesland_user;
  GRANT USAGE ON SCHEMA public TO tesland_user;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO tesland_user;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO tesland_user;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO tesland_user;
"

# Option B: via sudo (peer auth)
sudo -u postgres psql -d tesland_production -c "
  GRANT CREATE ON SCHEMA public TO tesland_user;
  GRANT USAGE ON SCHEMA public TO tesland_user;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO tesland_user;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO tesland_user;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO tesland_user;
"
```

Then re-run the GitHub Actions workflow (Deploy to Hetzner) or push a commit to trigger deploy.
