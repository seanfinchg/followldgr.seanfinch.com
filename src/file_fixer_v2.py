import pandas as pd
import json
from datetime import datetime
import os

def process_snapshots(csv_path='followers.csv'):
    """
    Process CSV data into snapshots with the same format as the snapshot JSON.
    Only include users in subsequent snapshots if there are changes to their status.
    """
    print(f"Reading data from {csv_path}...")
    data = pd.read_csv(csv_path)
    follower_data = {}
    
    # Get column names that represent dates (excluding '.1' columns)
    date_cols = [col for col in data.columns if '/' in col and not col.endswith('.1')]
    date_cols.sort()  # Ensure chronological order
    
    # First build a dictionary to track all users and their history across snapshots
    user_history = {}
    # Keep track of all users we've ever seen
    all_known_users = set()
    
    print(f"Processing {len(date_cols)} snapshots...")
    for date_index, date in enumerate(date_cols):
        # Get users from both columns for this date
        following_column = date
        followers_column = date + '.1'
        
        # Get users lists, handling NaN values
        following_users = set(data[following_column].dropna())
        dont_follow_back = set(data[followers_column].dropna())
        
        # In CSV format:
        # - "following_users" = people I follow (whether they follow back or not)
        # - "dont_follow_back" = people I follow who DON'T follow me back
        # So to derive followers:
        followers = following_users - dont_follow_back
        
        # For current snapshot, all users that are either followed by me or follow me
        current_users = following_users.copy()
        
        # Find users who've disappeared since the last snapshot
        if date_index > 0:
            # Get all previously seen users who are not in the current snapshot
            disappeared_users = all_known_users - current_users - dont_follow_back
            # Add them to the processing list
            current_users.update(disappeared_users)
        
        # Create snapshot entry if this is the first snapshot
        if date_index == 0:
            follower_data[date] = {
                "timestamp": convert_date_to_iso(date),
                "changed_users": []
            }
            
            # First snapshot includes all users
            for username in current_users:
                is_following = username in following_users
                is_follower = username in followers
                
                user_entry = {
                    "username": username,
                    "profile_url": f"https://instagram.com/{username}",
                    "follower": is_follower,
                    "following": is_following,
                    "whitelisted": False,
                    "blocked": False,
                    "aliases": [],
                    "uuid": generate_simple_uuid(username)
                }
                
                # Store user in first snapshot
                follower_data[date]["changed_users"].append(user_entry)
                
                # Update user history
                user_history[username] = {
                    "last_state": {
                        "follower": is_follower,
                        "following": is_following
                    },
                    "last_snapshot": date
                }
                
                # Add to all known users
                all_known_users.add(username)
        else:
            # For subsequent snapshots, only include users with changes
            changed_users = []
            
            # Process all current users including those who may have disappeared
            for username in current_users:
                is_following = username in following_users
                is_follower = username in followers
                
                # If a user is not in either list but we've seen them before,
                # they've disappeared (unfollowed/removed)
                if username not in following_users and username not in dont_follow_back:
                    is_following = False
                    is_follower = False
                
                # Check if this is a new user or if their status changed
                is_new_user = username not in user_history
                
                if is_new_user:
                    # New user that wasn't in previous snapshots
                    user_entry = {
                        "username": username,
                        "profile_url": f"https://instagram.com/{username}",
                        "follower": is_follower, 
                        "following": is_following,
                        "whitelisted": False,
                        "blocked": False,
                        "aliases": [],
                        "uuid": generate_simple_uuid(username)
                    }
                    changed_users.append(user_entry)
                    
                    # Add to all known users
                    all_known_users.add(username)
                    
                    # Update user history
                    user_history[username] = {
                        "last_state": {
                            "follower": is_follower,
                            "following": is_following
                        },
                        "last_snapshot": date
                    }
                else:
                    # Existing user - check if status changed
                    last_state = user_history[username]["last_state"]
                    status_changed = (
                        last_state["follower"] != is_follower or 
                        last_state["following"] != is_following
                    )
                    
                    if status_changed:
                        # Create user entry
                        user_entry = {
                            "username": username,
                            "profile_url": f"https://instagram.com/{username}",
                            "uuid": generate_simple_uuid(username)
                        }
                        
                        # Always include both fields when status changed
                        # This ensures we track when users completely disappear
                        user_entry["follower"] = is_follower
                        user_entry["following"] = is_following
                        
                        changed_users.append(user_entry)
                        
                        # Update user history
                        user_history[username]["last_state"] = {
                            "follower": is_follower,
                            "following": is_following
                        }
                        user_history[username]["last_snapshot"] = date
            
            # Only create a snapshot if there were changes
            if changed_users:
                follower_data[date] = {
                    "timestamp": convert_date_to_iso(date),
                    "changed_users": changed_users
                }
    
    # Convert to the expected output format
    output = {
        "account": {
            "username": "straight.up.sean",
            "full_name": "",
            "profile_url": "https://instagram.com/straight.up.sean"
        },
        "snapshots": [
            {
                "timestamp": follower_data[date]["timestamp"],
                "changed_users": follower_data[date]["changed_users"]
            } for date in date_cols if date in follower_data
        ],
        "schema": {
            "version": 1
        },
        "enriched_at": datetime.now().isoformat()
    }
    
    print(f"Writing output to output.json...")
    with open("output.json", 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Processing complete. Generated {len(output['snapshots'])} snapshots with change data.")
    print(f"Tracked {len(all_known_users)} unique users across all snapshots.")
    return output

def convert_date_to_iso(date_str):
    """Convert MM/DD/YYYY format to ISO format"""
    parts = date_str.split('/')
    if len(parts) != 3:
        # Default to current time if format is invalid
        return datetime.now().isoformat()
    
    month, day, year = parts
    # Create a datetime object and convert to ISO format
    dt = datetime(int(year), int(month), int(day), 12, 0, 0)  # Noon on the given day
    return dt.isoformat()

def generate_simple_uuid(username):
    """Generate a simple deterministic UUID-like string based on username"""
    import hashlib
    hash_object = hashlib.md5(username.encode())
    md5_hash = hash_object.hexdigest()
    
    # Format like UUID: 8-4-4-4-12
    return f"{md5_hash[:8]}-{md5_hash[8:12]}-{md5_hash[12:16]}-{md5_hash[16:20]}-{md5_hash[20:32]}"

if __name__ == "__main__":
    process_snapshots()