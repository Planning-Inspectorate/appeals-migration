# Appeals migration

Code and services to support migrating appeals casework into the Manage appeals service.

## Getting started

To get started:

* install latest Node LTS & npm
* run `npm ci` from project root
* run `docker compose up` from project root to start a database
* Copy `packages/database/.env.example` to `packages/database/.env`
* Copy `apps/function/.env.example` to `apps/function/.env`
* run `npm run db-generate` to create the database client
* run `npm run db-migrate-dev` to create the database and tables
* run `npm run db-seed` to add test/seed data
* Follow instructions in `apps/function/README.md` to run the functions