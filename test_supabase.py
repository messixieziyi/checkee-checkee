#!/usr/bin/env python3
"""
Test script to verify Supabase connection and create tables
"""

from supabase_client import SupabaseClient
import os

def test_connection():
    """Test basic connection to Supabase"""
    try:
        client = SupabaseClient()
        print("✓ Successfully connected to Supabase")
        return client
    except Exception as e:
        print(f"✗ Error connecting to Supabase: {e}")
        return None

def create_tables(client):
    """Create database tables using migration SQL"""
    try:
        # Read migration file
        migration_path = os.path.join(os.path.dirname(__file__), 'supabase', 'migrations', '001_initial_schema.sql')
        
        with open(migration_path, 'r') as f:
            sql = f.read()
        
        # Supabase Python client doesn't have direct SQL execution
        # We need to use the REST API or run this in Supabase dashboard
        print("\n⚠ Note: Supabase Python client doesn't support direct SQL execution.")
        print("Please run the migration SQL in your Supabase dashboard:")
        print(f"  1. Go to: https://supabase.com/dashboard/project/{os.getenv('SUPABASE_URL').split('//')[1].split('.')[0]}/sql")
        print(f"  2. Copy the SQL from: {migration_path}")
        print("  3. Paste and execute it in the SQL editor")
        
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_basic_operations(client):
    """Test basic database operations"""
    try:
        # Test getting statistics (will fail if tables don't exist)
        stats = client.get_statistics()
        print(f"\n✓ Database operations working")
        print(f"  Latest snapshot: {stats.get('snapshot_date', 'None')}")
        return True
    except Exception as e:
        print(f"\n⚠ Database tables may not exist yet: {e}")
        print("   Please run the migration SQL in Supabase dashboard first")
        return False

if __name__ == '__main__':
    print("Testing Supabase connection...")
    client = test_connection()
    
    if client:
        print("\nTesting database setup...")
        create_tables(client)
        test_basic_operations(client)
        
        print("\n" + "="*50)
        print("Next steps:")
        print("1. Run the migration SQL in Supabase dashboard")
        print("2. Test with: python update_and_detect.py --month 2026-02 --dry-run")
        print("3. Then run for real: python update_and_detect.py --month 2026-02")
