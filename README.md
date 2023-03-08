<div align="center">
  <h1>Prisma Stable Sort Middleware</h1>

  <p>
    A Prisma middleware for ensuring stable sorting of results on any model
  </p>
  <br>
</div>

<hr>

When using Prisma to query a database and ordering the results by a non-unique field the order of the results is not guaranteed to be stable. This is because the database does not guarantee the order of results if multiple rows have the same value for the field that the results are being ordered by. This can be problematic if you are using the results of a query to generate a list of items that the user can interact with, as the order of the items may change between requests.
This middleware solves this problem by adding a secondary sort order to the query, base on a unique field in the model. This ensures that the order of the results is stable, even if multiple rows have the same value for the field that the results are being ordered by.

## Installation

```bash
npm i @cerebruminc/prisma-stable-sort-middleware
```

## Usage

The middleware introspects the Prisma model to determine which fields can be used as a secondary sort order. This means that you need to pass the Prisma client to the middleware when you initialize it.

```ts
import { stableSortMiddleware } from "@cerebruminc/prisma-stable-sort-middleware";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();
client.$use(stableSortMiddleware(client));
```

## License

The project is licensed under the MIT license.

  <br>
  <br>

<div align="center">

![Cerebrum](./images/powered-by-cerebrum-lm.png#gh-light-mode-only)
![Cerebrum](./images/powered-by-cerebrum-dm.svg#gh-dark-mode-only)

</div>
