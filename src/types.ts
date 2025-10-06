export type AliasEntry = {
  username: string;
  changed_at: string;
};

export type AttributeChange = {
  attribute: string;
  oldValue: any;
  newValue: any;
  changed_at: string;
};

export type BasicUser = {
  username: string;
  full_name?: string;
  profile_url: string;
  profile_pic_url?: string;
  is_verified?: boolean;
  is_private?: boolean;
  follower?: boolean;
  following?: boolean;
  // Extensible fields
  aliases?: AliasEntry[]; // Changed to only accept AliasEntry[] for type safety
  whitelisted?: boolean;
  blocked?: boolean;
  first_seen?: string;
  last_seen?: string;
  order_index?: number; // chronological index per IG snapshot
  order_index_following?: number; // chronological index in following list
  uuid?: string; // Unique identifier for tracking users across snapshots
  attributeHistory?: Record<string, AttributeChange[]>; // Track all attribute changes
};

export type Snapshot = {
  timestamp: string; // ISO
  followers?: BasicUser[];
  following?: BasicUser[];
  changed_users?: BasicUser[]; // Support both formats (old and new)
};

export type SnapshotComparison = {
  baseSnapshot: Snapshot;
  compareSnapshot: Snapshot;
  lostFollowers: Array<{ user: BasicUser }>;
  unfollowed: Array<{ user: BasicUser }>;
  newFollowers: Array<{ user: BasicUser }>;
  newFollowing: Array<{ user: BasicUser }>;
};

export type LDGRJson = {
  account: {
    username: string;
    full_name?: string;
    profile_url: string;
    profile_pic_url?: string;
  };
  snapshots: Snapshot[];
  // Optionally enriched fields (kept at root)
  enriched_at?: string;
  schema?: {
    version: number;
  };
};

export type Dataset = {
  account: LDGRJson["account"];
  mergedSnapshots: Snapshot[];
  // Computed live sets (latest state)
  latestFollowers: Map<string, BasicUser>;
  latestFollowing: Map<string, BasicUser>;
  // Deltas & history
  lostFollowers: Array<{ user: BasicUser; from: string; to: string }>;
  unfollowed: Array<{ user: BasicUser; from: string; to: string }>;
  // Derived
  mutuals: Map<string, BasicUser>;
  notFollowingBack: Map<string, BasicUser>; // I follow them, they don't follow me
  iDontFollowBack: Map<string, BasicUser>; // they follow me, I don't follow them
  // Index maps for chronological order headers
  alphaIndex: Map<string, string>;
  // Selected snapshot comparison (if any)
  selectedComparison?: SnapshotComparison;
};

export type CategoryKey =
  | "followers"
  | "following"
  | "mutuals"
  | "notFollowingBack"
  | "iDontFollowBack"
  | "lostFollowers"
  | "unfollowed"
  | "newFollowers"
  | "newFollowing";

export type VerifiedFilter = "any" | "verified" | "notVerified";
export type PrivacyFilter = "any" | "private" | "public";
export type WhitelistFilter = "any" | "only" | "exclude";
export type SortMode = "chrono" | "chronoNewest" | "alpha" | "alphaDesc";

export type UIState = {
  // Loaded datasets
  base?: LDGRJson; // merged/fixed dashboard JSON
  snapshots: LDGRJson[]; // new fetch files
  dataset?: Dataset;

  // UI controls
  category: CategoryKey;
  search: string;
  verified: VerifiedFilter;
  privacy: PrivacyFilter;
  whitelist: WhitelistFilter;
  pageSize: number;
  page: number;
  sort: SortMode;

  // Snapshot comparison
  baseSnapshotIndex?: number;
  compareSnapshotIndex?: number;

  // Toggles
  showTrend: boolean;
};
