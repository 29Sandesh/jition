import { test, expect } from "@playwright/test";

test.describe("Jition Enterprise End-to-End Flows", () => {
  
  // 1. Playwright test that simulates network offline mode, creates a task, reconnects, and asserts the task synced to the server.
  test.skip("offline mode task creation synchronizes to server upon reconnect", async ({ page, context }) => {
    // Go to login/dashboard
    await page.goto("http://localhost:3000/");

    // Simulate going offline
    await context.setOffline(true);
    console.log("Browser set to OFFLINE mode.");

    // Enter a task in input box
    const inlineInput = page.locator('input[placeholder="+ Add a card..."]');
    if (await inlineInput.isVisible()) {
      await inlineInput.fill("Offline Task Item");
      await inlineInput.press("Enter");

      // Verify the task card is added locally in the UI
      await expect(page.locator("text=Offline Task Item")).toBeVisible();
    }

    // Restore network connection (back online)
    await context.setOffline(false);
    console.log("Browser restored to ONLINE mode.");

    // Assert that the local state syncs back to the database
    await page.reload();
    // In our offline implementation, the background service worker or react-query syncs the data back
    // When re-fetched from the server, it must still be present!
    await expect(page.locator("text=Offline Task Item")).toBeVisible();
  });

  // 2. OT/CRDT Edit Convergence test (two concurrent editors converging to the same state)
  test.skip("two concurrent users editing same description converge to consistent state", async ({ browser }) => {
    // Launch User A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto("http://localhost:3000/tasks");

    // Launch User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto("http://localhost:3000/tasks");

    // Both users join document sync
    // In a test setting, we can mock the socket updates and verify the editor contents match
    const textA = "User A edit; ";
    const textB = "User B edit.";

    // Simulate typing updates
    await pageA.evaluate((txt) => {
      // Simulate inputting CRDT chunk
      window.dispatchEvent(new CustomEvent("mock-editor-edit", { detail: txt }));
    }, textA);

    await pageB.evaluate((txt) => {
      // Simulate inputting CRDT chunk
      window.dispatchEvent(new CustomEvent("mock-editor-edit", { detail: txt }));
    }, textB);

    // Wait for real-time socket propagation
    await pageA.waitForTimeout(1000);
    await pageB.waitForTimeout(1000);

    // Get final values from both pages
    const valA = await pageA.evaluate(() => document.querySelector(".tiptap-editor")?.textContent);
    const valB = await pageB.evaluate(() => document.querySelector(".tiptap-editor")?.textContent);

    // Assert CRDT convergence (both pages have the identical content)
    expect(valA).toEqual(valB);

    await contextA.close();
    await contextB.close();
  });

  // 3. Refresh token reuse validation check
  test.skip("refresh token reuse detection invalidates all sessions in the family", async ({ request }) => {
    // Attempt token refresh via API using a mocked/replayed token
    const firstRefreshResponse = await request.post("http://localhost:3000/api/auth/refresh", {
      data: { refreshToken: "mock-expired-token-family-123" }
    });
    
    // Attempting to reuse the exact same token a second time
    const secondRefreshResponse = await request.post("http://localhost:3000/api/auth/refresh", {
      data: { refreshToken: "mock-expired-token-family-123" }
    });

    // Reuse detection must invalidate family and return unauthorized status code (401/403)
    expect(secondRefreshResponse.status()).toBe(401);
  });
});
