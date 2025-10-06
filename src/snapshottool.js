javascript: (() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const DELAY = 2000,
    COOLDOWN = 10000,
    COOLDOWN_EVERY = 200,
    MAX_FETCH = 10000;

  // ---------- UI ----------
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:999999;background:#0b0b0b;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica Neue,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px;overflow:auto;font-size:16px;";
  overlay.innerHTML = `
    <h1 style="font-size:24px;margin:0;">📊 FollowLDGR Snapshot Tool</h1>
    <p style="margin:0;opacity:.9">Press <b>Start</b> to scan followers & following.</p>
    <div id="ig-progress" style="height:18px;width:100%;max-width:720px;background:#262626;border-radius:999px;overflow:hidden;box-shadow:inset 0 0 0 1px #333;">
      <div id="ig-bar" style="height:100%;width:0;background:linear-gradient(90deg,#22c55e,#06b6d4);transition:width .2s ease;"></div>
    </div>
    <p id="ig-status" style="margin:0;opacity:.9">Idle</p>
    <p id="ig-counts" style="margin:0;opacity:.9">Followers: 0/0 | Following: 0/0</p>
    <div style="display:flex;gap:10px;margin-top:6px;">
      <button id="ig-start" style="font-size:16px;padding:10px 16px;background:#2563eb;color:#fff;border:0;border-radius:10px;cursor:pointer;">▶️ Start</button>
      <button id="ig-download" style="font-size:16px;padding:10px 16px;background:#16a34a;color:#fff;border:0;border-radius:10px;visibility:hidden;cursor:pointer;">💾 Download Snapshot</button>
      <button id="ig-close" style="font-size:16px;padding:10px 16px;background:#374151;color:#fff;border:0;border-radius:10px;cursor:pointer;">❌ Close</button>
    </div>`;
  document.body.appendChild(overlay);

  const status = overlay.querySelector("#ig-status");
  const bar = overlay.querySelector("#ig-bar");
  const countsEl = overlay.querySelector("#ig-counts");
  const startBtn = overlay.querySelector("#ig-start");
  const dlBtn = overlay.querySelector("#ig-download");
  overlay.querySelector("#ig-close").onclick = () => overlay.remove();

  // ---------- Helpers ----------
  let followers = [],
    following = [];
  let totFollowers = 0,
    totFollowing = 0;

  const setCounts = (fGot, fTot, fgGot, fgTot) => {
    countsEl.textContent = `Followers: ${fGot}/${
      fTot || 0
    } | Following: ${fgGot}/${fgTot || 0}`;
  };

  const updateProgress = () => {
    const done =
      Math.min(followers.length, totFollowers || followers.length) +
      Math.min(following.length, totFollowing || following.length);
    const total = (totFollowers || 0) + (totFollowing || 0);
    const pct = total
      ? Math.max(0, Math.min(100, (done / total) * 100))
      : Math.max(
          0,
          Math.min(100, ((followers.length + following.length) / 10000) * 100)
        );
    bar.style.width = pct + "%";
    setCounts(followers.length, totFollowers, following.length, totFollowing);
  };

  // Generate a v4-like UUID (not cryptographically secure, but sufficient for our needs)
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  // Robust account detection
  function detectAccount() {
    const metaUser = document
      .querySelector("meta[property='og:title']")
      ?.content?.split("(")[0]
      ?.trim();
    const headerUser = document.querySelector("header h2")?.innerText?.trim();
    const username =
      headerUser ||
      metaUser ||
      location.pathname.replace(/^\//, "").split("/")[0] ||
      "unknown_user";
    const full_name =
      document.querySelector("header section h1")?.innerText?.trim() || "";
    return {
      username,
      full_name,
      profile_url: `https://instagram.com/${username}`,
    };
  }

  // Read user id from shared data or embedded JSON with expanded detection methods
  function detectUserId() {
    // Method 1: Try to find from window._sharedData
    try {
      const id =
        window?._sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user?.id;
      if (id) return id;
    } catch {}

    // Method 2: Try window.__additionalData
    try {
      const additionalDataKey = Object.keys(window.__additionalData || {}).find(
        (key) => key.startsWith("ProfilePage") || key.includes("profile")
      );
      if (additionalDataKey) {
        const userData = window.__additionalData[additionalDataKey].data?.user;
        if (userData?.id) return userData.id;
      }
    } catch {}

    // Method 3: Try searching for userId in the React props
    try {
      const userIdElements = document.querySelectorAll("[id][data-gt]");
      for (const el of userIdElements) {
        try {
          const dataGt = JSON.parse(el.getAttribute("data-gt") || "{}");
          if (dataGt?.profile_owner) return dataGt.profile_owner;
        } catch {}
      }
    } catch {}

    // Method 4: Search in page source with more patterns
    try {
      // Original pattern
      let m = document.body.innerHTML.match(/"profile_id"\s*:\s*"(\d+)"/);
      if (m?.[1]) return m[1];

      // Alternative patterns
      m = document.body.innerHTML.match(
        /"id"\s*:\s*"(\d+)"[^}]*"username"\s*:\s*"([^"]+)"/
      );
      if (m?.[1]) return m[1];

      m = document.body.innerHTML.match(/"user_id"\s*:\s*"(\d+)"/);
      if (m?.[1]) return m[1];

      m = document.body.innerHTML.match(/"X-IG-App-ID"\s*:\s*"(\d+)"/);
      if (m?.[1]) return m[1];
    } catch {}

    // Method 5: Check meta tags
    try {
      const sharerId = document.querySelector(
        'meta[property="instapp:owner_user_id"]'
      );
      if (sharerId?.content) return sharerId.content;
    } catch {}

    // Method 6: Look for the ID in script tags
    try {
      const scripts = document.querySelectorAll("script:not([src])");
      for (const script of scripts) {
        const content = script.textContent || "";
        if (
          content.includes("profilePage") ||
          content.includes("ProfilePage")
        ) {
          const idMatch = content.match(/"id"\s*:\s*"(\d+)"/);
          if (idMatch?.[1]) return idMatch[1];
        }
      }
    } catch {}

    return null;
  }

  // GraphQL fetch with all fields we need
  // Fallback method using alternative API endpoint
  async function fetchListAlternative(userId, label) {
    let items = [];
    let orderIndex = 0;
    let count = 0;
    let maxId = "";

    const endpoint = label === "followers" ? "followers" : "following";

    while (true) {
      status.textContent = `Fetching ${label} (alt method)… ${items.length} loaded`;
      updateProgress();

      // Use the web API endpoint instead
      const url = `https://www.instagram.com/api/v1/friendships/${userId}/${endpoint}/?count=50&max_id=${maxId}`;

      try {
        const res = await fetch(url, {
          credentials: "include",
          headers: {
            "x-ig-app-id": "936619743392459", // Common app ID
            "x-requested-with": "XMLHttpRequest",
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!json.users || !json.users.length) {
          break;
        }

        // Update total count if available
        if (label === "followers" && json.count) totFollowers = json.count;
        if (label === "following" && json.count) totFollowing = json.count;

        // Process users
        for (const user of json.users) {
          const uuid = generateUUID();

          items.push({
            username: user.username,
            full_name: user.full_name || "",
            profile_url: `https://instagram.com/${user.username}`,
            is_verified: !!user.is_verified,
            is_private: !!user.is_private,
            follower: label === "followers",
            following: label === "following",
            // Fields managed by dashboard
            whitelisted: false,
            blocked: false,
            aliases: [],
            // Order tracking
            order_index: orderIndex++,
            uuid: uuid,
          });
        }

        // Update counters and check pagination
        count += json.users.length;
        if (label === "followers") followers = items;
        else following = items;
        updateProgress();

        // Check for next page
        maxId = json.next_max_id;
        if (!maxId || count >= MAX_FETCH) break;

        // Add cooldown to avoid rate limiting
        if (count % COOLDOWN_EVERY < 50) {
          status.textContent = `Cooldown ${COOLDOWN / 1000}s…`;
          await sleep(COOLDOWN);
        } else {
          await sleep(DELAY);
        }
      } catch (err) {
        console.error(`Error with alternate fetch method: ${err.message}`);
        break;
      }
    }

    return items;
  }

  async function fetchList(queryHash, variables, label) {
    let items = [],
      after = null,
      count = 0;
    let orderIndex = 0; // Track the order for this list

    try {
      while (true) {
        status.textContent = `Fetching ${label}… ${items.length} loaded`;
        updateProgress();

        const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(
          JSON.stringify({ ...variables, after })
        )}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const container =
          json?.data?.user?.edge_followed_by || json?.data?.user?.edge_follow;
        const edges = container?.edges || [];
        const pageInfo = container?.page_info;

        // Capture total counts for accurate progress
        if (label === "followers" && typeof container?.count === "number")
          totFollowers = container.count;
        if (label === "following" && typeof container?.count === "number")
          totFollowing = container.count;

        if (!Array.isArray(edges) || edges.length === 0) break;

        for (const e of edges) {
          const n = e.node || {};
          const uuid = generateUUID();

          items.push({
            username: n.username,
            full_name: n.full_name || "",
            profile_url: `https://instagram.com/${n.username}`,
            is_verified: !!n.is_verified,
            is_private: !!n.is_private,
            follower: label === "followers",
            following: label === "following",
            // Fields managed by dashboard
            whitelisted: false,
            blocked: false,
            aliases: [],
            // Order tracking
            order_index: orderIndex++,
            uuid: uuid,
          });
        }
        count += edges.length;

        if (label === "followers") followers = items;
        else following = items;
        updateProgress();

        after = pageInfo?.end_cursor || null;
        if (!pageInfo?.has_next_page || count >= MAX_FETCH) break;

        if (items.length % COOLDOWN_EVERY < edges.length) {
          status.textContent = `Cooldown ${COOLDOWN / 1000}s…`;
          await sleep(COOLDOWN);
        } else {
          await sleep(DELAY);
        }
      }
      return items;
    } catch (err) {
      // If primary method fails, try the alternative method
      console.error(`Primary fetch method failed: ${err.message}`);
      status.textContent = `Primary fetch failed, trying alternative method...`;
      return await fetchListAlternative(variables.id, label);
    }
  }

  // Function to prompt user for manual ID input
  function promptForUserId() {
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText =
      "display: flex; gap: 10px; margin-top: 10px; width: 100%; max-width: 400px;";
    inputContainer.innerHTML = `
      <input id="ig-manual-id" style="flex: 1; padding: 8px; border: 1px solid #444; border-radius: 6px; background: #222; color: white;" 
        placeholder="Enter your Instagram user ID">
      <button id="ig-manual-submit" style="padding: 8px 12px; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer;">Submit</button>
    `;

    // Insert the input before the button container
    overlay.querySelector("div").before(inputContainer);

    // Return a promise that resolves with the ID when submitted
    return new Promise((resolve) => {
      const input = overlay.querySelector("#ig-manual-id");
      const submitBtn = overlay.querySelector("#ig-manual-submit");

      submitBtn.onclick = () => {
        const value = input.value.trim();
        if (value) {
          inputContainer.remove();
          resolve(value);
        } else {
          input.style.borderColor = "#f44336";
        }
      };

      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          submitBtn.click();
        }
      };
    });
  }

  async function run() {
    try {
      startBtn.disabled = true;
      status.textContent = "Detecting account…";

      const account = detectAccount();
      let userId = detectUserId();

      // If automatic detection fails, prompt for manual input
      if (!userId) {
        status.textContent =
          "⚠️ Could not detect account ID automatically. Please enter it manually.";

        // Show a help message with instructions on how to find your ID
        const helpText = document.createElement("p");
        helpText.style.cssText =
          "margin: 8px 0; font-size: 14px; opacity: 0.8; max-width: 600px; text-align: center;";
        helpText.innerHTML = `
          To find your Instagram ID:<br>
          1. Right-click your page and select "View Page Source"<br>
          2. Press Ctrl+F and search for "profile_id"<br>
          3. You'll see something like "profile_id":"12345678" - copy the number
        `;
        status.after(helpText);

        // Wait for manual input
        userId = await promptForUserId();
        helpText.remove();
      }

      // Preload totals from GraphQL counts on first page; initialize UI
      totFollowers = 0;
      totFollowing = 0;
      updateProgress();

      // Followers query_hash (stable as of now)
      const followersList = await fetchList(
        "c76146de99bb02f6415203be841dd25a",
        { id: userId, include_reel: true, fetch_mutual: true, first: 50 },
        "followers"
      );

      // Following query_hash
      const followingList = await fetchList(
        "d04b0a864b4b54837c0d870b0e77e076",
        { id: userId, include_reel: true, fetch_mutual: true, first: 50 },
        "following"
      );

      // Merge followers and following, noting their status in both
      const allUsers = new Map();

      // Process followers
      followersList.forEach((user) => {
        allUsers.set(user.username.toLowerCase(), {
          ...user,
          follower: true,
          following: false, // Default, will be updated if also in following list
        });
      });

      // Process following
      followingList.forEach((user) => {
        const key = user.username.toLowerCase();
        if (allUsers.has(key)) {
          // User is both follower and following
          const existingUser = allUsers.get(key);
          existingUser.following = true;
          existingUser.order_index_following = user.order_index;
        } else {
          // User is only in following
          allUsers.set(key, {
            ...user,
            follower: false,
            following: true,
          });
        }
      });

      // Convert to changed_users array
      const changedUsers = Array.from(allUsers.values());

      // Format to match instagram_export_diff.json structure
      const out = {
        account,
        snapshots: [
          {
            timestamp: new Date().toISOString(),
            changed_users: changedUsers,
          },
        ],
        schema: {
          version: 1,
        },
        enriched_at: new Date().toISOString(),
      };

      status.textContent = `✅ Done! Followers: ${followersList.length}, Following: ${followingList.length}`;
      bar.style.width = "100%";
      dlBtn.style.visibility = "visible";
      dlBtn.onclick = () => {
        const pad = (n) => String(n).padStart(2, "0");
        const d = new Date();
        const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
          d.getDate()
        )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        const blob = new Blob([JSON.stringify(out, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `snapshot_${account.username}_${stamp}.json`; // distinct from dashboard export
        a.click();
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error(err);

      // Display a more helpful error message
      const errorMsg = err?.message || String(err);
      status.textContent = "❌ Error: " + errorMsg;

      // Add extra instructions for common errors
      if (errorMsg.includes("401") || errorMsg.includes("403")) {
        const helpText = document.createElement("p");
        helpText.style.cssText =
          "margin: 8px 0; font-size: 14px; max-width: 600px; text-align: center; color: #f97316;";
        helpText.innerHTML = `
          This looks like an authentication error. Try these steps:<br>
          1. Make sure you're logged into Instagram in this browser<br>
          2. Try refreshing the page first<br>
          3. If using incognito/private mode, try a regular browser window<br>
          4. Instagram might be rate-limiting requests - try again later
        `;
        status.after(helpText);
        startBtn.disabled = false;
      }
    }
  }

  startBtn.onclick = run;
})();
