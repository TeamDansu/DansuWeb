export type ChartDifficulty = {
  id: number;
  difficulty_name: string;
  rating: string;
};

export type ChartDetail = ChartDifficulty & {
  chartset_id: number;
  chart_uuid: string;
  title: string;
  artist: string;
  source: string;
  tags: string;
  relative_chart_path: string;
  relative_audio_path: string | null;
  relative_cover_art_path: string | null;
  relative_skin_path: string | null;
  creator_display: string | null;
  preview_time_ms: number;
  format_version: number;
  chart_revision: number;
  checksum_sha256: string;
  min_bpm: string;
  max_bpm: string;
  rating_version: number;
  play_time_ms: number;
  note_count: number;
  max_combo: number;
  created_at: string;
  updated_at: string;
};

export type ChartsetStatus = "pending" | "approved" | "ranked" | "published";

export type ChartsetSummary = {
  id: number;
  title: string | null;
  artist: string | null;
  owner_id: number | null;
  owner_username: string | null;
  origin: "official" | "community";
  status: ChartsetStatus;
  is_removed: boolean;
  created_at: string;
  last_validated_at: string | null;
  preview_cover_url: string;
  charts: ChartDifficulty[];
};

export type ChartsetDetail = {
  id: number;
  owner_id: number | null;
  owner_username: string | null;
  dlc_id: number | null;
  chartset_uuid: string;
  origin: "official" | "community";
  dlc_track_number: number | null;
  status: ChartsetStatus;
  is_removed: boolean;
  genre: string;
  language: string;
  is_nsfl: boolean;
  package_size_bytes: number | null;
  primary_play_time_ms: number | null;
  download_count: number;
  loved_count: number;
  play_count: number;
  validator_version: number;
  published_at: string | null;
  ranked_at: string | null;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
  charts: ChartDetail[];
};
