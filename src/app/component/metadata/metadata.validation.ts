import { Metadata, MetadataText } from "./metadata";

export enum MetadataValidationType {
  notExist = "Not Exist",
  overflow = "Overflow",
  required = "Required",
  invalidURL = "Invalid URL",
  normal = "Normal",
}

export type MetadataValidation = {
  metadata: Metadata;
  sectionName: string;
  validationList: {
    data: MetadataText;
    type: MetadataValidationType;
  }[];
};

export type MetadataValidationItem = {
  metadata: Metadata;
  sectionName: string;
  data: MetadataText;
  type: MetadataValidationType;
};
