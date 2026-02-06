#!/usr/bin/env python3
"""
Change detection module
Compares new scraped data with previous snapshots to detect changes
"""

import re
from typing import List, Dict, Optional
from datetime import datetime
from supabase_client import SupabaseClient


class ChangeDetector:
    def __init__(self, supabase_client: SupabaseClient):
        """
        Initialize change detector with Supabase client
        
        Args:
            supabase_client: Initialized SupabaseClient instance
        """
        self.db = supabase_client
    
    def detect_changes(self, new_records: List[Dict], month: str) -> List[Dict]:
        """
        Compare new records with the last snapshot and detect changes
        
        Args:
            new_records: List of new record dictionaries from scraper
            month: Month in YYYY-MM format
            
        Returns:
            List of change dictionaries ready to be saved
        """
        changes = []
        
        # Get the latest snapshot for this month
        latest_snapshot = self.db.get_latest_snapshot(month)
        
        if not latest_snapshot:
            # No previous snapshot - all records are new
            for record in new_records:
                casenum = self._extract_casenum(record.get('details_link', ''))
                if casenum:
                    changes.append({
                        'casenum': casenum,
                        'snapshot_id_old': None,
                        'snapshot_id_new': None,  # Will be set after snapshot is created
                        'change_type': 'new_record',
                        'field_name': None,
                        'old_value': None,
                        'new_value': f"New record: {record.get('id', 'Unknown')}"
                    })
            return changes
        
        # Get records from latest snapshot
        old_records = self.db.get_records_by_snapshot(latest_snapshot['id'])
        
        # Create lookup dictionaries
        old_records_by_casenum = {
            self._extract_casenum(r.get('details_link', '')): r
            for r in old_records
            if self._extract_casenum(r.get('details_link', ''))
        }
        
        new_records_by_casenum = {
            self._extract_casenum(r.get('details_link', '')): r
            for r in new_records
            if self._extract_casenum(r.get('details_link', ''))
        }
        
        # Find new records
        new_casenums = set(new_records_by_casenum.keys()) - set(old_records_by_casenum.keys())
        for casenum in new_casenums:
            record = new_records_by_casenum[casenum]
            changes.append({
                'casenum': casenum,
                'snapshot_id_old': latest_snapshot['id'],
                'snapshot_id_new': None,  # Will be set after snapshot is created
                'change_type': 'new_record',
                'field_name': None,
                'old_value': None,
                'new_value': f"New record: {record.get('id', 'Unknown')}"
            })
        
        # Find changed records
        common_casenums = set(new_records_by_casenum.keys()) & set(old_records_by_casenum.keys())
        for casenum in common_casenums:
            old_record = old_records_by_casenum[casenum]
            new_record = new_records_by_casenum[casenum]
            
            record_changes = self._compare_records(old_record, new_record, casenum, latest_snapshot['id'])
            changes.extend(record_changes)
        
        return changes
    
    def _compare_records(
        self,
        old_record: Dict,
        new_record: Dict,
        casenum: str,
        snapshot_id_old: str
    ) -> List[Dict]:
        """
        Compare two records and return list of changes
        
        Args:
            old_record: Record from previous snapshot
            new_record: Record from new snapshot
            casenum: Case number identifier
            snapshot_id_old: ID of old snapshot
            
        Returns:
            List of change dictionaries
        """
        changes = []
        
        # Fields to compare
        fields_to_check = [
            ('status', 'status_change'),
            ('complete_date', 'date_update'),
            ('waiting_days', 'waiting_days_update'),
            ('note', 'note_added'),
        ]
        
        for field_name, change_type in fields_to_check:
            old_value = old_record.get(field_name)
            new_value = new_record.get(field_name)
            
            # Handle special cases
            if field_name == 'complete_date':
                # Treat '0000-00-00' as None/empty
                if old_value == '0000-00-00' or old_value is None:
                    old_value = None
                if new_value == '0000-00-00' or new_value is None:
                    new_value = None
                
                # If date changed from None to a date, it's a completion
                if old_value is None and new_value is not None:
                    changes.append({
                        'casenum': casenum,
                        'snapshot_id_old': snapshot_id_old,
                        'snapshot_id_new': None,  # Will be set after snapshot is created
                        'change_type': 'date_update',
                        'field_name': 'complete_date',
                        'old_value': str(old_value) if old_value else 'None',
                        'new_value': str(new_value)
                    })
                elif old_value != new_value and old_value is not None and new_value is not None:
                    changes.append({
                        'casenum': casenum,
                        'snapshot_id_old': snapshot_id_old,
                        'snapshot_id_new': None,
                        'change_type': 'date_update',
                        'field_name': 'complete_date',
                        'old_value': str(old_value),
                        'new_value': str(new_value)
                    })
            
            elif field_name == 'status':
                if old_value != new_value:
                    changes.append({
                        'casenum': casenum,
                        'snapshot_id_old': snapshot_id_old,
                        'snapshot_id_new': None,
                        'change_type': 'status_change',
                        'field_name': 'status',
                        'old_value': str(old_value) if old_value else '',
                        'new_value': str(new_value) if new_value else ''
                    })
            
            elif field_name == 'waiting_days':
                try:
                    old_days = int(old_value) if old_value else 0
                    new_days = int(new_value) if new_value else 0
                    if new_days > old_days:
                        changes.append({
                            'casenum': casenum,
                            'snapshot_id_old': snapshot_id_old,
                            'snapshot_id_new': None,
                            'change_type': 'waiting_days_update',
                            'field_name': 'waiting_days',
                            'old_value': str(old_days),
                            'new_value': str(new_days)
                        })
                except (ValueError, TypeError):
                    pass
            
            elif field_name == 'note':
                # Check if note was added or updated
                old_note = str(old_value) if old_value else ''
                new_note = str(new_value) if new_value else ''
                
                if not old_note and new_note:
                    # Note was added
                    changes.append({
                        'casenum': casenum,
                        'snapshot_id_old': snapshot_id_old,
                        'snapshot_id_new': None,
                        'change_type': 'note_added',
                        'field_name': 'note',
                        'old_value': '',
                        'new_value': new_note[:200]  # Truncate long notes
                    })
                elif old_note and new_note and old_note != new_note:
                    # Note was updated
                    changes.append({
                        'casenum': casenum,
                        'snapshot_id_old': snapshot_id_old,
                        'snapshot_id_new': None,
                        'change_type': 'note_updated',
                        'field_name': 'note',
                        'old_value': old_note[:200],
                        'new_value': new_note[:200]
                    })
        
        return changes
    
    def _extract_casenum(self, details_link: str) -> str:
        """Extract casenum from details_link URL"""
        if not details_link:
            return ''
        
        match = re.search(r'casenum=(\d+)', details_link)
        if match:
            return match.group(1)
        return ''
    
    def get_record_history(self, casenum: str) -> List[Dict]:
        """
        Get full history of a record across all snapshots
        
        Args:
            casenum: Case number identifier
            
        Returns:
            List of records ordered chronologically
        """
        return self.db.get_records_by_casenum(casenum)
