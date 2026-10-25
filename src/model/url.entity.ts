import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

// Column types are explicit because tsx/esbuild does not emit decorator metadata.
@Entity({ name: "urls" })
export class Url {
  @PrimaryColumn({ type: "varchar", length: 32 })
  alias!: string;

  @Column({ name: "original_url", type: "text" })
  originalUrl!: string;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
