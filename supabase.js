const SUPABASE_URL = "https://cgdnrdlrwxozkmjjlnog.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZG5yZGxyd3hvemttampsbm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjcxMzQsImV4cCI6MjA5MzQwMzEzNH0.PuXwx8ZShX7_seIs3c9-TJhXKCOyNUgb7RMxCOkynCU";

export const supabase = {
  async from(table) {
    const baseUrl = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    return {
      async insert(data) {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(data)
        });
        return await res.json();
      },
      async select(query = "*") {
        let allData = [];
        let offset = 0;
        const limit = 1000;
        
        while (true) {
          const res = await fetch(`${baseUrl}?select=${query}`, {
            method: "GET",
            headers: { 
              ...headers, 
              "Range-Unit": "items", 
              "Range": `${offset}-${offset + limit - 1}` 
            }
          });
          
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Select failed");
          }
          
          const chunk = JSON.parse(await res.text());
          allData = allData.concat(chunk);
          
          if (chunk.length < limit) break;
          offset += limit;
        }
        return allData;
      },
      async delete(id, column = "id") {
        if (!id || id === "undefined") throw new Error("Invalid ID for deletion");
        const res = await fetch(`${baseUrl}?${column}=eq.${id}`, {
          method: "DELETE",
          headers: { ...headers, "Prefer": "return=minimal" }
        });
        if (!res.ok) throw new Error("Delete failed");
        return true;
      },




      async update(id, data) {
        const res = await fetch(`${baseUrl}?id=eq.${id}`, {
          method: "PATCH",
          headers: { ...headers, "Prefer": "return=minimal" },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Update failed");
        }
        return true;
      }
    };
  },

  // ── Supabase Storage API ───────────────────────────────
  storage: {
    async upload(bucket, path, jsonData) {
      const blob = new Blob([JSON.stringify(jsonData)], { type: "application/json" });
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "x-upsert": "true"
        },
        body: blob
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Storage upload failed: ${err}`);
      }
      return true;
    },

    async list(bucket) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ limit: 100, offset: 0 })
      });
      if (!res.ok) return [];
      return await res.json();
    },

    async download(bucket, path) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!res.ok) throw new Error("Archive not found");
      return await res.json();
    },

    async remove(bucket, path) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      return res.ok;
    }
  }
};

