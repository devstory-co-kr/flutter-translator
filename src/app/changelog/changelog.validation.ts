import { Changelog } from "./changelog";

export enum ChangelogValidationType {
  notExist = "Not Exist",
  overflow = "Overflow",
  empty = "Empty",
  normal = "Normal",
}

export type ChangelogValidation = {
  changelog: Changelog;
  validationType: ChangelogValidationType;
};
