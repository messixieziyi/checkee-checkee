#!/usr/bin/env python3
"""
Scraper for checkee.info website
Scrapes visa check data from monthly pages
"""

import requests
from bs4 import BeautifulSoup
import csv
import json
import time
from urllib.parse import urljoin, urlparse
from datetime import datetime
import re

class CheckeeScraper:
    def __init__(self, base_url="https://www.checkee.info"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.checkee.info/'
        })
        # Visit homepage first to get cookies
        try:
            response = self.session.get(self.base_url, timeout=30)
            if response.status_code != 200:
                print(f"Warning: Homepage returned status {response.status_code}")
        except Exception as e:
            print(f"Warning: Could not visit homepage: {e}")
    
    def get_page(self, url):
        """Fetch a page with retry logic"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            if len(response.text) < 100:
                print(f"Warning: Response from {url} is very short ({len(response.text)} chars)")
            return response.text
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def parse_homepage(self):
        """Parse homepage to get all month links"""
        html = self.get_page(self.base_url)
        if not html:
            print("Warning: Could not fetch homepage HTML")
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        month_links = []
        
        # Find all Track links - they should be in a table
        # Looking for links with href containing "main.php?dispdate="
        all_links = soup.find_all('a', href=True)
        print(f"Found {len(all_links)} total links on homepage")
        
        for link in all_links:
            href = link.get('href', '')
            if 'main.php?dispdate=' in href:
                month = link.text.strip()
                # Handle relative URLs - normalize them
                if href.startswith('./'):
                    # Keep the ./ for urljoin to work correctly
                    pass
                full_url = urljoin(self.base_url, href)
                # Extract date from URL
                match = re.search(r'dispdate=(\d{4}-\d{2})', href)
                if match:
                    date_str = match.group(1)
                    month_links.append({
                        'month': date_str,
                        'url': full_url,
                        'text': month
                    })
        
        print(f"Found {len(month_links)} month links before deduplication")
        
        # Remove duplicates based on month
        seen = set()
        unique_links = []
        for link in month_links:
            if link['month'] not in seen:
                seen.add(link['month'])
                unique_links.append(link)
        
        # Sort by month (newest first)
        unique_links.sort(key=lambda x: x['month'], reverse=True)
        
        return unique_links
        
        return month_links
    
    def parse_monthly_page(self, url):
        """Parse a monthly page to extract visa application records"""
        html = self.get_page(url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        records = []
        
        # Find the main data table - it has headers: Update, ID, Visa Type, etc.
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            if len(rows) < 2:  # Need at least header + data rows
                continue
            
            # Check header row
            header_row = rows[0]
            headers = [th.get_text(strip=True) for th in header_row.find_all(['th', 'td'])]
            
            # The data table has these headers: Update, ID, Visa Type, Visa Entry, US Consulate, Major, Status, Check Date, Complete Date, Waiting Day(s), Details
            if len(headers) >= 10 and 'ID' in headers and 'Visa Type' in headers and 'Status' in headers:
                # This is our data table
                for row in rows[1:]:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 10:  # Skip rows that don't have enough columns
                        continue
                    
                    cell_texts = [cell.get_text(strip=True) for cell in cells]
                    
                    # Extract data - skip first column (Update link)
                    # Columns: Update, ID, Visa Type, Visa Entry, US Consulate, Major, Status, Check Date, Complete Date, Waiting Day(s), Details
                    record = {
                        'id': cell_texts[1] if len(cell_texts) > 1 else '',
                        'visa_type': cell_texts[2] if len(cell_texts) > 2 else '',
                        'visa_entry': cell_texts[3] if len(cell_texts) > 3 else '',
                        'consulate': cell_texts[4] if len(cell_texts) > 4 else '',
                        'major': cell_texts[5] if len(cell_texts) > 5 else '',
                        'status': cell_texts[6] if len(cell_texts) > 6 else '',
                        'check_date': cell_texts[7] if len(cell_texts) > 7 else '',
                        'complete_date': cell_texts[8] if len(cell_texts) > 8 else '',
                        'waiting_days': cell_texts[9] if len(cell_texts) > 9 else '',
                        'details_link': '',
                        'has_notes': False
                    }
                    
                    # Find details link in the last column
                    details_cell = cells[-1] if len(cells) > 10 else None
                    if details_cell:
                        details_link = details_cell.find('a', href=True)
                        if details_link:
                            href = details_link.get('href', '')
                            if 'personal_detail.php' in href or 'detail' in href.lower():
                                record['details_link'] = urljoin(self.base_url, href)
                                
                                # Check if there are notes (indicated by notes.png image or Title attribute)
                                if details_cell.find('img', src=lambda x: x and 'notes.png' in x):
                                    record['has_notes'] = True
                                
                                # Extract note from Title attribute if present
                                title = details_link.get('title', '')
                                if title:
                                    record['note'] = title
                    
                    records.append(record)
        
        return records
    
    def parse_details_page(self, url):
        """Parse a details page to get user notes/experiences"""
        html = self.get_page(url)
        if not html:
            return ''
        
        soup = BeautifulSoup(html, 'html.parser')
        notes = []
        
        # Look for tables or divs containing notes/experiences
        # The structure may vary, so we'll look for common patterns
        for element in soup.find_all(['table', 'div', 'p', 'td']):
            text = element.get_text(strip=True)
            # Look for substantial text that might be a note/experience
            if text and len(text) > 30 and not any(skip in text.lower() for skip in ['home', 'add your case', 'tracker', 'update', 'id', 'visa type']):
                notes.append(text)
        
        # Also check for specific note sections
        note_sections = soup.find_all(['div', 'td'], class_=lambda x: x and ('note' in x.lower() or 'comment' in x.lower() or 'experience' in x.lower()))
        for section in note_sections:
            text = section.get_text(strip=True)
            if text:
                notes.append(text)
        
        return ' | '.join(notes[:5])  # Limit to first 5 notes to avoid duplicates
    
    def scrape_all(self, include_details=False, months_limit=None):
        """Scrape all months"""
        print("Fetching homepage...")
        month_links = self.parse_homepage()
        
        if months_limit:
            month_links = month_links[:months_limit]
        
        print(f"Found {len(month_links)} months to scrape")
        
        all_records = []
        
        for i, month_info in enumerate(month_links, 1):
            print(f"Scraping {month_info['month']} ({i}/{len(month_links)})...")
            records = self.parse_monthly_page(month_info['url'])
            
            # Add month info to each record
            for record in records:
                record['month'] = month_info['month']
            
            all_records.extend(records)
            
            # If including details, scrape details pages
            if include_details:
                for record in records:
                    if record.get('details_link'):
                        print(f"  Fetching details for {record.get('id', 'unknown')}...")
                        details = self.parse_details_page(record['details_link'])
                        record['details'] = details
                        time.sleep(0.5)  # Be polite
            
            time.sleep(1)  # Be polite between pages
        
        return all_records
    
    def save_to_csv(self, records, filename='checkee_data.csv'):
        """Save records to CSV"""
        if not records:
            print("No records to save")
            return
        
        # Get all unique keys from records
        fieldnames = set()
        for record in records:
            fieldnames.update(record.keys())
        
        fieldnames = sorted(list(fieldnames))
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)
        
        print(f"Saved {len(records)} records to {filename}")
    
    def save_to_json(self, records, filename='checkee_data.json'):
        """Save records to JSON"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        
        print(f"Saved {len(records)} records to {filename}")


def main():
    scraper = CheckeeScraper()
    
    # First, let's test with a single month to see the structure
    print("Testing with homepage...")
    month_links = scraper.parse_homepage()
    
    if month_links:
        print(f"\nFound {len(month_links)} months")
        print("First few months:")
        for link in month_links[:5]:
            print(f"  {link['month']}: {link['url']}")
        
        # Test parsing one month
        if month_links:
            print(f"\nTesting parsing of {month_links[0]['month']}...")
            test_records = scraper.parse_monthly_page(month_links[0]['url'])
            print(f"Found {len(test_records)} records")
            if test_records:
                print("\nSample record:")
                print(json.dumps(test_records[0], indent=2))
    else:
        print("No month links found. Checking HTML structure...")
        html = scraper.get_page(scraper.base_url)
        if html:
            # Save HTML for inspection
            with open('homepage.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print("Saved homepage.html for inspection")


if __name__ == '__main__':
    main()
