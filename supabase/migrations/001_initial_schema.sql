-- Create snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrape_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    month TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create records table
CREATE TABLE IF NOT EXISTS records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    casenum TEXT NOT NULL,
    user_id TEXT,
    visa_type TEXT,
    visa_entry TEXT,
    consulate TEXT,
    major TEXT,
    status TEXT,
    check_date DATE,
    complete_date DATE,
    waiting_days INTEGER,
    details_link TEXT,
    has_notes BOOLEAN DEFAULT FALSE,
    note TEXT,
    month TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create changes table
CREATE TABLE IF NOT EXISTS changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casenum TEXT NOT NULL,
    snapshot_id_old UUID REFERENCES snapshots(id) ON DELETE SET NULL,
    snapshot_id_new UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_records_snapshot_id ON records(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_records_casenum ON records(casenum);
CREATE INDEX IF NOT EXISTS idx_records_month ON records(month);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_changes_casenum ON changes(casenum);
CREATE INDEX IF NOT EXISTS idx_changes_detected_at ON changes(detected_at);
CREATE INDEX IF NOT EXISTS idx_changes_change_type ON changes(change_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_month ON snapshots(month);
CREATE INDEX IF NOT EXISTS idx_snapshots_scrape_date ON snapshots(scrape_date);

-- Add comments for documentation
COMMENT ON TABLE snapshots IS 'Stores metadata about each scrape session';
COMMENT ON TABLE records IS 'Stores individual visa application records from each snapshot';
COMMENT ON TABLE changes IS 'Tracks detected changes between snapshots';
