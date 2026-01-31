-- Add all new Lumina tagging columns
ALTER TABLE venues ADD COLUMN cuisine_primary TEXT;
ALTER TABLE venues ADD COLUMN cuisine_secondary TEXT;
ALTER TABLE venues ADD COLUMN cuisine_style TEXT;
ALTER TABLE venues ADD COLUMN cuisine_tags TEXT;

ALTER TABLE venues ADD COLUMN primary_vibes TEXT;
ALTER TABLE venues ADD COLUMN secondary_vibes TEXT;

ALTER TABLE venues ADD COLUMN pregame_suitable BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN first_date_suitable BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN anniversary_suitable BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN girls_night_suitable BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN guys_night_suitable BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN brunch_spot BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN late_night_spot BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN solo_friendly BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN business_meeting_ok BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN large_group_suitable BOOLEAN DEFAULT 0;

ALTER TABLE venues ADD COLUMN energy_level TEXT;
ALTER TABLE venues ADD COLUMN energy_progression TEXT;

ALTER TABLE venues ADD COLUMN lounge_type TEXT;
ALTER TABLE venues ADD COLUMN lounge_vibes TEXT;

ALTER TABLE venues ADD COLUMN instagram_handle TEXT;
ALTER TABLE venues ADD COLUMN website TEXT;
