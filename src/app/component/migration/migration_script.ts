import { Version } from "./version";

export interface MigrationScript {
  versoin: Version;
  run(): Promise<void>;
}
