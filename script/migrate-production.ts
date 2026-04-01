import pg from "pg";

async function migrateProduction() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();
    try {
      const { rows: [idCol] } = await client.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='id'`
      );

      if (!idCol || idCol.data_type === 'character varying') {
        console.log("[migrate] users.id is already varchar or table does not exist. Checking for missing tables...");

        const { rows: tables } = await client.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
        );
        const tableNames = tables.map((r: any) => r.table_name);

        if (!tableNames.includes('organisations')) {
          console.log("[migrate] Creating organisations table...");
          await client.query(`
            CREATE TABLE IF NOT EXISTS organisations (
              id serial PRIMARY KEY NOT NULL,
              name text NOT NULL,
              slug varchar(100) NOT NULL,
              created_at timestamp DEFAULT now() NOT NULL,
              CONSTRAINT organisations_slug_key UNIQUE(slug)
            )
          `);
        }

        if (!tableNames.includes('organisation_email_domains')) {
          console.log("[migrate] Creating organisation_email_domains table...");
          await client.query(`
            CREATE TABLE IF NOT EXISTS organisation_email_domains (
              id serial PRIMARY KEY NOT NULL,
              organisation_id integer NOT NULL,
              domain varchar(255) NOT NULL,
              CONSTRAINT organisation_email_domains_domain_key UNIQUE(domain)
            )
          `);
        }

        console.log("[migrate] No type migration needed.");
        return;
      }

      console.log("[migrate] users.id is integer — running full migration...");
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS organisations (
          id serial PRIMARY KEY NOT NULL,
          name text NOT NULL,
          slug varchar(100) NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          CONSTRAINT organisations_slug_key UNIQUE(slug)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS organisation_email_domains (
          id serial PRIMARY KEY NOT NULL,
          organisation_id integer NOT NULL,
          domain varchar(255) NOT NULL,
          CONSTRAINT organisation_email_domains_domain_key UNIQUE(domain)
        )
      `);

      const fkConstraints = [
        { table: 'ai_interactions', constraint: 'ai_interactions_user_id_users_id_fk', col: 'user_id' },
        { table: 'organisation_controls', constraint: 'organisation_controls_assigned_user_id_users_id_fk', col: 'assigned_user_id' },
        { table: 'test_runs', constraint: 'test_runs_tester_user_id_users_id_fk', col: 'tester_user_id' },
        { table: 'evidence_links', constraint: 'evidence_links_added_by_user_id_users_id_fk', col: 'added_by_user_id' },
        { table: 'document_control_links', constraint: 'document_control_links_linked_by_user_id_users_id_fk', col: 'linked_by_user_id' },
        { table: 'document_question_matches', constraint: 'document_question_matches_accepted_by_user_id_users_id_fk', col: 'accepted_by_user_id' },
        { table: 'documents', constraint: 'documents_uploaded_by_user_id_users_id_fk', col: 'uploaded_by_user_id' },
        { table: 'response_change_log', constraint: 'response_change_log_changed_by_user_id_users_id_fk', col: 'changed_by_user_id' },
      ];

      for (const fk of fkConstraints) {
        await client.query(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint}`);
      }
      console.log("[migrate] Dropped FK constraints");

      for (const fk of fkConstraints) {
        await client.query(`UPDATE ${fk.table} SET ${fk.col} = NULL WHERE ${fk.col} IS NOT NULL`);
      }
      console.log("[migrate] Nulled user references");

      await client.query('DELETE FROM users');
      console.log("[migrate] Cleared old users");

      await client.query('ALTER TABLE users ALTER COLUMN id DROP DEFAULT');
      await client.query('ALTER TABLE users ALTER COLUMN id TYPE VARCHAR USING id::VARCHAR');
      await client.query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar`);
      console.log("[migrate] Changed users.id to varchar");

      for (const fk of fkConstraints) {
        await client.query(`ALTER TABLE ${fk.table} ALTER COLUMN ${fk.col} TYPE VARCHAR USING ${fk.col}::VARCHAR`);
      }
      console.log("[migrate] Changed FK columns to varchar");

      for (const fk of fkConstraints) {
        await client.query(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.constraint} FOREIGN KEY (${fk.col}) REFERENCES users(id)`);
      }
      console.log("[migrate] Re-added FK constraints");

      const addColIfMissing = async (table: string, col: string, type: string) => {
        const { rows } = await client.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
          [table, col]
        );
        if (rows.length === 0) {
          await client.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
        }
      };

      await addColIfMissing('users', 'first_name', 'VARCHAR');
      await addColIfMissing('users', 'last_name', 'VARCHAR');
      await addColIfMissing('users', 'profile_image_url', 'VARCHAR');
      await addColIfMissing('users', 'organisation_id', 'INTEGER REFERENCES organisations(id)');
      await addColIfMissing('users', 'updated_at', 'TIMESTAMP DEFAULT NOW()');

      const orgTables = [
        'organisation_controls', 'documents', 'test_runs', 'ai_interactions',
        'evidence_links', 'document_control_links', 'document_question_matches',
        'response_change_log', 'organisation_profile',
      ];
      for (const table of orgTables) {
        await addColIfMissing(table, 'organisation_id', 'INTEGER REFERENCES organisations(id)');
      }
      console.log("[migrate] Added missing columns");

      const { rows: orgs } = await client.query(`SELECT id FROM organisations WHERE slug = 'bella-slainte'`);
      let orgId: number;
      if (orgs.length === 0) {
        const { rows: [newOrg] } = await client.query(
          `INSERT INTO organisations (name, slug) VALUES ('Bella Sláinte', 'bella-slainte') RETURNING id`
        );
        orgId = newOrg.id;
        await client.query(
          `INSERT INTO organisation_email_domains (organisation_id, domain) VALUES ($1, 'bellamed.ai') ON CONFLICT DO NOTHING`,
          [orgId]
        );
        console.log("[migrate] Seeded organisation");
      } else {
        orgId = orgs[0].id;
      }

      for (const table of orgTables) {
        await client.query(`UPDATE ${table} SET organisation_id = $1 WHERE organisation_id IS NULL`, [orgId]);
      }

      await client.query('DROP SEQUENCE IF EXISTS users_id_seq CASCADE');

      await client.query('COMMIT');
      console.log("[migrate] Migration complete!");
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

migrateProduction().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
