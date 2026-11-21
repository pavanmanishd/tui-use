---
category: repls
---
A PostgreSQL database `shop` is running locally; you can connect as yourself with `psql shop`. Using the interactive `psql` shell, make these changes to the `orders` table (columns `id`, `customer`, `status`, `amount`):

1. Set the status of every `pending` order of customer `acme` to `shipped`.
2. Delete every order whose status is `cancelled`.
3. Insert a new order with id `100`, customer `globex`, status `pending` and amount `42.50`.

Then, after these changes, find the customer with the largest total `amount` across all remaining orders and write just that customer's name to `/home/agent/work/top_customer.txt`. Leave every other row unchanged.
