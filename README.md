# Appeals migration

Code and services to support migrating appeals casework into the Manage appeals service.

## Getting started

To get started:

* install latest Node 22 LTS & npm
* run `npm ci` from project root
* run `docker compose up` from project root to start the local databases
* Copy `.env.example` to `.env` in each of the following directories:
  * apps/function/
  * packages/database/
  * packages/database-source/
  * packages/database-sink/
* run `npm run db-generate` to create the database client
* run `npm run db-migrate-dev` to create the database and tables
* run `npm run db-seed` to add test/seed data
* run `npm run db-manage-appeals-setup` to setup a manage appeals local database
* run `npm run db-odw-curated-setup` to setup the ODW local database
* Follow instructions in `apps/function/README.md` to run the functions