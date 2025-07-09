"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}