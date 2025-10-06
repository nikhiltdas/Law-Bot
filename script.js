<script type="module">

  const apiKey = ""; // Replace with your Gemini API key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  // === DOM Elements ===
  const chatWindow = document.getElementById("chat-window");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const sendIcon = document.getElementById("send-icon");
  const spinner = document.getElementById("spinner");

 

  Add a chat message (user or AI) to the window
  function addMessage(message, sender, sources = []) {
    const container = document.createElement("div");
    container.classList.add("flex", sender === "user" ? "justify-end" : "justify-start");

    const bubble = document.createElement("div");
    const isUser = sender === "user";

    bubble.classList.add(
      "max-w-xl", "p-4", "rounded-xl", "shadow-md",
      isUser ? "bg-indigo-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
    );

    // Label for AI messages
    if (!isUser) {
      const label = document.createElement("p");
      label.classList.add("font-semibold", "mb-1", "text-indigo-700");
      label.textContent = "AI Assistant";
      bubble.appendChild(label);
    }

    // Message content
    const content = document.createElement("p");
    content.innerHTML = message.replace(/\n/g, "<br>");
    bubble.appendChild(content);

    // Add citations (if any)
    if (sources.length > 0) {
      const sourcesContainer = document.createElement("div");
      sourcesContainer.classList.add("mt-3", "pt-2", "border-t", "border-gray-300", "text-xs", "text-gray-600");

      const title = document.createElement("p");
      title.classList.add("font-medium", "mb-1");
      title.textContent = "Sources:";
      sourcesContainer.appendChild(title);

      sources.forEach((src, i) => {
        const link = document.createElement("a");
        link.href = src.uri;
        link.target = "_blank";
        link.classList.add("block", "hover:underline", "truncate");
        link.textContent = `${i + 1}. ${src.title || src.uri}`;
        sourcesContainer.appendChild(link);
      });

      bubble.appendChild(sourcesContainer);
    }

    container.appendChild(bubble);
    chatWindow.appendChild(container);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  /** Toggle loading spinner and input state */
  function setLoading(isLoading) {
    sendButton.disabled = userInput.disabled = isLoading;
    sendIcon.classList.toggle("hidden", isLoading);
    spinner.classList.toggle("hidden", !isLoading);
  }

  // === Main Function ===

  window.sendMessage = async function () {
    const userText = userInput.value.trim();
    if (!userText) return;

    addMessage(userText, "user");
    userInput.value = "";
    setLoading(true);

    const systemPrompt = `
You are a helpful and responsible legal information assistant. 
Your goal is to provide accurate, general information based on reliable sources.

**CRITICAL DISCLAIMER RULE:** 
You MUST start every response with a bold disclaimer stating you are **NOT a substitute for a licensed attorney** 
and that the information is **for informational purposes only**. 
Never provide direct legal advice, representation, or forms.

Keep responses concise and professional.
    `;

    const payload = {
      contents: [{ parts: [{ text: userText }] }],
      tools: [{ google_search: {} }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    let responseData = null;
    const maxRetries = 3;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        responseData = await res.json();
        break;
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err);
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        } else {
          addMessage("Sorry, the API is currently unavailable. Please try again later.", "ai");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);

    const candidate = responseData?.candidates?.[0];
    const aiText = candidate?.content?.parts?.[0]?.text;

    if (aiText) {
      const sources =
        candidate.groundingMetadata?.groundingAttributions
          ?.map((a) => ({ uri: a.web?.uri, title: a.web?.title }))
          ?.filter((s) => s.uri && s.title) || [];

      addMessage(aiText, "ai", sources);
    } else {
      addMessage("I couldn't process your request. Please try rephrasing.", "ai");
    }
  };
</script>
