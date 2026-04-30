"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthProvider";
import { apiBaseUrl, getAuthHeaders, readErrorMessage } from "../lib/api";

const CartContext = createContext(null);

const getCartStorageKey = (userId) => `cart_items_${userId}`;

const readStoredCart = (userId) => {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  try {
    const raw = localStorage.getItem(getCartStorageKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (_error) {
    return [];
  }
};

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user?._id) {
      setItems([]);
      return;
    }

    setItems(readStoredCart(user._id));
  }, [user?._id]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?._id) {
      return;
    }

    localStorage.setItem(getCartStorageKey(user._id), JSON.stringify(items));
  }, [items, user?._id]);

  const addItem = (artwork) => {
    if (!artwork?._id) {
      return false;
    }

    let added = false;
    setItems((prev) => {
      const found = prev.find((item) => item._id === artwork._id);
      if (found) {
        return prev;
      }

      added = true;
      return [
        ...prev,
        {
          _id: artwork._id,
          objectId: artwork.objectId,
          title: artwork.title,
          artistDisplayName: artwork.artistDisplayName,
          quantity: 1
        }
      ];
    });
    return added;
  };

  const removeItem = (artworkId) => {
    setItems((prev) => prev.filter((item) => item._id !== artworkId));
  };

  const clearCart = () => setItems([]);

  const submitPendingPurchase = async () => {
    if (!token || !user?._id) {
      throw new Error("You must be logged in as a buyer.");
    }
    if (items.length === 0) {
      throw new Error("Cart is empty.");
    }

    const response = await fetch(`${apiBaseUrl}/api/acquisitions/purchase-requests`, {
      method: "POST",
      headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        items: items.map((item) => ({
          artworkId: item.objectId,
          quantity: 1
        }))
      })
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const payload = await response.json();
    setItems([]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("buyer-purchase-submitted"));
    }
    return payload?.data ?? { created: 0, unchanged: 0, skipped: [] };
  };

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const hasItem = (artworkId) => items.some((item) => item._id === artworkId);

  const value = useMemo(
    () => ({
      items,
      totalItems,
      addItem,
      removeItem,
      clearCart,
      submitPendingPurchase,
      hasItem
    }),
    [items, totalItems, token, user?._id]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider.");
  }
  return value;
};
