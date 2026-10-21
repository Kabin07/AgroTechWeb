import { render, screen } from "@testing-library/react";
import App from "./App";

test("home page renders the main actions", async () => {
  window.localStorage.setItem("agrotech.lang", "en");
  render(<App />);
  expect(await screen.findByText("Sell your crop at the right price")).toBeInTheDocument();
  expect(screen.getAllByText("Check crop price").length).toBeGreaterThan(0);
});

test("home page renders in Hindi", async () => {
  window.localStorage.setItem("agrotech.lang", "hi");
  render(<App />);
  expect(await screen.findByText("अपनी फ़सल सही दाम पर बेचें")).toBeInTheDocument();
});
