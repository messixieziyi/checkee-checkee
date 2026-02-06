#!/usr/bin/env python3
"""
Supabase client for database operations
Handles saving snapshots, records, and changes to Supabase
"""

import os
from typing import List, Dict, Optional
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class SupabaseClient:
    def __init__(self):
        """Initialize Supabase client with credentials from environment variables"""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SECRET_KEY')  # Use secret key for backend operations
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SECRET_KEY in .env file"
            )
        
        # Ensure URL doesn't have trailing slash
        supabase_url = supabase_url.rstrip('/')
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    def save_snapshot(self, records: List[Dict], month: str) -> str:
        """
        Save a new snapshot and all its records to the database
        
        Args:
            records: List of record dictionaries
            month: Month in YYYY-MM format
            
        Returns:
            snapshot_id: UUID of the created snapshot
        """
        # Create snapshot entry
        snapshot_data = {
            'month': month,
            'total_records': len(records),
            'scrape_date': datetime.utcnow().isoformat()
        }
        
        # Retry logic for schema cache issues
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = self.client.table('snapshots').insert(snapshot_data).execute()
                snapshot_id = result.data[0]['id']
                break
            except Exception as e:
                error_str = str(e)
                if ('PGRST205' in error_str or 'schema cache' in error_str.lower()) and attempt < max_retries - 1:
                    import time
                    wait_time = (attempt + 1) * 2  # 2, 4, 6 seconds
                    print(f"  Schema cache issue, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    raise
        
        # Extract casenum from details_link for each record
        records_with_casenum = []
        for record in records:
            record_data = {
                'snapshot_id': snapshot_id,
                'casenum': self._extract_casenum(record.get('details_link', '')),
                'user_id': record.get('id', ''),
                'visa_type': record.get('visa_type', ''),
                'visa_entry': record.get('visa_entry', ''),
                'consulate': record.get('consulate', ''),
                'major': record.get('major', ''),
                'status': record.get('status', ''),
                'check_date': self._parse_date(record.get('check_date', '')),
                'complete_date': self._parse_date(record.get('complete_date', '')),
                'waiting_days': self._parse_int(record.get('waiting_days', '')),
                'details_link': record.get('details_link', ''),
                'has_notes': record.get('has_notes', False),
                'note': record.get('note', ''),
                'month': month
            }
            records_with_casenum.append(record_data)
        
        # Batch insert records (Supabase supports up to 1000 per batch)
        batch_size = 1000
        for i in range(0, len(records_with_casenum), batch_size):
            batch = records_with_casenum[i:i + batch_size]
            self.client.table('records').insert(batch).execute()
        
        return snapshot_id
    
    def get_latest_snapshot(self, month: Optional[str] = None) -> Optional[Dict]:
        """
        Get the most recent snapshot for a given month (or overall if month is None)
        
        Args:
            month: Optional month filter (YYYY-MM format)
            
        Returns:
            Snapshot dictionary or None if no snapshots exist
        """
        query = self.client.table('snapshots').select('*').order('scrape_date', desc=True).limit(1)
        
        if month:
            query = query.eq('month', month)
        
        result = query.execute()
        
        if result.data:
            return result.data[0]
        return None
    
    def get_records_by_snapshot(self, snapshot_id: str) -> List[Dict]:
        """
        Get all records for a specific snapshot
        
        Args:
            snapshot_id: UUID of the snapshot
            
        Returns:
            List of record dictionaries
        """
        result = self.client.table('records').select('*').eq('snapshot_id', snapshot_id).execute()
        return result.data
    
    def get_records_by_casenum(self, casenum: str) -> List[Dict]:
        """
        Get all records (across all snapshots) for a specific casenum
        
        Args:
            casenum: Case number identifier
            
        Returns:
            List of record dictionaries ordered by created_at
        """
        result = (
            self.client.table('records')
            .select('*')
            .eq('casenum', casenum)
            .order('created_at', desc=False)
            .execute()
        )
        return result.data
    
    def save_changes(self, changes: List[Dict]) -> None:
        """
        Save detected changes to the database
        
        Args:
            changes: List of change dictionaries with keys:
                - casenum: Case number
                - snapshot_id_old: Previous snapshot ID (optional)
                - snapshot_id_new: New snapshot ID
                - change_type: Type of change
                - field_name: Name of changed field
                - old_value: Previous value
                - new_value: New value
        """
        if not changes:
            return
        
        # Batch insert changes
        batch_size = 1000
        for i in range(0, len(changes), batch_size):
            batch = changes[i:i + batch_size]
            self.client.table('changes').insert(batch).execute()
    
    def get_changes(
        self,
        since_date: Optional[datetime] = None,
        month: Optional[str] = None,
        change_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Query changes with optional filters
        
        Args:
            since_date: Only return changes after this date
            month: Filter by month (YYYY-MM)
            change_type: Filter by change type
            limit: Maximum number of results
            
        Returns:
            List of change dictionaries
        """
        query = self.client.table('changes').select('*').order('detected_at', desc=True).limit(limit)
        
        if since_date:
            query = query.gte('detected_at', since_date.isoformat())
        
        if change_type:
            query = query.eq('change_type', change_type)
        
        # For month filter, we need to join with snapshots or records
        # For now, we'll filter client-side if needed
        result = query.execute()
        
        changes = result.data
        
        # Filter by month if specified (requires checking snapshot month)
        if month:
            # Get snapshot IDs for this month
            snapshots_result = (
                self.client.table('snapshots')
                .select('id')
                .eq('month', month)
                .execute()
            )
            snapshot_ids = {s['id'] for s in snapshots_result.data}
            
            # Filter changes to only those with snapshot_id_new in this month
            changes = [c for c in changes if c.get('snapshot_id_new') in snapshot_ids]
        
        return changes
    
    def get_statistics(self, month: Optional[str] = None) -> Dict:
        """
        Get aggregate statistics
        
        Args:
            month: Optional month filter (YYYY-MM)
            
        Returns:
            Dictionary with statistics
        """
        # Get latest snapshot
        latest_snapshot = self.get_latest_snapshot(month)
        if not latest_snapshot:
            return {}
        
        snapshot_id = latest_snapshot['id']
        
        # Get records for latest snapshot
        records = self.get_records_by_snapshot(snapshot_id)
        
        if not records:
            return {}
        
        # Calculate statistics
        total = len(records)
        status_counts = {}
        visa_type_counts = {}
        consulate_counts = {}
        waiting_days_list = []
        
        for record in records:
            # Status counts
            status = record.get('status', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Visa type counts
            visa_type = record.get('visa_type', 'Unknown')
            visa_type_counts[visa_type] = visa_type_counts.get(visa_type, 0) + 1
            
            # Consulate counts
            consulate = record.get('consulate', 'Unknown')
            consulate_counts[consulate] = consulate_counts.get(consulate, 0) + 1
            
            # Waiting days
            if record.get('waiting_days'):
                try:
                    waiting_days_list.append(int(record['waiting_days']))
                except (ValueError, TypeError):
                    pass
        
        stats = {
            'total_records': total,
            'status_counts': status_counts,
            'visa_type_counts': visa_type_counts,
            'consulate_counts': consulate_counts,
            'snapshot_id': snapshot_id,
            'snapshot_date': latest_snapshot['scrape_date']
        }
        
        if waiting_days_list:
            stats['avg_waiting_days'] = sum(waiting_days_list) / len(waiting_days_list)
            stats['min_waiting_days'] = min(waiting_days_list)
            stats['max_waiting_days'] = max(waiting_days_list)
        
        return stats
    
    def _extract_casenum(self, details_link: str) -> str:
        """Extract casenum from details_link URL"""
        if not details_link:
            return ''
        
        # Extract casenum from URL like: personal_detail.php?casenum=844578
        import re
        match = re.search(r'casenum=(\d+)', details_link)
        if match:
            return match.group(1)
        return ''
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string, return None for invalid dates like '0000-00-00'"""
        if not date_str or date_str == '0000-00-00':
            return None
        try:
            # Validate date format
            datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
        except (ValueError, TypeError):
            return None
    
    def _parse_int(self, value: str) -> Optional[int]:
        """Parse integer, return None if invalid"""
        if not value:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
