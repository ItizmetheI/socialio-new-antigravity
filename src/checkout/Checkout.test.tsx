import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "../context/CartContext";

const { useCart, useAuth } = vi.hoisted(() => ({ useCart: vi.fn(), useAuth: vi.fn() }));
vi.mock("../context/CartContext", () => ({ useCart }));
vi.mock("../lib/auth/AuthContext", () => ({ useAuth }));
vi.mock("../lib/supabase", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("../components/NavBar", () => ({ default: () => null }));

import Checkout, { friendlyCheckoutError } from "./Checkout";

const item = (id: string, price: number, type: CartItem["type"]): CartItem => ({
  id,
  serviceId: id,
  title: `Service ${id}`,
  levelLabel: "Standard",
  price,
  type,
});

const renderCheckout = () =>
  render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pricing" element={<div>Pricing page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("Checkout", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ session: null, isLoading: false });
  });

  it("charges everything today, then only the monthly services", () => {
    useCart.mockReturnValue({
      items: [item("social", 499, "service"), item("seo", 250.5, "service"), item("shoot", 99.9, "addon")],
    });
    renderCheckout();

    const dueToday = screen.getByText("Due today").parentElement!;
    expect(dueToday).toHaveTextContent("$849.40");
    expect(screen.getByText(/^Then \$749\.50\/month/)).toBeInTheDocument();
  });

  it("has no recurring line for an add-on-only cart", () => {
    useCart.mockReturnValue({ items: [item("shoot", 99.9, "addon")] });
    renderCheckout();
    expect(screen.getByText("Due today").parentElement!).toHaveTextContent("$99.90");
    expect(screen.queryByText(/\/month/)).not.toBeInTheDocument();
  });

  it("offers sign-in instead of payment when signed out", () => {
    useCart.mockReturnValue({ items: [item("social", 499, "service")] });
    renderCheckout();
    expect(screen.queryByRole("button", { name: /pay securely/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the pay button when signed in", () => {
    useAuth.mockReturnValue({ session: { user: { id: "u" } }, isLoading: false });
    useCart.mockReturnValue({ items: [item("social", 499, "service")] });
    renderCheckout();
    expect(screen.getByRole("button", { name: /pay securely/i })).toBeInTheDocument();
  });

  it("redirects to /pricing when the cart is empty", () => {
    useCart.mockReturnValue({ items: [] });
    renderCheckout();
    expect(screen.getByText("Pricing page")).toBeInTheDocument();
    expect(screen.queryByText("Checkout")).not.toBeInTheDocument();
  });

  it("shows cart problems as-is but turns server and network failures into a retry message", () => {
    expect(friendlyCheckoutError("Unrecognized cart item: x / y", 400)).toBe("Unrecognized cart item: x / y");
    expect(friendlyCheckoutError("Request rate limit exceeded", 502)).toMatch(/^Checkout is busy/);
    expect(friendlyCheckoutError("Edge Function returned a non-2xx status code", 503)).toMatch(/^Checkout is busy/);
    expect(friendlyCheckoutError("Failed to send a request to the Edge Function")).toMatch(/^Checkout is busy/);
  });
});
