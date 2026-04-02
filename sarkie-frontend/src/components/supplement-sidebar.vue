<template>
  <div class="sidebar">
    <h2>Your Supplements</h2>

    <!-- If user is logged in -->
    <div v-if="user">
      <!-- If there are supplements, list them. Otherwise, say "No supplements..." -->
      <ul v-if="supplements.length">
        <li
          v-for="supplement in supplements"
          :key="supplement.id"
          @click="selectSupplement(supplement)"
          :class="{ removable: removeMode, editable: editMode }"
        >
          <span>{{ supplement.name }} - {{ supplement.dosage }} ({{ supplement.frequency }})</span>
        </li>
      </ul>
      <p v-else>No supplements added yet.</p>

      <!-- Buttons and forms for adding/removing -->
      <button @click="showAddForm = !showAddForm" class="toggle-btn">
        {{ showAddForm ? "Cancel" : "Add Supplement" }}
      </button>

      <div v-if="showAddForm" class="inline-form">
        <input
          v-model="newSupplement.name"
          type="text"
          placeholder="Supplement Name"
          class="input-field"
        />
        <input
          v-model="newSupplement.dosage"
          type="text"
          placeholder="Dosage (e.g., 500mg)"
          class="input-field"
        />
        <input
          v-model="newSupplement.frequency"
          type="text"
          placeholder="Frequency (e.g., Daily)"
          class="input-field"
        />
        <button @click="addSupplement" class="confirm-btn">Save</button>
      </div>

      <button @click="toggleRemoveMode" class="toggle-btn remove-btn">
        {{ removeMode ? "Cancel Remove" : "Remove Supplement" }}
      </button>

      <div v-if="showRemoveConfirm" class="inline-form">
        <p>Are you no longer taking this supplement?</p>
        <button @click="confirmDelete" class="confirm-btn">Yes</button>
        <button @click="showRemoveConfirm = false" class="cancel-btn">No</button>
      </div>

      <button @click="toggleEditMode" class="toggle-btn edit-btn">
        {{ editMode ? "Cancel Edit" : "Edit Supplement" }}
      </button>

      <div v-if="showEditForm" class="inline-form">
        <input v-model="editData.name" type="text" placeholder="Supplement Name" class="input-field" />
        <input v-model="editData.dosage" type="text" placeholder="Dosage (e.g., 500mg)" class="input-field" />
        <input v-model="editData.frequency" type="text" placeholder="Frequency (e.g., Daily)" class="input-field" />
        <button @click="saveEdit" class="confirm-btn">Save</button>
        <button @click="showEditForm = false" class="cancel-btn">Cancel</button>
      </div>
    </div>

    <!-- If user is NOT logged in -->
    <div v-else>
      <p>
        <router-link to="/login">Login</router-link>
        or
        <router-link to="/register">Register</router-link>
        to begin supplement tracking!
      </p>
    </div>
  </div>
</template>

<script>
import { api } from "../Services/api";

export default {
  name: "SupplementSidebar",
  data() {
    return {
      supplements: [],
      showAddForm: false,
      showRemoveConfirm: false,
      removeMode: false,
      editMode: false,
      showEditForm: false,
      selectedSupplementId: null,
      editData: { name: "", dosage: "", frequency: "" },
      newSupplement: { name: "", dosage: "", frequency: "" },
      user: JSON.parse(localStorage.getItem("user")) || null,
    };
  },
  mounted() {
    // Fetch supplements only if user is logged in
    if (this.user) {
      this.fetchSupplements();
    }
  },
  methods: {
    async fetchSupplements() {
      try {
        const response = await api.get(`/supplements/${this.user.id}`);
        this.supplements = response.data;
      } catch (error) {
        console.error("❌ Error fetching supplements:", error);
      }
    },
    async addSupplement() {
      if (!this.newSupplement.name.trim()) return;

      try {
        const response = await api.post("/supplements", {
          user_id: this.user.id,
          name: this.newSupplement.name,
          dosage: this.newSupplement.dosage,
          frequency: this.newSupplement.frequency,
        });
        const addedSupplement = response.data;
        this.supplements.push(addedSupplement);
        this.newSupplement = { name: "", dosage: "", frequency: "" };
        this.showAddForm = false;
      } catch (error) {
        console.error("❌ Error adding supplement:", error);
      }
    },
    toggleRemoveMode() {
      this.removeMode = !this.removeMode;
      if (this.removeMode) this.editMode = false;
    },
    selectSupplement(supplement) {
      if (this.removeMode) {
        this.selectedSupplementId = supplement.id;
        this.showRemoveConfirm = true;
      } else if (this.editMode) {
        this.selectedSupplementId = supplement.id;
        this.editData = { name: supplement.name, dosage: supplement.dosage, frequency: supplement.frequency };
        this.showEditForm = true;
      }
    },
    toggleEditMode() {
      this.editMode = !this.editMode;
      this.showEditForm = false;
      if (this.editMode) this.removeMode = false;
    },
    async saveEdit() {
      try {
        const response = await api.put(`/supplements/${this.selectedSupplementId}`, this.editData);
        const idx = this.supplements.findIndex(s => s.id === this.selectedSupplementId);
        if (idx !== -1) this.supplements[idx] = response.data;
        this.showEditForm = false;
        this.editMode = false;
      } catch (error) {
        console.error("Error updating supplement:", error);
      }
    },
    async confirmDelete() {
      try {
        await api.delete(`/supplements/${this.selectedSupplementId}`);
        this.supplements = this.supplements.filter(
          (sup) => sup.id !== this.selectedSupplementId
        );
        this.showRemoveConfirm = false;
        this.removeMode = false;
      } catch (error) {
        console.error(" Error deleting supplement:", error);
      }
    },
  },
};
</script>



<style>
.sidebar {
  width: 250px;
  background: #444654;
  color: white;
  padding: 20px;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center; 
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 10px;
}

ul {
  list-style: none;
  padding: 0;
  width: 100%;
}

li {
  background: #565869;
  padding: 10px;
  margin: 5px -20px;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(100% + 20px);
}

li span {
  width: 100%;
  text-align: center;
}

li.removable {
  background: #ff4d4d;
  cursor: pointer;
}

li.editable {
  background: #4daf4d;
  cursor: pointer;
}

.toggle-btn {
  width: 100%;
  padding: 10px;
  background: #565869;
  color: white;
  border: none;
  cursor: pointer;
  margin-top: 10px;
  border-radius: 5px;
  text-align: center;
}

.toggle-btn:hover {
  background: #66677a;
}

.remove-btn {
  background: #ff4d4d;
}

.remove-btn:hover {
  background: #cc0000;
}

.edit-btn {
  background: #4daf4d;
}

.edit-btn:hover {
  background: #3d963d;
}

.inline-form {
  background: #565869;
  padding: 10px;
  margin-top: 10px;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
}

.inline-form input {
  width: 90%;
  padding: 8px;
  margin: 5px 0;
  border-radius: 5px;
  border: none;
  background: #66677a;
  color: white;
}

.inline-form input::placeholder {
  color: #ccc;
}

.inline-form button {
  padding: 8px;
  margin-top: 5px;
  border: none;
  cursor: pointer;
  background: #444654;
  color: white;
  border-radius: 5px;
  width: 100%;
  text-align: center;
}

.inline-form button:hover {
  background: #66677a;
}

.confirm-btn {
  background: #007bff;
}

.confirm-btn:hover {
  background: #0056b3;
}

.cancel-btn {
  background: #565869;
}
</style>
