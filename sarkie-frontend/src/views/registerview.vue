<template>
  <div class="login-wrapper">
    <div class="login-container">
      <h2>Register</h2>

      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <label for="name">Name</label>
          <input v-model="name" type="text" id="name" required />
        </div>

        <div class="input-group">
          <label for="email">Email</label>
          <input v-model="email" type="email" id="email" required />
        </div>

        <div class="input-group">
          <label for="password">Password</label>
          <input v-model="password" type="password" id="password" required />
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
        </div>

        <div class="input-group">
          <label for="confirmPassword">Confirm Password</label>
          <input v-model="confirmPassword" type="password" id="confirmPassword" required />
          <p v-if="confirmError" class="field-error">{{ confirmError }}</p>
        </div>

        <button type="submit" class="register-btn">Register</button>
      </form>

      <p class="login-text">
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script>
import { api } from "../Services/api";

export default {
  name: "RegisterView",
  data() {
    return {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      errorMessage: "",
      passwordError: "",
      confirmError: "",
    };
  },
  methods: {
    validate() {
      this.passwordError = "";
      this.confirmError = "";
      let valid = true;

      if (this.password.length < 8) {
        this.passwordError = "Password must be at least 8 characters.";
        valid = false;
      }

      if (this.password !== this.confirmPassword) {
        this.confirmError = "Passwords do not match.";
        valid = false;
      }

      return valid;
    },

    async handleRegister() {
      if (!this.validate()) return;

      try {
        console.log("🔹 Attempting registration...");

        const response = await api.post("/auth/register", {
          name: this.name,
          email: this.email,
          password: this.password,
        });

        console.log(" Registration successful:", response.data);

        await this.sendVerificationCode(this.email);

        this.$router.push(
          `/verify-email?email=${encodeURIComponent(this.email)}`
        );
      } catch (error) {
        console.error(
          " Error registering:",
          error.response?.data?.error || error.message
        );
        this.errorMessage = error.response?.data?.error || error.message;
      }
    },

    async sendVerificationCode(email) {
      try {
        console.log(` Sending verification code to ${email}...`);

        const response = await api.post("/auth/send-verification-code", {
          email,
        });

        console.log(" Verification email sent:", response.data);
      } catch (error) {
        console.error(" Error sending verification code:", error);
        this.errorMessage =
          error.response?.data?.error ||
          "Error sending verification code. Please try again.";
      }
    },
  },
};
</script>


  
  <style scoped>
  .login-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #343541;
  }
  
  .login-container {
    background: #444654;
    padding: 2rem;
    border-radius: 10px;
    width: 320px;
    text-align: center;
  }
  
  h2 {
    color: white;
    margin-bottom: 1rem;
  }
  
  .input-group {
    margin-bottom: 1rem;
    text-align: left;
  }
  
  label {
    color: white;
    font-size: 0.9rem;
    display: block;
    margin-bottom: 5px;
  }
  
  input {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 5px;
    background: #565869;
    color: white;
    font-size: 1rem;
  }
  
  input:focus {
    outline: none;
    background: #6b6d75;
  }
  
  .register-btn {
    width: 100%;
    padding: 10px;
    background: #c97b06;
    color: white;
    font-size: 1rem;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 10px;
  }
  
  .register-btn:hover {
    background: #d88a08;
  }
  
  .login-text {
    margin-top: 15px;
    color: white;
    font-size: 0.9rem;
  }
  
  .login-text a {
    color: #c97b06;
    text-decoration: none;
    font-weight: bold;
  }
  
  .login-text a:hover {
    text-decoration: underline;
  }
  
  .error-message {
    color: red;
    margin-top: 10px;
  }

  .field-error {
    color: #ff6b6b;
    font-size: 0.8rem;
    margin-top: 4px;
  }
  </style>
  