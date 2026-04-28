"use client";
import React, { useEffect, useState } from "react";
import { api } from "../../../lib/axios";

export default function RtDashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/rt/iuran");
        setData(res.data.data ?? res.data);
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div>Loading RT dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>RT Dashboard (Iuran)</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
