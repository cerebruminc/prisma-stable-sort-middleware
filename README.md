<div align="center">
  <h1>Prisma Stable Sort Middleware</h1>

  <p>
    Prisma middleware and Client Extension for ensuring stable sorting of results on any model
  </p>
</div>

<hr>

When using Prisma to query a database and ordering the results by a non-unique field the order of the results is not guaranteed to be stable. This is because the database does not guarantee the order of results if multiple rows have the same value for the field that the results are being ordered by.
This can be problematic if you are using the results of a query to generate a list of items that the user can interact with, as the order of the items may change between requests.
This package solves this problem by adding a secondary sort order to the query, based on a unique field in the model. This ensures that the order of the results is stable, even if multiple rows have the same value for the field that the results are being ordered by.

## Installation

```bash
npm i @cerebruminc/prisma-stable-sort-middleware
```

## Usage with Prisma 5, 6, and 7

Use the Client Extension API for applications on Prisma 5, 6, or 7. The extension introspects the generated Prisma client to determine which fields can be used as a secondary sort order.

```ts
import { stableSortExtension } from "@cerebruminc/prisma-stable-sort-middleware";
import { PrismaClient } from "@prisma/client";

const baseClient = new PrismaClient();
const client = baseClient.$extends(stableSortExtension(baseClient));
```

Prisma 7 requires a database driver adapter when you create the base client. Pass that configured base client to `stableSortExtension` in the same way:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { stableSortExtension } from "@cerebruminc/prisma-stable-sort-middleware";
import { PrismaClient } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const baseClient = new PrismaClient({ adapter });
const client = baseClient.$extends(stableSortExtension(baseClient));
```

## Legacy middleware usage with Prisma 5 and Prisma 6.0–6.13

The legacy middleware API remains supported for Prisma 5 and Prisma 6.0–6.13. New integrations should use `stableSortExtension`:

```ts
import { stableSortMiddleware } from "@cerebruminc/prisma-stable-sort-middleware";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();
client.$use(stableSortMiddleware(client));
```

[Prisma 6.14 removed the `$use` middleware API](https://github.com/prisma/prisma/releases/tag/6.14.0). Applications on Prisma 6.14 or later must use `stableSortExtension`.

### Usage with a custom Prisma Client output path

If your Prisma schema generates the client to a custom location, import your generated client from that location and pass it to the extension as usual.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

```ts
import { stableSortExtension } from "@cerebruminc/prisma-stable-sort-middleware";
import { PrismaClient } from "../src/generated/prisma";

const baseClient = new PrismaClient();
const client = baseClient.$extends(stableSortExtension(baseClient));
```

This package does not import `@prisma/client/runtime/library`; both APIs only require a generated Prisma client instance that exposes Prisma's runtime data model.

## License

The project is licensed under the MIT license.

  <br>
  <br>

<div align="center">

![Cerebrum](./images/powered-by-cerebrum-lm.png#gh-light-mode-only)
![Cerebrum](./images/powered-by-cerebrum-dm.svg#gh-dark-mode-only)

</div>

## Contributing

Before opening a pull request, please run:

- `npm test`
- `npm run test:integration`

Please also follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification when writing commit messages.
