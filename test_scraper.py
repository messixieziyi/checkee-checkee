#!/usr/bin/env python3
"""
Test script to inspect HTML structure
"""

import requests
from bs4 import BeautifulSoup
import json

def test_access():
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Referer': 'https://www.checkee.info/'
    })
    
    # Try homepage
    print("Testing homepage access...")
    try:
        response = session.get('https://www.checkee.info/', timeout=30)
        print(f"Homepage status: {response.status_code}")
        if response.status_code == 200:
            with open('homepage.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            print("Saved homepage.html")
            
            # Parse for month links
            soup = BeautifulSoup(response.text, 'html.parser')
            links = []
            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                if 'main.php?dispdate=' in href:
                    links.append({
                        'text': link.get_text(strip=True),
                        'href': href
                    })
            print(f"\nFound {len(links)} month links")
            if links:
                print("First 5 links:")
                for link in links[:5]:
                    print(f"  {link}")
                
                # Try accessing first month page
                if links:
                    test_url = 'https://www.checkee.info/' + links[0]['href']
                    print(f"\nTesting access to: {test_url}")
                    month_response = session.get(test_url, timeout=30)
                    print(f"Month page status: {month_response.status_code}")
                    if month_response.status_code == 200:
                        with open('month_page.html', 'w', encoding='utf-8') as f:
                            f.write(month_response.text)
                        print("Saved month_page.html")
                        
                        # Parse the month page
                        month_soup = BeautifulSoup(month_response.text, 'html.parser')
                        tables = month_soup.find_all('table')
                        print(f"\nFound {len(tables)} tables")
                        for i, table in enumerate(tables):
                            rows = table.find_all('tr')
                            print(f"  Table {i}: {len(rows)} rows")
                            if rows:
                                # Show first row
                                first_row = rows[0]
                                cells = first_row.find_all(['th', 'td'])
                                if cells:
                                    headers = [cell.get_text(strip=True) for cell in cells]
                                    print(f"    Headers: {headers}")
                                    if len(headers) >= 8:
                                        print(f"    This might be the data table!")
                                        # Show a sample data row
                                        if len(rows) > 1:
                                            sample_row = rows[1]
                                            sample_cells = sample_row.find_all(['td', 'th'])
                                            sample_data = [cell.get_text(strip=True) for cell in sample_cells]
                                            print(f"    Sample row: {sample_data}")
                    else:
                        print(f"Error: {month_response.text[:500]}")
        else:
            print(f"Error accessing homepage: {response.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_access()
