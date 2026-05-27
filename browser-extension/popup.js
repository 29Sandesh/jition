document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const titleInput = document.getElementById("title");
  const descInput = document.getElementById("description");
  
  titleInput.value = tab.title;

  // Execute script to get highlighted text
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      function: () => window.getSelection().toString(),
    },
    (results) => {
      let highlighted = "";
      if (results && results[0] && results[0].result) {
        highlighted = results[0].result;
      }
      descInput.value = highlighted ? `${highlighted}\n\nSource: ${tab.url}` : `Source: ${tab.url}`;
    }
  );

  // Handle submit
  document.getElementById("submitBtn").addEventListener("click", async () => {
    const title = titleInput.value;
    const description = descInput.value;
    const priority = document.getElementById("priority").value;
    const apiUrl = document.getElementById("apiUrl").value;
    const workspaceId = document.getElementById("workspaceId").value;
    
    if (!workspaceId) {
      document.getElementById("status").textContent = "Error: Please provide a Workspace ID.";
      document.getElementById("status").style.color = "red";
      return;
    }

    document.getElementById("status").textContent = "Creating task...";
    document.getElementById("status").style.color = "blue";

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({ title, description, priority, status: "Todo" }),
      });

      if (res.ok) {
        document.getElementById("status").textContent = "Success! Task created.";
        document.getElementById("status").style.color = "green";
      } else {
        const err = await res.json();
        document.getElementById("status").textContent = "Failed: " + (err.error || "Unknown error");
        document.getElementById("status").style.color = "red";
      }
    } catch (error) {
      document.getElementById("status").textContent = "Network Error: Is the API running?";
      document.getElementById("status").style.color = "red";
    }
  });
});
