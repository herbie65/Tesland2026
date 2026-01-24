# Local Development Database

## Start PostgreSQL
```bash
docker-compose up -d
```

## Stop PostgreSQL
```bash
docker-compose down
```

## View Logs
```bash
docker-compose logs -f postgres
```

## Reset Database (⚠️ Deletes all data)
```bash
docker-compose down -v
docker-compose up -d
npm run prisma:push
```

## Connection Details
- **Host**: localhost
- **Port**: 5432
- **User**: tesland_user
- **Password**: tesland_dev_password
- **Database**: tesland_dev

## DATABASE_URL
```
postgresql://tesland_user:tesland_dev_password@localhost:5432/tesland_dev?schema=public
```
