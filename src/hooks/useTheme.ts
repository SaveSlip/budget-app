"use client";

import { useContext } from "react";
import { ThemeContext } from "@/components/providers";

export function useTheme() {
  return useContext(ThemeContext);
}
