"use client";

import { AuthProvider } from "./AuthProvider";
import { CartProvider } from "./CartProvider";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
