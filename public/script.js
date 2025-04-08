const typingForm = document.querySelector(".typing-form");
const chatList = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion-list .suggestion");
const toggleThemeButton = document.querySelector("#toggle-theme-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_PATH = "http://localhost:3000";
// const API_PATH = "https://jurisight.onrender.com"

const loadChatHistory = async () => {
  try {
    const response = await fetch(`${API_PATH}/chat-history`, {
      method: "GET",
      headers: {
        "x-auth-token": localStorage.getItem("token"), // Assuming token is stored in local storage
      },
    });

    if (!response.ok) throw new Error("Failed to fetch chat history");

    const chats = await response.json();

    chatList.innerHTML = ""; // Clear existing chats

    if (chats.length === 0) {
      document.body.classList.remove("hide-header");
    } else {
      document.body.classList.add("hide-header");
    }

    chats.forEach((chat) => {
      // Display user's message (outgoing)
      const userMessageDiv = document.createElement("div");
      userMessageDiv.classList.add("message", "outgoing");
      let formattedUserMessage = chat.message.replace(/\s+/g, " ").trim();
      userMessageDiv.innerHTML = `
        <div class="message-content">
          <img src="user.png" alt="User Image" class="avatar">
          <p class="text" style="text-align: justify; display: block; width: 80%;">${formattedUserMessage}</p>
        </div>
      `;
      chatList.appendChild(userMessageDiv);

      // Display chatbot's response (incoming)
      const botMessageDiv = document.createElement("div");
      botMessageDiv.classList.add("message", "incoming");
      let isCaseRetrieval = chat.response.includes("http"); // Check if response contains a link
      let textWidth = isCaseRetrieval ? "90%" : "80%";
      let formattedResponse = chat.response.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" style="color: blue; text-decoration: underline;">$1</a>'
      );
      botMessageDiv.innerHTML = `
        <div class="message-content">
          <img src="Jurisight.png" alt="Bot" class="avatar">
          <p class="text" style="text-align: justify; display: block; width: ${textWidth};">${formattedResponse}</p>
        </div>
      `;
      chatList.appendChild(botMessageDiv);
    });

    document.body.classList.toggle("hide-header", chatList.children.length > 0);
    chatList.scrollTo(0, chatList.scrollHeight);
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
};

document.addEventListener("DOMContentLoaded", loadChatHistory);

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

  if (!textElement.style.textAlign) {
    let isCaseRetrieval = text.includes("http");
    let textWidth = isCaseRetrieval ? "90%" : "80%";
    textElement.style.textAlign = "justify";
    textElement.style.display = "block";
    textElement.style.width = textWidth;
  }
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
      } else {
        textElement.innerText +=
          (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
      }
    } else {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
    }
    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
  }, 75);
};

const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
    const response = await fetch(`${API_PATH}/chat`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const apiResponse = data.response.replace(/\*\*(.*?)\*\*/g, "$1");
    showTypingEffect(apiResponse, textElement, incomingMessageDiv);
  } catch (error) {
    console.error("Error:", error.message);
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
        <p class="text" style="text-align: justify; display: block; width: 80%;"></p>
      </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatList.appendChild(outgoingMessageDiv);

  typingForm.reset(); // Clear input field
  chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
  if (!document.body.classList.contains("hide-header")) {
    document.body.classList.add("hide-header");
  }
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
deleteChatButton.addEventListener("click", async () => {
  if (confirm("Are you sure you want to delete all messages?")) {
    try {
      const response = await fetch(`${API_PATH}/delete-chat-history`, {
        method: "DELETE",
        headers: {
          "x-auth-token": localStorage.getItem("token"),
        },
      });

      if (!response.ok) throw new Error("Failed to delete chat history");

      chatList.innerHTML = ""; // Clear the chat display
      document.body.classList.remove("hide-header");
    } catch (error) {
      console.error("Error deleting chat history:", error);
    }
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
      headers: {
        "x-auth-token": localStorage.getItem("token"), // Add token
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error summarizing the PDF");
    }

    const data = await response.json();

    if (
      !data.summary ||
      typeof data.summary !== "string" ||
      data.summary.trim() === ""
    ) {
      throw new Error("No valid summary received from the backend");
    }

    // Clean the summary
    const summary = data.summary
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/undefined/g, ""); // Remove "undefined" strings

    // Replace the loading indicator with the final summary
    incomingMessageDiv.classList.remove("loading");
    showTypingEffect(
      summary,
      incomingMessageDiv.querySelector(".text"),
      incomingMessageDiv
    );
  } catch (error) {
    incomingMessageDiv.querySelector(".text").innerText =
      "Error: " + error.message;
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
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ top_k }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error retrieving cases");

    const caseLinks =
      `The following are the similar cases retrieved:<br><br>` +
        data?.case_links
          .map(
            (item) =>
              `<a href="${item.url}" target="_blank" style="color: blue; text-decoration: underline; text-decoration-color: currentColor;">${item.url}</a>`
          )
          .join("<br><br>") || "No cases found";
    incomingMessageDiv.classList.remove("loading");
    showTypingEffect(
      caseLinks,
      incomingMessageDiv.querySelector(".text"),
      incomingMessageDiv
    );
  } catch (error) {
    incomingMessageDiv.querySelector(".text").innerText =
      "Error: " + error.message;
    incomingMessageDiv.querySelector(".text").classList.add("error");
    incomingMessageDiv.classList.remove("loading");
  }
};

// Handle file uploads
document
  .getElementById("file-upload")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) summarizePDF(file);
  });

function retrieveValue() {
  const value = prompt(
    "Enter the number of similar case links you want to retrieve: "
  );
  const top_k = value !== null && !isNaN(value) ? parseInt(value) : 10;
  if (value !== null && !isNaN(value)) {
    alert(`You entered: ${value}`);
    retrieveCases(top_k);
  } else {
    alert("Please enter the number of similar case links you want to retrieve");
  }
}

if (token) {
    localStorage.setItem("token", token);
    window.history.replaceState({}, document.title, "index.html"); // Remove token from URL
    alert("Login successful!");
}

window.onload = function () {
  if (!localStorage.getItem("token")) {
    window.location.href = "login.html"; // Redirect to login if no token
  }

  // Push initial state to block back navigation
  history.pushState(null, null, location.href);
  window.onpopstate = function () {
    history.pushState(null, null, location.href); // Prevent back navigation
    alert("You cannot go back to the login page. Please logout to exit.");
  };
};

// Token expiry check
function isTokenExpired() {
  const token = localStorage.getItem("token");
  if (!token) return true;

  const payload = JSON.parse(atob(token.split(".")[1])); // Decode the token
  const expirationDate = new Date(payload.exp * 1000); // Convert to milliseconds
  return expirationDate < new Date();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (isTokenExpired()) {
    localStorage.removeItem("token");
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
    return;
  }

  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`${API_PATH}/tokenIsValid`, {
      method: "POST",
      headers: { "x-auth-token": token },
    });

    const isValid = await response.json();

    if (!isValid) {
      alert("Session expired. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Error validating token:", error);
    alert("An error occurred. Please login again.");
    window.location.href = "login.html";
  }
});

function toggleDropdown() {
  var dropdown = document.getElementById("dropdown-menu");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

async function handleOption(option) {
  if (option === "Draft") {
    window.open("https://ecourts.kerala.gov.in/digicourt/", "_blank");
  } else {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_PATH}/fetch-form-data`,
        {
          method: "GET",
          headers: { "x-auth-token": token },
        }
      );

      const data = await response.json();
      if (data.error) {
        alert('Please upload a document to see autofill feature');
      }

      localStorage.setItem("formData", JSON.stringify(data)); // Store data in localStorage

      window.open("draft.html", "_blank"); // Open in a new tab
    } catch (error) {
      console.error("Error fetching form data:", error);
    }
  }
}

async function fetchAndFillForm() {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `${API_PATH}/fetch-form-data`,
      {
        method: "GET",
        headers: { "x-auth-token": token },
      }
    );

    const data = await response.json();
    if (data.error) {
      console.error("Error:", data.error);
      return;
    }

    // Correct mapping between extracted JSON keys and form field IDs in draft.html
    const formMappings = {
      "Client Name": "name",
      "Gender": "gender",
      "Case Type": "case-type",
      "Client's Objectives": "subject",
      "Facts.Address": "address",
      "Facts.Additional Amount Demanded": "pincode",
      "Legal Analysis.Next Steps": "num-applications",
      "Legal Analysis.Prayer Details": "prayer-details",
      "Legal Analysis.Interim Relief Details": "interim-relief",
      "Legal Analysis.Grounds": "grounds",
    };

    for (const jsonKey in formMappings) {
      let fieldId = formMappings[jsonKey];
      let field = document.getElementById(fieldId);
      // Check if the field exists in the extracted JSON data
      if (field && data[jsonKey]) {
        if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
          field.value = data[jsonKey]; // Autofill input fields
        } else if (field.tagName === "SELECT") {
          for (const option of field.options) {
            if (option.text.toLowerCase().trim() === String(data[jsonKey]).toLowerCase().trim()) {
              option.selected = true;
              break;
            }
          }
        }
      }
    }

    // Autofill radio buttons for Custody, Crime, and Application Filing
    const radioMappings = {
      "custody": "Custody Status", 
      "crime": "Crime Registered", 
      "application": "Application Filing"
    };

    for (const fieldName in radioMappings) {
      let jsonKey = radioMappings[fieldName];
      let radioValue = data[jsonKey];

      if (radioValue) {
        let radioButtons = document.getElementsByName(fieldName);

        for (const button of radioButtons) {
          if (button.value.toLowerCase().trim() === String(radioValue).toLowerCase().trim()) {
            button.checked = true;
            break;
          }
        }
      }
    }

  } catch (error) {
    console.error("Error fetching form data:", error);
  }
}
document.addEventListener("DOMContentLoaded", fetchAndFillForm);

// Close the dropdown when clicking outside of it
window.onclick = function (event) {
  if (!event.target.matches(".download-btn")) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      dropdowns[i].style.display = "none";
    }
  }
};
// Logout button functionality
document.querySelector(".logout-btn").addEventListener("click", () => {
  localStorage.removeItem("token");
  alert("Logged out successfully!");
  window.location.href = "login.html";
});