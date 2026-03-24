# Sink Database

The sink database is the Manage appeals system. The schema is here: [schema.prisma](https://github.com/Planning-Inspectorate/appeals-back-office/blob/main/appeals/api/src/database/schema.prisma).

For local development, a sink database is created using that referenced schema.

To get started, after running `docker compose up` from root, then run:

`packages/database-sink> npm run dev-setup`