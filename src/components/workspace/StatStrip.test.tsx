import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";
import StatStrip from "./StatStrip";

describe("StatStrip", () => {
  it("renders each stat's label, value and optional detail", () => {
    render(
      <StatStrip
        stats={[
          { label: "Open requests", value: 4, detail: <span>2 due this week</span> },
          { label: "Delivered", value: "12", isAccent: true },
        ]}
      />,
    );
    expect(screen.getByText("Open requests")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2 due this week")).toBeInTheDocument();
    expect(screen.getByText("12")).toHaveClass("text-primary");
    // Only the one stat with a detail renders the extra <dd>.
    expect(document.querySelectorAll("dd")).toHaveLength(3);
  });
});

describe("PageHeader", () => {
  it("renders title, description and action", () => {
    render(<PageHeader title="Requests" description="Everything in flight." action={<button>New request</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Requests" })).toBeInTheDocument();
    expect(screen.getByText("Everything in flight.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New request" })).toBeInTheDocument();
  });

  it("omits the description when not given", () => {
    const { container } = render(<PageHeader title="Results" />);
    expect(container.querySelector("p")).toBeNull();
  });
});
