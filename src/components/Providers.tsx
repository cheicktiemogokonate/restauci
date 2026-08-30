"use client";

import React from "react";

export default function Providers({
  children,
  exposeE2eHydration = false,
}: {
  children: React.ReactNode;
  exposeE2eHydration?: boolean;
}) {
  React.useEffect(() => {
    if (!exposeE2eHydration) return;
    document.documentElement.dataset.e2eHydrated = "true";
    return () => {
      delete document.documentElement.dataset.e2eHydrated;
    };
  }, [exposeE2eHydration]);

  return (
    <>
      {children}
    </>
  );
}
