"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster
        toastOptions={{
          classNames: {
            toast: "!border !rounded-md",
            success: "!bg-green-500 !text-white !border-green-600",
            error: "!bg-red-500 !text-white !border-red-600",
            warning: "!bg-yellow-500 !text-white !border-yellow-600",
            info: "!bg-blue-500 !text-white !border-blue-600",
            loading: "!bg-purple-500 !text-white !border-purple-600",
            default: "!bg-gray-500 !text-white !border-gray-600",
          },
        }}
      />
    </>
  );
}
