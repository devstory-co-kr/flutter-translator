import { InvalidVersionException } from "../../util/exceptions";

export class Version {
  public major: number;
  public minor: number;
  public patch: number;

  constructor(value: string) {
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;

    const match = value.match(versionRegex);

    if (!match) {
      throw new InvalidVersionException(`"${value}" is invalid version.`);
    }
    this.major = parseInt(match[1], 10);
    this.minor = parseInt(match[2], 10);
    this.patch = parseInt(match[3], 10);
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  public compare(other: Version): number {
    if (this.major !== other.major) {
      return this.major - other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }
    return this.patch - other.patch;
  }

  public isGreaterThan(other: Version): boolean {
    return this.compare(other) > 0;
  }

  public isEqualTo(other: Version): boolean {
    return this.compare(other) === 0;
  }
}
