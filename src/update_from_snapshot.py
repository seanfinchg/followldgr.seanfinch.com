import json
import os
import sys
from datetime import datetime

def update_output_with_full_snapshot(output_json_path='output.json', snapshot_json_path=None):
    """
    Updates output.json data with full information from the snapshot file.
    
    This script:
    1. Reads the output.json file created by file_fixer_v2.py
    2. Reads the snapshot file with full user data
    3. Updates users in output.json with complete information from the snapshot
    4. Writes back to output.json
    """
    # Find the latest snapshot file if none is provided
    if not snapshot_json_path:
        snapshot_files = [f for f in os.listdir() if f.startswith("snapshot_") and f.endswith(".json")]
        if not snapshot_files:
            print("Error: No snapshot files found")
            return
        # Get the most recent snapshot file
        snapshot_json_path = max(snapshot_files)
    
    print(f"Reading output from {output_json_path}")
    try:
        with open(output_json_path, 'r', encoding='utf-8') as f:
            output_data = json.load(f)
    except Exception as e:
        print(f"Error reading output file: {e}")
        return
    
    print(f"Reading snapshot data from {snapshot_json_path}")
    try:
        with open(snapshot_json_path, 'r', encoding='utf-8') as f:
            snapshot_data = json.load(f)
    except Exception as e:
        print(f"Error reading snapshot file: {e}")
        return
    
    if not snapshot_data.get('snapshots') or not snapshot_data['snapshots'][0].get('changed_users'):
        print("Error: Snapshot file doesn't have the expected structure")
        return
        
    # Create a dictionary of users from snapshot for quick lookup
    snapshot_users = {}
    for user in snapshot_data['snapshots'][0]['changed_users']:
        snapshot_users[user['username'].lower()] = user
    
    # Update account information if needed
    if snapshot_data.get('account'):
        output_data['account'] = snapshot_data['account']
    
    # Update users with full information
    update_count = 0
    for snapshot in output_data['snapshots']:
        for user in snapshot['changed_users']:
            username = user['username'].lower()
            if username in snapshot_users:
                # Copy all fields from snapshot user except for those already set
                # This preserves follower/following status in each snapshot
                snapshot_user = snapshot_users[username]
                
                # Fields to preserve from the original user entry
                preserved_fields = {'follower', 'following'}
                
                # Get preserved values
                preserved_values = {}
                for field in preserved_fields:
                    if field in user:
                        preserved_values[field] = user[field]
                
                # Update user with all fields from snapshot
                for key, value in snapshot_user.items():
                    # Don't override follower/following if they were explicitly set
                    if key not in preserved_values:
                        user[key] = value
                
                # Restore preserved values
                for field, value in preserved_values.items():
                    user[field] = value
                    
                # Always copy over the order indices from snapshot
                # These track the order in which users followed/were followed
                if 'order_index' in snapshot_user:
                    user['order_index'] = snapshot_user['order_index']
                
                if 'order_index_following' in snapshot_user:
                    user['order_index_following'] = snapshot_user['order_index_following']
                
                update_count += 1
    
    # Update enriched_at timestamp
    output_data['enriched_at'] = datetime.now().isoformat()
    
    # Write back to output.json
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"Update complete. Updated {update_count} user entries with full information.")
    print(f"Order indices were preserved from the snapshot for chronological sorting.")
    print(f"Output written to {output_json_path}")

if __name__ == "__main__":
    # If a snapshot file is specified on the command line, use it
    snapshot_file = sys.argv[1] if len(sys.argv) > 1 else None
    update_output_with_full_snapshot(snapshot_json_path=snapshot_file)