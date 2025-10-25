import pandas as pd
import json
import uuid
from datetime import datetime
import os

def generate_uuid():
    """Generate a UUID for each user"""
    return str(uuid.uuid4())

def format_date_string(date_str):
    """Convert date strings to ISO format"""
    try:
        # Parse the date string in MM/DD/YYYY format
        date_parts = date_str.split('/')
        if len(date_parts) != 3:
            raise ValueError("Invalid date format")
        
        month = int(date_parts[0])
        day = int(date_parts[1])
        year = int(date_parts[2])
        
        # Create a datetime object and format as ISO
        dt = datetime(year, month, day, 12, 0, 0)  # Noon on the given date
        return dt.isoformat()
    except Exception as e:
        print(f"Error parsing date {date_str}: {e}")
        # Return a fallback date if parsing fails
        return datetime.now().isoformat()

def process_csv_files(following_path='Following.csv', dont_follow_back_path='Following but Don\'t Follow Back.csv'):
    """Process the CSV files and create a proper JSON snapshot"""
    print(f"Reading files from:\n- {following_path}\n- {dont_follow_back_path}")
    
    # Read the CSV files
    following_df = pd.read_csv(following_path)
    dont_follow_back_df = pd.read_csv(dont_follow_back_path)
    
    # Get column headers (dates) from the Following CSV
    date_columns = following_df.columns.tolist()
    
    # Convert date columns to datetime objects for sorting
    date_objects = [(col, datetime.strptime(col, '%m/%d/%Y')) for col in date_columns]
    
    # Sort date columns chronologically
    date_objects.sort(key=lambda x: x[1])
    sorted_date_columns = [date_col for date_col, _ in date_objects]
    print(f"Found {len(sorted_date_columns)} date columns, sorted chronologically:")
    for date_col in sorted_date_columns:
        print(f"  - {date_col}")
    
    # Initialize the result structure
    result = {
        "account": {
            "username": "straight.up.sean",  # Hardcoded as mentioned in merge.ts
            "full_name": "",
            "profile_url": "https://instagram.com/straight.up.sean"
        },
        "snapshots": [],
        "enriched_at": datetime.now().isoformat(),
        "schema": {
            "version": 1
        }
    }
    
    # Process each date column as a separate snapshot (in chronological order)
    for date_col in sorted_date_columns:
        # Convert the date string to ISO format
        iso_date = format_date_string(date_col)
        
        # Create a new snapshot for this date
        snapshot = {
            "timestamp": iso_date,
            "changed_users": []
        }
        
        # First, collect all users from both files
        following_users = set(following_df[date_col].dropna().str.strip())
        dont_follow_back_users = set(dont_follow_back_df[date_col].dropna().str.strip())
        
        # Create a consolidated set of all users (union)
        all_users = following_users.union(dont_follow_back_users)
        
        # Keep track of user count for order_index
        user_count = 0
        
        # Process each user according to their presence in each file
        for user in all_users:
            user_clean = user.strip()
            
            # Determine follower/following status
            is_in_following = user_clean in following_users
            is_in_dont_follow_back = user_clean in dont_follow_back_users
            
            # Determine correct follower status
            # If in don't_follow_back, they don't follow you (regardless of being in following)
            follower = not is_in_dont_follow_back
            
            # Everyone in either list is someone you follow
            following = True
            
            # If there's a conflict (user in both files), log it
            if is_in_following and is_in_dont_follow_back:
                print(f"Warning: User '{user_clean}' is in both files for date {date_col}. "
                      f"Setting follower={follower}")
            
            # Add to the snapshot
            snapshot["changed_users"].append({
                "username": user_clean,
                "profile_url": f"https://instagram.com/{user_clean}",
                "follower": follower,
                "following": following,
                "is_verified": False,  # Default values
                "is_private": False,  # Default values
                "whitelisted": False,
                "blocked": False,
                "aliases": [],
                "order_index": user_count,
                "uuid": generate_uuid()
            })
            user_count += 1
        
        print(f"Date {date_col}: Processed {len(snapshot['changed_users'])} users")
        
        # Add the snapshot to the result
        result["snapshots"].append(snapshot)
    
    return result

def save_json(data, filename="snapshot_output.json"):
    """Save the data to a JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"JSON file saved as {filename}")
    print(f"Full path: {os.path.abspath(filename)}")

def analyze_overlap(following_path, dont_follow_back_path):
    """Analyze how many users are in both files for each date"""
    following_df = pd.read_csv(following_path)
    dont_follow_back_df = pd.read_csv(dont_follow_back_path)
    
    date_columns = following_df.columns.tolist()
    
    print("\nAnalyzing overlap between files:")
    print("===============================")
    
    for date_col in date_columns:
        following_users = set(following_df[date_col].dropna().str.strip())
        dont_follow_back_users = set(dont_follow_back_df[date_col].dropna().str.strip())
        
        # Find users that are in both files
        overlap = following_users.intersection(dont_follow_back_users)
        
        print(f"Date {date_col}:")
        print(f"  Users in Following: {len(following_users)}")
        print(f"  Users in Don't Follow Back: {len(dont_follow_back_users)}")
        print(f"  Users in BOTH files: {len(overlap)}")
        
        if len(overlap) > 0:
            print(f"  Example overlapping users: {', '.join(list(overlap)[:5])}")
            if len(overlap) > 5:
                print(f"    ...and {len(overlap) - 5} more")
        print("")
    
    return len(overlap) > 0

if __name__ == "__main__":
    try:
        # Set up input file paths
        script_dir = os.path.dirname(os.path.abspath(__file__))
        following_path = os.path.join(script_dir, "Following.csv")
        dont_follow_back_path = os.path.join(script_dir, "Following but Don't Follow Back.csv")
        
        # Analyze overlap between files
        has_overlap = analyze_overlap(following_path, dont_follow_back_path)
        
        if has_overlap:
            print("WARNING: There are users that appear in both files.")
            print("For these users, they will be marked as NOT following you back (follower=false)")
            print("as per the 'Following but Don't Follow Back.csv' file.\n")
            
            response = input("Continue processing? (y/n): ")
            if response.lower() not in ["y", "yes"]:
                print("Processing cancelled.")
                exit(0)
                
        # Process the CSV files
        json_data = process_csv_files(following_path, dont_follow_back_path)
        
        # Generate output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = os.path.join(script_dir, f"snapshot_output_{timestamp}.json")
        
        # Save the result to a JSON file
        save_json(json_data, output_filename)
        
        # Print some stats
        print(f"\nSummary:")
        print(f"Processed {len(json_data['snapshots'])} snapshots.")
        total_users = sum(len(snapshot['changed_users']) for snapshot in json_data['snapshots'])
        print(f"Total user records: {total_users}")
        print("\nUse this file to upload to the website for merging.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()