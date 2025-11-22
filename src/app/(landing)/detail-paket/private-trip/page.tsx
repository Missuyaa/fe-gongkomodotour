// app/(landing)/detail-paket/private-trip/page.tsx
"use client";

import DetailTrip from "@/components/ui-detail/intermediary/DetailTrip";
import { Suspense } from "react";

export default function PrivateTripPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DetailTrip />
    </Suspense>
  );
}
