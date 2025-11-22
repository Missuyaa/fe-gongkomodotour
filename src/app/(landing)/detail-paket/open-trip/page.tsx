// app/(landing)/detail-paket/open-trip/page.tsx
"use client";

import DetailTrip from "@/components/ui-detail/intermediary/DetailTrip";
import { Suspense } from "react";

export default function OpenTripPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DetailTrip />
    </Suspense>
  );
}
