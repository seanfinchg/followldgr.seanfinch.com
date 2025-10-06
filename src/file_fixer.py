import pandas as pd
from collections import defaultdict

data = pd.read_csv('followers.csv')
follower_data = defaultdict(list)

cols = ['6/1/2025', '6/30/2025', '8/3/2025', '8/6/2025', '8/7/2025', '8/17/2025', '8/24/2025', '9/7/2025']

people_that_dont_follow_back = data[[col + '.1' for col in cols]]
people_i_follow = data[cols]

for date in cols:
    right = set(people_that_dont_follow_back[date+".1"])
    left = set(people_i_follow[date])
    
    # if they exist in the left and right sets, put them in 'following' only
    # if they exist only in the left set, put them in 'following' and 'followers'
    for user in set(left.union(right)):
        follower = None
        following = None
        if user in left and user not in right:
            follower = True
            following = True
        elif user in left and user in right:
            following = True
            follower = False
        
        follower_data[date].append({
            "user_name": user,
            "follower": follower,
            "following": following,
            "url": f"https://instagram.com/{user}"
        })

import json
file_path = "output.json"
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(follower_data, f, ensure_ascii=False, indent=2)