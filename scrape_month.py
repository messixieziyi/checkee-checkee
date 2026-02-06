#!/usr/bin/env python3
"""
Quick script to scrape a specific month
"""

import sys
from scraper import CheckeeScraper

if __name__ == '__main__':
    month = '2026-02'
    if len(sys.argv) > 1:
        month = sys.argv[1]
    
    scraper = CheckeeScraper()
    
    print(f"Fetching homepage to find month links...")
    month_links = scraper.parse_homepage()
    
    # Find the specific month
    target_month = None
    for link in month_links:
        if link['month'] == month:
            target_month = link
            break
    
    if not target_month:
        print(f"Error: Month {month} not found")
        print(f"Available months: {[l['month'] for l in month_links[:10]]}...")
        sys.exit(1)
    
    print(f"Scraping {month}...")
    records = scraper.parse_monthly_page(target_month['url'])
    
    # Add month to records
    for record in records:
        record['month'] = month
    
    print(f"Found {len(records)} records")
    
    # Save to CSV
    filename = f'checkee_{month}.csv'
    scraper.save_to_csv(records, filename)
    
    print(f"\nData saved to: {filename}")
    print(f"\nFirst few records:")
    for i, record in enumerate(records[:3], 1):
        print(f"\nRecord {i}:")
        for key, value in record.items():
            print(f"  {key}: {value}")
