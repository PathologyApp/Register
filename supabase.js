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
        const res = await fetch(`${baseUrl}?select=${query}`, {

          method: "GET",
          headers
        });
        return await res.json();
      },
      async delete(id, column = "id") {
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
  }
};
