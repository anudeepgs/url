import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUrls1761300000000 implements MigrationInterface {
  name = "CreateUrls1761300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "urls" (
        "alias" VARCHAR(32) PRIMARY KEY,
        "original_url" TEXT NOT NULL,
        "expires_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "urls"`);
  }
}
