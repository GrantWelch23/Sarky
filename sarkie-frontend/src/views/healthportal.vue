<template>
  <div class="health-portal">
    <!-- Keep title invisible for spacing -->
    <h1>Health Portal</h1>
    <div class="health-portal-layout">
      <section class="effects">
        <div class="effects-container">
          <div class="effects-box positive-effects">
            <ul v-if="userEffects.some(e => e.effect_type === 'positive')">
              <li
                v-for="(effect, index) in userEffects.filter(e => e.effect_type === 'positive')"
                :key="'pos-' + index"
                :class="{ 'delete-mode': isDeletingPositive }"
                @click="isDeletingPositive ? deleteSingleEffect(effect.id) : null"
              >
                {{ effect.effect_description }}
              </li>
            </ul>
            <p v-else class="default-text positive-text">
              You haven't logged any positive effects yet.
            </p>
            <div style="margin-top: auto; display: flex; gap: 10px;">
              <button
                class="remove-effect-btn"
                :class="{ activeDelete: isDeletingPositive }"
                @click="toggleDeleteMode('positive')"
              >
                {{ isDeletingPositive ? "Cancel Delete" : "Remove" }}
              </button>
              <button class="add-effect-btn" @click="showPositiveForm = true">
                Log Positive Effect
              </button>
            </div>
            <div v-if="showPositiveForm" class="inline-form">
              <input
                v-model="newPositiveEffect"
                type="text"
                class="effect-input"
                placeholder="Enter positive effect"
              />
              <button @click="submitPositiveEffect" class="submit-effect-btn">
                Save
              </button>
              <button @click="cancelPositiveEffect" class="cancel-effect-btn">
                Cancel
              </button>
            </div>
          </div>
          <div class="effects-box negative-effects">
            <ul v-if="userEffects.some(e => e.effect_type === 'negative')">
              <li
                v-for="(effect, index) in userEffects.filter(e => e.effect_type === 'negative')"
                :key="'neg-' + index"
                :class="{ 'delete-mode': isDeletingNegative }"
                @click="isDeletingNegative ? deleteSingleEffect(effect.id) : null"
              >
                {{ effect.effect_description }}
              </li>
            </ul>
            <p v-else class="default-text negative-text">
              You haven't logged any side effects yet.
            </p>
            <div style="margin-top: auto; display: flex; gap: 10px;">
              <button
                class="remove-effect-btn"
                :class="{ activeDelete: isDeletingNegative }"
                @click="toggleDeleteMode('negative')"
              >
                {{ isDeletingNegative ? "Cancel Delete" : "Remove" }}
              </button>
              <button class="add-effect-btn" @click="showNegativeForm = true">
                Log Side Effect
              </button>
            </div>
            <div v-if="showNegativeForm" class="inline-form">
              <input
                v-model="newNegativeEffect"
                type="text"
                class="effect-input"
                placeholder="Enter side effect"
              />
              <button @click="submitSideEffect" class="submit-effect-btn">
                Save
              </button>
              <button @click="cancelNegativeEffect" class="cancel-effect-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Supplement Usage Chart -->
      <section class="wellness">
        <SupplementChart />
      </section>


    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import SupplementChart from "../components/SupplementChart.vue";
import { api } from "../Services/api";

const user = JSON.parse(localStorage.getItem("user"));
const userId = user ? user.id : null;

const userEffects = ref([]);
const showPositiveForm = ref(false);
const showNegativeForm = ref(false);
const newPositiveEffect = ref("");
const newNegativeEffect = ref("");
const isDeletingPositive = ref(false);
const isDeletingNegative = ref(false);

const fetchEffectsData = async () => {
  if (!userId) {
    console.warn(" No user logged in.");
    return;
  }
  try {
    const response = await api.get(`/supplements/user-effects/${userId}`);
    console.log(" Effects Data:", response.data);
    userEffects.value = response.data;
  } catch (error) {
    console.error("Error fetching effects data:", error);
  }
};

const submitPositiveEffect = async () => {
  const desc = newPositiveEffect.value.trim();
  if (!desc) return;
  try {
    await api.post("/supplements/user-effects", {
      user_id: userId,
      effect_type: "positive",
      effect_description: desc,
    });
    newPositiveEffect.value = "";
    showPositiveForm.value = false;
    await fetchEffectsData();
  } catch (err) {
    console.error(" Error adding positive effect:", err);
  }
};

const submitSideEffect = async () => {
  const desc = newNegativeEffect.value.trim();
  if (!desc) return;
  try {
    await api.post("/supplements/user-effects", {
      user_id: userId,
      effect_type: "negative",
      effect_description: desc,
    });
    newNegativeEffect.value = "";
    showNegativeForm.value = false;
    await fetchEffectsData();
  } catch (err) {
    console.error(" Error adding side effect:", err);
  }
};

const cancelPositiveEffect = () => {
  newPositiveEffect.value = "";
  showPositiveForm.value = false;
};

const cancelNegativeEffect = () => {
  newNegativeEffect.value = "";
  showNegativeForm.value = false;
};

const toggleDeleteMode = (effectType) => {
  if (effectType === "positive") {
    isDeletingPositive.value = !isDeletingPositive.value;
    if (isDeletingPositive.value) {
      isDeletingNegative.value = false;
    }
  } else {
    isDeletingNegative.value = !isDeletingNegative.value;
    if (isDeletingNegative.value) {
      isDeletingPositive.value = false;
    }
  }
};

const deleteSingleEffect = async (effectId) => {
  try {
    console.log("Deleting effect ID:", effectId);
    await api.delete(`/supplements/user-effects/${effectId}`);
    await fetchEffectsData();
  } catch (error) {
    console.error(" Error deleting effect:", error);
  }
};

// Load effects when the page loads
onMounted(() => {
  fetchEffectsData();
});
</script>

<style scoped>
/* Full Page Layout */
.health-portal {
  width: 100vw;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  padding-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 97vh;
  overflow: hidden; /* ensures no scrolling */
}

/* Make "Health Portal" invisible but keep layout spacing */
.health-portal h1 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: transparent;
}

/* Expands to Full Width & Height */
.health-portal-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  gap: 15px;
  width: 98vw;
  height: 82vh;
  box-sizing: border-box;
}

/* Effects Container */
.effects-container {
  display: flex;
  justify-content: flex-end; /* keep them on the right */
  align-items: center;
  gap: 30px;
  width: 100%;
  max-width: 900px;
  margin-left: 200px; /* pushes the boxes to the right */
  margin-right: 50px;
}

/* Effects Boxes */
.effects-box {
  width: 400px;
  min-height: 400px;
  padding: 20px;
  border-radius: 10px;
  background: #FAE79B; 
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
  position: relative; /* Let the inline form position absolutely */
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  text-align: left; /* left align text/bullets */
  font-size: 1.2rem;
  overflow: hidden; /* ensures form won't overflow horizontally */
}

/* Default text for empty boxes */
.default-text {
  font-size: 1rem;
  margin-bottom: auto;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Default text colors */
.positive-text {
  color: #26734D;
}
.negative-text {
  color: #B22222;
}

/* Standard disc bullets, left aligned, no emojis */
.effects-box ul {
  list-style-type: disc;
  list-style-position: outside;
  margin: 0;
  padding-left: 20px; /* indent bullets */
  background: transparent;
}
.positive-effects li::marker {
  color: #26734D;
}
.negative-effects li::marker {
  color: #B22222;
}

/* Buttons at bottom-right */
.add-effect-btn {
  margin-top: auto;
  align-self: flex-end;
  padding: 10px 15px;
  background: #444654; 
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.add-effect-btn:hover {
  background: #66677a;
}

/* Inline Form flush with left, right, bottom */
.inline-form {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #faf2cc; 
  border-top: 1px solid #d2c18f;
  padding: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  box-sizing: border-box; /* ensures padding doesn't break flush edges */
}

/* Input inside inline form */
.effect-input {
  flex: 1;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #aaa;
  font-size: 1rem;
}

/* Submit/Cancel Buttons inside form */
.submit-effect-btn,
.cancel-effect-btn {
  padding: 8px 14px;
  background: #444654;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.submit-effect-btn:hover,
.cancel-effect-btn:hover {
  background: #66677a;
}

/* Remove borders & define colors */
.positive-effects {
  color: #26734D;
  border-left: none;
}
.negative-effects {
  color: #B22222;
  border-left: none;
}

/* Coming Soon Sections */
.coming-soon {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #e8e8e8;
  border-radius: 10px;
  padding: 40px;
  height: 100%;
  width: 100%;
  font-size: 1.4rem;
  font-weight: bold;
  color: #444;
}

/* Expand "Coming Soon" Sections */
.wellness {
  border-left: 8px solid blue;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* FINAL OVERRIDES to beat global li { ... }  */
.effects-box ul {
  list-style-type: disc !important;
  list-style-position: outside !important;
  padding-left: 20px !important;
  margin: 0 !important;
  width: auto !important;
}
.effects-box ul li {
  display: list-item !important;
  background: none !important;
  margin: 0 0 6px 0 !important;
  padding: 0 !important;
  border-radius: 0 !important;
  width: auto !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  text-align: left !important;
  color: inherit !important;
  box-shadow: none !important;
  outline: none !important;
}
.effects-box * {
  text-align: left !important;
}

/* 
  Red "Remove" button toggles single-delete mode
*/
.remove-effect-btn {
  background: #ff4d4d;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
}
.remove-effect-btn:hover {
  background: #ff4d4d;
}

/* Indicate it's active with a slight glow */
.activeDelete {
  box-shadow: 0 0 5px rgba(255,0,0,0.8);
}

/* When in delete mode, highlight <li> with a light red background and pointer */
.delete-mode {
  cursor: pointer;
  background: rgba(255, 0, 0, 0.15);
  transition: background 0.2s;
}
.delete-mode:hover {
  background: rgba(255, 0, 0, 0.3);
}
</style>
