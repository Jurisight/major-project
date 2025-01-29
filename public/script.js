const typingForm = document.querySelector(".typing-form");
const chatList = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion-list .suggestion");
const toggleThemeButton = document.querySelector("#toggle-theme-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_PATH = 'http://localhost:3000';

const loadLocalstorageData = () => {
  const savedChats = localStorage.getItem("savedChats");
  const isLightMode = localStorage.getItem("themeColor") === "light_mode";

  // Apply the stored theme
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
  
  chatList.innerHTML = savedChats || "";
  const savedLinks = chatList.querySelectorAll("a");
  savedLinks.forEach((link) => {
    link.target = "_blank"; // Ensure links open in a new tab
  });

  document.body.classList.toggle("hide-header", savedChats);
  chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
};

loadLocalstorageData();

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  if (!text || typeof text !== "string" || text.trim() === "") {
    console.error("Invalid text passed to showTypingEffect:", text);
    textElement.innerText = "No content to display.";
    incomingMessageDiv.querySelector(".icon").classList.remove("hide");
    isResponseGenerating = false;
    return;
  }
  
  textElement.style.textAlign = "justify";
  const words = text.split(/\s+/).filter((word) => word);
  console.log("Words for Typing Effect:", words);
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    // Append each word to the text element with a space
    // If all words are displayed
    if (currentWordIndex < words.length) {
      if (text.includes("<a")) {
        textElement.innerHTML = text;
        clearInterval(typingInterval);
      } else{
        textElement.innerText += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
      }
    }
    else {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("savedChats", chatList.innerHTML); // Saves chat to local storage
    }
    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
  }, 75);
};

const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
      const response = await fetch(`${API_PATH}/chat`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // This will throw an error if the response is not valid JSON
      const apiResponse = data.response.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove markdown formatting
      showTypingEffect(apiResponse, textElement, incomingMessageDiv);
  } catch (error) {
      console.error('Error:', error.message);
      isResponseGenerating = false;
      textElement.innerText = error.message || "Unexpected error occurred.";
      textElement.classList.add("error");
  } finally {
      incomingMessageDiv.classList.remove("loading");
  }
};


// Show a loading animation while waiting for the API response
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
          <img src="Jurisight.png" alt="logo" class="avatar">
          <p class="text"></p>
          <div class="loading-indicator">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
          </div>
      <span onclick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
      </div>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatList.appendChild(incomingMessageDiv);

  chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
  generateAPIResponse(incomingMessageDiv);
};

// Copy message text to the clipboard
const copyMessage = (copyIcon) => {
  const messageText = copyIcon.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyIcon.innerText = "done"; // Show tick icon
  setTimeout(() => (copyIcon.innerText = "content_copy"), 1000); // Revert icon after 1 second
};

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
  userMessage =
    typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return; // Exit if there is no message

  isResponseGenerating = true;

  const html = `<div class="message-content">
        <img src="user.png" alt="User Image" class="avatar">
        <p class="text"></p>
      </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatList.appendChild(outgoingMessageDiv);

  typingForm.reset(); // Clear input field
  chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
  document.body.classList.add("hide-header"); // Hide header once chat starts
  setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
};

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all messages?")) {
    localStorage.removeItem("savedChats");
    loadLocalstorageData();
  }
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
  e.preventDefault();

  handleOutgoingChat();
});

// Summarize uploaded PDF
const summarizePDF = async (file) => {
  const formData = new FormData();

  if (!(file instanceof File)) {
    alert("Invalid file uploaded. Please upload a valid PDF file.");
    return;
  }

  formData.append("file", file, file.name);

  // Display the loading animation
  const html = `<div class="message-content">
          <img src="Jurisight.png" alt="logo" class="avatar">
          <p class="text"></p>
          <div class="loading-indicator">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
          </div>
      <span onclick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
      </div>`;
  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatList.appendChild(incomingMessageDiv);
  chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
  document.body.classList.add("hide-header");
  try {
    const response = await fetch("/summarize", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error summarizing the PDF");
    }

    const data = await response.json();

    if (!data.summary || typeof data.summary !== "string" || data.summary.trim() === "") {
      throw new Error("No valid summary received from the backend");
    }

    // Clean the summary
    const summary = data.summary
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/undefined/g, ""); // Remove "undefined" strings

    // Replace the loading indicator with the final summary
    incomingMessageDiv.classList.remove("loading");
    showTypingEffect(summary, incomingMessageDiv.querySelector(".text"), incomingMessageDiv);
  } catch (error) {
    incomingMessageDiv.querySelector(".text").innerText = "Error: " + error.message;
    incomingMessageDiv.querySelector(".text").classList.add("error");
    incomingMessageDiv.classList.remove("loading");
  }
};


// Retrieve cases
const retrieveCases = async (top_k) => {
  const html = `<div class="message-content">
      <img src="Jurisight.png" alt="logo" class="avatar">
      <p class="text"></p>
      <div class="loading-indicator">
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
      </div>
    </div>`;
  
  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatList.appendChild(incomingMessageDiv);
  chatList.scrollTo(0, chatList.scrollHeight);
  document.body.classList.add("hide-header");
  try {
    const response = await fetch("/retrieve-cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ top_k }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error retrieving cases");

    const caseLinks = `The following are the similar cases retrieved:<br><br>` + data?.case_links
    .map(
      (item) =>
        `<a href="${item.url}" target="_blank" style="color: blue; text-decoration: underline; text-decoration-color: currentColor;">${item.url}</a>`
    )
    .join("<br><br>") || "No cases found";
    incomingMessageDiv.classList.remove("loading");
    showTypingEffect(caseLinks, incomingMessageDiv.querySelector(".text"), incomingMessageDiv);
    setTimeout(() => {
      localStorage.setItem("savedChats", chatList.innerHTML);
    }, 100);
  } catch (error) {
    incomingMessageDiv.querySelector(".text").innerText = "Error: " + error.message;
    incomingMessageDiv.querySelector(".text").classList.add("error");
    incomingMessageDiv.classList.remove("loading");
  }
};

// Handle file uploads
document.getElementById("file-upload").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) summarizePDF(file);
});

document.querySelector(".top-bar").appendChild(retrieveCasesButton);

function retrieveValue() {
  const value = prompt("Enter the number of similar case links you want to retrieve: ");
  const top_k = value !== null && !isNaN(value) ? parseInt(value) : 10;
  if (value !== null && !isNaN(value)) {
    alert(`You entered: ${value}`);
    retrieveCases(top_k);
  } else {
    alert("Please enter the number of similar case links you want to retrieve");
  }
}

