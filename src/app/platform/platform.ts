import { MetadataLanguage } from "../component/metadata/metadata";
import { XcodeLanguage } from "../component/xcode/xcode";
import { AndroidMetadata } from "./android/android.metadata";
import { IosMetadata } from "./ios/ios.metadata";

export type PlatformMetadata = AndroidMetadata | IosMetadata;
export type PlatformMetadataLanguage = {
  supportMetadataLanguages: MetadataLanguage[];
};
export type PlatformXcodeLanguage = {
  supportXcodeLanguages: XcodeLanguage[];
};
