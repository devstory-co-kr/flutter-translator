import { Metadata, MetadataText } from "./metadata";

export enum MetadataValidationType {
  notExcluded = "Not Excluded",
  notExist = "Not Exist",
  overflow = "Overflow",
  required = "Required",
  invalidURL = "Invalid URL",
  normal = "Normal",
}

export type MetadataValidation = {
  sourceMetadata: Metadata;
  targetMetadata: Metadata;
  sectionName: string;
  validationList: {
    sourceData?: MetadataText;
    targetData: MetadataText;
    type: MetadataValidationType;
    message: string;
  }[];
};

export type MetadataValidationItem = {
  sourceMetadata: Metadata;
  targetMetadata: Metadata;
  sectionName: string;
  sourceData?: MetadataText;
  targetData: MetadataText;
  message: string;
  type: MetadataValidationType;
};
