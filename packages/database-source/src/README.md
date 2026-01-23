# Source Database

The source database is the ODW (Operational Data Warehouse) system. The curated layer can be accessed over a SQL interface. The tables are in the format of the [data model schemas](https://github.com/Planning-Inspectorate/data-model/tree/main/schemas).

For local development, a source database schema is provided. If the data-model is updated, then the schema will need to be updated. This can be done with `npm run generate-schema`, which will read from the ODW database schema definition table (see comments in the file for more details).

## Get started

Ensure you have a `.env` file setup in `packages/database-source`, the `.env.example` contents will work for local development.

To get started, after running `docker compose up` from root, then run:

`packages/database-source> npm run dev-setup`