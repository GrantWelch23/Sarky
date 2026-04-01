<template>
  <div class="chat-wrapper">
    <!-- Chat History -->
    <div class="chat-container">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="chat-message"
        :class="message.sender"
      >
        <!-- AI (SARK) Messages -->
        <div v-if="message.sender === 'sark'" class="sark">
          <img class="sark-avatar" src="/images/sark-avatar1.png" alt="SARK Avatar" />
          <p v-if="message.placeholder" class="sark-text">
            <em>{{ message.text }}</em>
          </p>
          <p v-else class="sark-text">{{ message.text }}</p>
        </div>

        <!-- User Messages -->
        <div v-if="message.sender === 'user'" class="user">
          <p class="user-text">{{ message.text }}</p>
        </div>
      </div>
    </div>

    <!-- Pinned Input (Bottom Chat Bar) -->
    <div
      class="chat-input-container"
      style="
        position: fixed;
        bottom: 0;
        left: 290px;
        width: calc(100% - 270px);
        background: #343541;
        border-top: 1px solid #565869;
        padding: 1rem 0;
        display: flex;
        justify-content: center;
        z-index: 1000;
      "
    >
      <div class="chat-input">
        <input
          v-model="userInput"
          type="text"
          placeholder="Message S.A.R.K..."
          @keyup.enter="sendMessage"
        />
        <button @click="sendMessage">Send</button>
        <button class="search-btn" @click="openSearch" title="Search chat history">🔍</button>
      </div>
    </div>

    <!-- Search Modal -->
    <div v-if="searchOpen" class="search-overlay" @click.self="closeSearch">
      <div class="search-modal">
        <div class="search-modal-header">
          <h3>Search Chat History</h3>
          <button class="close-btn" @click="closeSearch">✕</button>
        </div>

        <div class="search-input-row">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search messages..."
            @keyup.enter="runSearch"
            ref="searchInput"
            class="search-field"
          />
          <button class="search-go-btn" @click="runSearch">Search</button>
        </div>

        <!-- Results -->
        <div class="search-results">
          <p v-if="searchLoading" class="search-status">Searching...</p>
          <p v-else-if="searchDone && searchResults.length === 0" class="search-status">No results found.</p>

          <div
            v-for="result in searchResults"
            :key="result.id"
            class="search-result-row"
          >
            <div class="result-meta">
              <span class="result-sender" :class="result.sender === 'ai' ? 'sender-ai' : 'sender-user'">
                {{ result.sender === 'ai' ? 'SARK' : 'You' }}
              </span>
              <span class="result-time">{{ formatTimestamp(result.timestamp) }}</span>
            </div>
            <p class="result-message" v-html="highlight(result.message, searchQuery)"></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from "../Services/api";

export default {
  name: "ChatView",
  data() {
    return {
      userInput: "",
      messages: [
        {
          text: "Hello! I'm the Supplements Analysis and Research Kernel, but you can call me Sarky! My job is to help you achieve your health goals. If you'd like, you can share your health goals, or you can ask how I work!",
          sender: "sark",
        },
      ],
      user: JSON.parse(localStorage.getItem("user")) || null,
      searchOpen: false,
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
      searchDone: false,
    };
  },
  methods: {
    async sendMessage() {
      if (this.userInput.trim() === "") return;

      const userId = this.user ? this.user.id : null;
      const userMessage = this.userInput.trim();

      console.log("Sending message:", userMessage, "User ID:", userId);

      // 1) Add user message to chat immediately
      this.messages.push({ text: userMessage, sender: "user" });

      // 2) Clear input field so it doesn't hang
      this.userInput = "";

      // 3) Try saving user message to DB
      try {
        console.log("📥 [DB SAVE] Attempting to save USER message...");
        await api.post("/conversations", {
          user_id: userId,
          message: userMessage,
          sender: "user",
        });
        console.log("[DB SAVE SUCCESS] USER message saved.");
      } catch (error) {
        console.error("Error saving user message:", error);
      }

      // 4) Sark's placeholder "thinking..." message
      const placeholderIndex = this.messages.push({
        text: "Thinking...",
        sender: "sark",
        placeholder: true,
      }) - 1;

      // 5) Request AI response
      let aiReply = null;
      try {
        console.log("[API REQUEST] Sending message to AI...");
        const response = await api.post("/chat", {
          message: userMessage,
          user_id: userId,
        });

        console.log("Full response from AI endpoint:", response);

        aiReply = response.data?.reply || response.data?.message || null;
        if (!aiReply) {
          throw new Error("Invalid AI response format - no 'reply' or 'message' field found.");
        }
      } catch (error) {
        console.error("Error receiving AI response:", error);
        this.messages.splice(placeholderIndex, 1);
        this.messages.push({
          text: "Sorry, there was an error. Please try again.",
          sender: "sark",
        });
        return;
      }

      // 6) Remove the placeholder, show the AI's reply
      this.messages.splice(placeholderIndex, 1);
      this.messages.push({ text: aiReply, sender: "sark" });

      // 7) Attempt to save AI response to DB
      try {
        console.log("[DB SAVE] Attempting to save AI response...");
        await api.post("/conversations", {
          user_id: userId,
          message: aiReply,
          sender: "ai",
        });
        console.log("[DB SAVE SUCCESS] AI message saved.");
      } catch (error) {
        console.error("Error saving AI response:", error);
      }
    },

    openSearch() {
      this.searchOpen = true;
      this.searchQuery = "";
      this.searchResults = [];
      this.searchDone = false;
      this.$nextTick(() => this.$refs.searchInput?.focus());
    },

    closeSearch() {
      this.searchOpen = false;
    },

    async runSearch() {
      if (!this.searchQuery.trim()) return;
      const userId = this.user ? this.user.id : null;
      if (!userId) return;

      this.searchLoading = true;
      this.searchDone = false;
      this.searchResults = [];

      try {
        const response = await api.get("/conversations/search", {
          params: { user_id: userId, query: this.searchQuery.trim() },
        });
        this.searchResults = response.data;
      } catch (error) {
        console.error("Search error:", error);
        this.searchResults = [];
      } finally {
        this.searchLoading = false;
        this.searchDone = true;
      }
    },

    highlight(text, query) {
      if (!query) return text;
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
    },

    formatTimestamp(ts) {
      if (!ts) return "";
      return new Date(ts).toLocaleString();
    },
  },
};
</script>




  
  <style>
  .chat-wrapper {
    display: flex;
    flex-direction: column;
    width: 800px;
    margin: 1rem auto 5rem auto;
  }
  
  .chat-container {
    display: flex;
    flex-direction: column;
    width: 800px;
    margin: 1rem auto 5rem auto;
  }
  
  .chat-message {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    max-width: 95%;
  }
  
  .sark {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .sark-avatar {
    width: 48px;
    height: 50px;
    border-radius: 50%;
    object-fit: contain;
    flex-shrink: 0;
  }
  
  .sark-text {
    background: none;
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
  }
  
  .user {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }
  
  .user-text {
    background: #444654;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    max-width: 60%;
    text-align: right;
  }
  
  .chat-input {
    width: 800px;
    display: flex;
    background: #40414f;
    padding: 10px;
    border-radius: 10px;
    align-items: center;
  }
  
  .chat-input input {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 5px;
    font-size: 1rem;
    background: #40414f;
    color: white;
  }
  
  .chat-input input:focus {
    outline: none;
  }
  
  .chat-input button {
    margin-left: 10px;
    padding: 10px 15px;
    border: none;
    background: #007bff;
    color: white;
    cursor: pointer;
    border-radius: 5px;
    font-size: 1rem;
  }
  
  .chat-input button:hover {
    background: #0056b3;
  }

  .search-btn {
    margin-left: 8px;
    padding: 10px 12px;
    border: none;
    background: #565869;
    color: white;
    cursor: pointer;
    border-radius: 5px;
    font-size: 1rem;
  }

  .search-btn:hover {
    background: #6e7082;
  }

  /* Search Modal Overlay */
  .search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-modal {
    background: #343541;
    border: 1px solid #565869;
    border-radius: 10px;
    width: 680px;
    max-height: 75vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #565869;
  }

  .search-modal-header h3 {
    color: white;
    margin: 0;
    font-size: 1.1rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .close-btn:hover {
    color: white;
  }

  .search-input-row {
    display: flex;
    gap: 8px;
    padding: 14px 20px;
    border-bottom: 1px solid #565869;
  }

  .search-field {
    flex: 1;
    padding: 10px 12px;
    background: #40414f;
    border: 1px solid #565869;
    border-radius: 6px;
    color: white;
    font-size: 0.95rem;
  }

  .search-field:focus {
    outline: none;
    border-color: #007bff;
  }

  .search-go-btn {
    padding: 10px 18px;
    background: #007bff;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .search-go-btn:hover {
    background: #0056b3;
  }

  /* Results List */
  .search-results {
    overflow-y: auto;
    padding: 10px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .search-status {
    color: #aaa;
    text-align: center;
    margin-top: 16px;
    font-size: 0.9rem;
  }

  .search-result-row {
    background: #40414f;
    border: 1px solid #565869;
    border-radius: 8px;
    padding: 12px 14px;
  }

  .result-meta {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 6px;
  }

  .result-sender {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .sender-ai {
    background: #1a4a6e;
    color: #7ec8f0;
  }

  .sender-user {
    background: #2e4a2e;
    color: #7ee87e;
  }

  .result-time {
    font-size: 0.75rem;
    color: #888;
  }

  .result-message {
    color: #ddd;
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .result-message mark {
    background: #f0c040;
    color: #000;
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
  