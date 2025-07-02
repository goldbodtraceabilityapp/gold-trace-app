// src/hooks/useCurrentUser.js
import { useEffect, useState } from "react";
import API from "../services/api";

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
        const resp = await API.get("/user/me");
        setUser(resp.data); // { id, username, role }
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
