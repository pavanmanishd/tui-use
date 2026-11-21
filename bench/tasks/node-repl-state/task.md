---
category: repls
---
`/home/agent/work/inventory.js` exports an async `load()` function that returns a warehouse inventory object (loading takes a few seconds). Start the Node.js REPL with `node` in `/home/agent/work` and, in one REPL session:

1. load it with `const inv = await require('./inventory').load()`
2. `inv.take('gear', 7)`
3. `inv.add('spring', 12)`
4. take half of the bolts that are left, rounded down: look up the count with `inv.count('bolt')` and call `inv.take('bolt', <half>)`
5. save the result with `inv.save('/home/agent/work/inventory.json')`

Do not modify `inventory.js` or `inventory.seed`.
