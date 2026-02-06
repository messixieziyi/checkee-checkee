#!/usr/bin/env python3
"""
Main integration script
Orchestrates scraping, saving to Supabase, and change detection
"""

import argparse
import sys
from datetime import datetime
from scraper import CheckeeScraper
from supabase_client import SupabaseClient
from change_detector import ChangeDetector


def main():
    parser = argparse.ArgumentParser(description='Scrape data, save to Supabase, and detect changes')
    parser.add_argument('--months', type=int, help='Limit number of months to scrape (default: all)')
    parser.add_argument('--month', type=str, help='Scrape specific month (YYYY-MM format)')
    parser.add_argument('--skip-changes', action='store_true', help='Skip change detection')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    
    args = parser.parse_args()
    
    # Initialize clients
    try:
        db_client = SupabaseClient()
        print("✓ Connected to Supabase")
    except Exception as e:
        print(f"✗ Error connecting to Supabase: {e}")
        print("Make sure SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env file")
        sys.exit(1)
    
    scraper = CheckeeScraper()
    detector = ChangeDetector(db_client)
    
    # Determine which months to scrape
    if args.month:
        # Scrape specific month
        month_links = scraper.parse_homepage()
        target_month = None
        for link in month_links:
            if link['month'] == args.month:
                target_month = link
                break
        
        if not target_month:
            print(f"Error: Month {args.month} not found")
            sys.exit(1)
        
        print(f"Scraping {args.month}...")
        records = scraper.parse_monthly_page(target_month['url'])
        for record in records:
            record['month'] = args.month
        
        months_to_process = [(args.month, records)]
    else:
        # Scrape multiple months
        print("Fetching homepage...")
        month_links = scraper.parse_homepage()
        
        if args.months:
            month_links = month_links[:args.months]
        
        print(f"Found {len(month_links)} months to scrape")
        
        months_to_process = []
        for i, month_info in enumerate(month_links, 1):
            print(f"Scraping {month_info['month']} ({i}/{len(month_links)})...")
            records = scraper.parse_monthly_page(month_info['url'])
            for record in records:
                record['month'] = month_info['month']
            months_to_process.append((month_info['month'], records))
    
    # Process each month
    all_changes = []
    
    for month, records in months_to_process:
        if not records:
            print(f"  No records found for {month}, skipping...")
            continue
        
        print(f"\nProcessing {month}: {len(records)} records")
        
        if args.dry_run:
            print("  [DRY RUN] Would save snapshot and detect changes")
            continue
        
        # Save snapshot
        try:
            snapshot_id = db_client.save_snapshot(records, month)
            print(f"  ✓ Saved snapshot {snapshot_id[:8]}... with {len(records)} records")
        except Exception as e:
            print(f"  ✗ Error saving snapshot: {e}")
            continue
        
        # Detect changes
        if not args.skip_changes:
            try:
                changes = detector.detect_changes(records, month)
                
                # Update snapshot_id_new in changes
                for change in changes:
                    change['snapshot_id_new'] = snapshot_id
                
                if changes:
                    db_client.save_changes(changes)
                    print(f"  ✓ Detected {len(changes)} changes")
                    all_changes.extend(changes)
                else:
                    print(f"  ✓ No changes detected")
            except Exception as e:
                print(f"  ✗ Error detecting changes: {e}")
    
    # Summary
    print("\n" + "="*50)
    print("Summary:")
    print(f"  Months processed: {len(months_to_process)}")
    print(f"  Total changes detected: {len(all_changes)}")
    
    if all_changes:
        change_types = {}
        for change in all_changes:
            change_type = change['change_type']
            change_types[change_type] = change_types.get(change_type, 0) + 1
        
        print("\n  Change breakdown:")
        for change_type, count in sorted(change_types.items()):
            print(f"    {change_type}: {count}")


if __name__ == '__main__':
    main()
