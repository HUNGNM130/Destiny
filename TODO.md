# TODO - Convert MySQL → PostgreSQL

- [x] Update `package.json`: replace `mysql2` with `pg`.
- [ ] Refactor `server.js`:
  - [x] Switch DB client from `mysql2` to `pg`.


  - [ ] Convert DDL for `memories` and `videos` to PostgreSQL.
  - [ ] Convert all SQL placeholders from `?` to `$1..$n`.
  - [ ] Adjust query execution to `pg` API (Promise/async).

- [x] Convert `setup.sql` from MySQL syntax to PostgreSQL syntax.

- [ ] Update `README.md` MySQL -> PostgreSQL instructions.
- [ ] Run a quick syntax check / start server to verify no runtime SQL syntax errors.

