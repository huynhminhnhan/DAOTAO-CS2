Sequelize-CLI migrations for source-controlled project migrations.

This folder is now the canonical place for migration files used by sequelize-cli. Files should export `up` and `down` functions (CommonJS or compatible ESM depending on your node setup). Prefer CommonJS for best compatibility with sequelize-cli.

Example to generate a new migration:
  npx sequelize-cli migration:generate --name add-column-to-students

Run migrations:
  npx sequelize-cli db:migrate

Undo last migration:
  npx sequelize-cli db:migrate:undo

Be sure `config/config.js` points to your DB envs and `.sequelizerc` maps migrations-path to this folder.
