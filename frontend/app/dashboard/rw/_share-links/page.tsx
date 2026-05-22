"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import ShareLinkManager from "@/components/dashboard/ShareLinkManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RwShareLinksPage() {
  const { user } = useAuth();
  const scopeId = useMemo(() => user?.wilayah_rw_id ?? "", [user]);

  if (!scopeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share Link RW</CardTitle>
        </CardHeader>
        <CardContent>Wilayah RW tidak ditemukan pada sesi login.</CardContent>
      </Card>
    );
  }

  return <ShareLinkManager scope="RW" scopeId={scopeId} />;
}
