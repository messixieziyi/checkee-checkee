# Checkee.info Scraper

A Python scraper for extracting visa check data from [checkee.info](https://www.checkee.info).

## Features

- Scrapes visa application data from all available months
- Extracts key information: ID, visa type, consulate, status, dates, etc.
- Optionally scrapes detailed notes/experiences from detail pages
- Exports data to CSV and/or JSON formats
- Respects rate limits with delays between requests

## Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

**Important:** Always use the virtual environment when running scripts:

```bash
# Activate virtual environment
source venv/bin/activate

# Or use the helper script
./run.sh --month 2026-02
```

### Running the Full Pipeline (Scrape + Save to Supabase + Detect Changes)

```bash
# Scrape specific month
python update_and_detect.py --month 2026-02

# Scrape multiple months
python update_and_detect.py --months 10

# Dry run (test without saving)
python update_and_detect.py --month 2026-02 --dry-run
```

### Test Mode (scrape one month - old script)
```bash
python run_scraper.py --test
```

### Scrape All Months
```bash
python run_scraper.py
```

### Scrape Limited Number of Months
```bash
python run_scraper.py --months 10
```

### Include Details Pages (slower, but gets user notes/experiences)
```bash
python run_scraper.py --include-details
```

### Custom Output Files
```bash
python run_scraper.py --output-csv my_data.csv --output-json my_data.json
```

## Command Line Options

- `--months N`: Limit scraping to first N months (default: all)
- `--include-details`: Also scrape detail pages for notes/experiences (slower)
- `--output-csv FILE`: Specify CSV output filename (default: checkee_data.csv)
- `--output-json FILE`: Specify JSON output filename (optional)
- `--test`: Test mode - scrape only the first month

## Data Fields

Each record contains:
- `month`: The month this record belongs to (YYYY-MM)
- `id`: Application ID/identifier
- `visa_type`: Type of visa (F1, H1, B1, etc.)
- `visa_entry`: Entry type (New, Renewal, etc.)
- `consulate`: US Consulate location (BeiJing, ShangHai, etc.)
- `major`: Major/field of study
- `status`: Current status (Pending, Clear, Reject)
- `check_date`: Date when check started (YYYY-MM-DD)
- `complete_date`: Date when check completed (YYYY-MM-DD, or 0000-00-00 if pending)
- `waiting_days`: Number of days waiting
- `details_link`: URL to detail page
- `has_notes`: Boolean indicating if notes are available
- `note`: Note text from detail link title (if available)
- `details`: Full details from detail page (only if --include-details is used)

## Output Formats

### CSV
Data is exported as a CSV file with all fields as columns. Suitable for analysis in Excel, pandas, etc.

### JSON
Data is exported as a JSON array of objects. Each object represents one visa application record.

## Notes

- The scraper includes delays between requests to be respectful to the server
- Scraping all months with details can take a long time (hours)
- The website structure may change, which could break the scraper
- Some records may have incomplete data

## Example

```bash
# Quick test
python run_scraper.py --test

# Scrape last 3 months with details
python run_scraper.py --months 3 --include-details --output-csv recent_data.csv
```
