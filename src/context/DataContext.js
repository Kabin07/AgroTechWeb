// Loads marketplace data for the signed-in user and keeps it fresh via realtime events.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { backend } from "../services/backend";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);
const EMPTY = { listings: [], requests: [], orders: [], jobs: [] };
const SAFETY_POLL_MS = 60000; // realtime can miss rows that stop matching RLS (e.g. sold listings)

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const [listings, requests, orders, jobs] = await Promise.all([
        backend.listListings(),
        backend.listRequests(),
        backend.listOrders(),
        backend.listTransportJobs(),
      ]);
      setData({ listings, requests, orders, jobs });
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return undefined;
    // Debounce bursts of realtime events (an order touches several tables).
    const unsubscribe = backend.subscribe(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 250);
    });
    const poll = setInterval(refresh, SAFETY_POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
      clearTimeout(timer.current);
    };
  }, [user, refresh]);

  // Wrap a backend action: run it, then refresh (realtime will also refresh other users).
  const run = useCallback(
    async (fn) => {
      const result = await fn(backend);
      await refresh();
      return result;
    },
    [refresh]
  );

  const value = useMemo(() => ({ ...data, loading, error, refresh, run }), [data, loading, error, refresh, run]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
