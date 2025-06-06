// src/hooks/useCurrentUser.js
import { useEffect, useState } from "react";

export function useCurrentUser() {
  const [user, setUser] = useState(null);    // { id, username, role } or null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token"); // or wherever you store it
    if (!token) {
      setLoading(false);
      return;
    }
    async function fetchUser() {
      try {
        const resp = await fetch("http://localhost:5000/user/me", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resp.ok) {
          setUser(null);
        } else {
          const data = await resp.json();
          setUser(data); // { id, username, role }
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading };
}
