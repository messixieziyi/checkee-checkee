#!/usr/bin/env python3
"""
Main script to run the checkee.info scraper
"""

import argparse
import sys
from scraper import CheckeeScraper
import json

def main():
    parser = argparse.ArgumentParser(description='Scrape visa check data from checkee.info')
    parser.add_argument('--months', type=int, help='Limit number of months to scrape (default: all)')
    parser.add_argument('--include-details', action='store_true', help='Also scrape details pages (slower)')
    parser.add_argument('--output-csv', type=str, default='checkee_data.csv', help='Output CSV filename (default: checkee_data.csv)')
    parser.add_argument('--output-json', type=str, default=None, help='Output JSON filename (optional)')
    parser.add_argument('--test', action='store_true', help='Test mode: scrape only first month')
    
    args = parser.parse_args()
    
    scraper = CheckeeScraper()
    
    if args.test:
        print("Running in test mode (first month only)...")
        month_links = scraper.parse_homepage()
        if not month_links:
            print("Error: Could not find any month links")
            sys.exit(1)
        
        test_month = month_links[0]['month']
        print(f"\nTesting with month: {test_month}")
        records = scraper.parse_monthly_page(month_links[0]['url'])
        # Add month to records for consistency
        for record in records:
            record['month'] = test_month
        print(f"Found {len(records)} records")
        
        if records:
            print("\nSample record:")
            print(json.dumps(records[0], indent=2, ensure_ascii=False))
            
            # Save test data
            scraper.save_to_csv(records, 'test_checkee_data.csv')
            if args.output_json:
                scraper.save_to_json(records, args.output_json)
    else:
        print("Starting full scrape...")
        records = scraper.scrape_all(
            include_details=args.include_details,
            months_limit=args.months
        )
        
        if not records:
            print("No records found!")
            sys.exit(1)
        
        print(f"\nTotal records scraped: {len(records)}")
        
        # Save to CSV
        scraper.save_to_csv(records, args.output_csv)
        
        # Save to JSON if requested
        if args.output_json:
            scraper.save_to_json(records, args.output_json)
        
        # Print summary
        print("\nSummary:")
        print(f"  Total records: {len(records)}")
        status_counts = {}
        for record in records:
            status = record.get('status', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        print("  Status breakdown:")
        for status, count in sorted(status_counts.items()):
            print(f"    {status}: {count}")

if __name__ == '__main__':
    main()
