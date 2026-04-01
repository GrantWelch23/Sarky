<template>
  <div class="report-container">
    <div class="report-header">
      <h2 class="report-title">Supplement Activity Report</h2>
      <div class="report-controls">
        <button
          v-for="btn in ['weekly', 'monthly']"
          :key="btn"
          @click="setPeriod(btn)"
          :class="{ active: period === btn }"
          class="period-btn"
        >
          {{ btn.charAt(0).toUpperCase() + btn.slice(1) }}
        </button>
      </div>
    </div>

    <div class="report-table-wrapper">
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Supplements</th>
            <th>Positive Effects</th>
            <th>Negative Effects</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in reportRows" :key="row.period">
            <td class="date-cell">{{ row.label }}</td>
            <td>{{ row.supplements || '—' }}</td>
            <td class="positive-cell">{{ row.positiveEffects || '—' }}</td>
            <td class="negative-cell">{{ row.negativeEffects || '—' }}</td>
          </tr>
          <tr v-if="reportRows.length === 0">
            <td colspan="4" class="empty-cell">No data available</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../Services/api';

const period = ref('weekly');
const reportRows = ref([]);

const user = JSON.parse(localStorage.getItem('user'));
const userId = user ? user.id : null;

const toDateStr = (val) => (val ? String(val).split('T')[0] : '');

const setPeriod = (newPeriod) => {
  period.value = newPeriod;
  fetchReportData();
};

const fetchReportData = async () => {
  if (!userId) return;

  try {
    const res = await api.get('/supplements/chart/usage-data', {
      params: { userId, period: period.value }
    });

    const { supplements, positive_effects, negative_effects } = res.data;

    // Build the same Monday-anchored or month-anchored periods as the chart uses.
    let periods = [];

    if (period.value === 'weekly') {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() + daysToMonday);
      thisMonday.setHours(0, 0, 0, 0);

      for (let i = 3; i >= 0; i--) {
        const date = new Date(thisMonday);
        date.setDate(thisMonday.getDate() - (i * 7));
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        periods.push({ key: `${year}-${month}-${day}`, date });
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periods.push({ key: `${year}-${month}-01`, date });
      }
    }

    reportRows.value = periods.map(({ key, date }) => {
      const label = period.value === 'weekly'
        ? `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const suppNames = supplements
        .filter(s => toDateStr(s.period) === key)
        .map(s => `${s.name} (×${s.count})`)
        .join(', ');

      const posNames = positive_effects
        .filter(e => toDateStr(e.period) === key)
        .map(e => `${e.effect_description} (×${e.count})`)
        .join(', ');

      const negNames = negative_effects
        .filter(e => toDateStr(e.period) === key)
        .map(e => `${e.effect_description} (×${e.count})`)
        .join(', ');

      return {
        period: key,
        label,
        supplements: suppNames,
        positiveEffects: posNames,
        negativeEffects: negNames,
      };
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
  }
};

onMounted(() => {
  fetchReportData();
});
</script>

<style scoped>
.report-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #e8e8e8;
  border-radius: 10px;
  padding: 16px 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.report-title {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.report-controls {
  display: flex;
  gap: 8px;
}

.period-btn {
  padding: 5px 12px;
  background: #444654;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.period-btn:hover {
  background: #66677a;
}

.period-btn.active {
  background: #26734d;
  box-shadow: 0 0 6px rgba(38, 115, 77, 0.5);
}

.report-table-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.report-table thead th {
  background: #444654;
  color: white;
  padding: 8px 10px;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 1;
}

.report-table tbody tr:nth-child(even) {
  background: #d8d8d8;
}

.report-table tbody tr:hover {
  background: #c8c8c8;
}

.report-table td {
  padding: 8px 10px;
  vertical-align: top;
  border-bottom: 1px solid #ccc;
  color: #333;
}

.date-cell {
  white-space: nowrap;
  font-weight: 600;
  color: #444;
}

.positive-cell {
  color: #1a6635;
}

.negative-cell {
  color: #8b1a1a;
}

.empty-cell {
  text-align: center;
  color: #888;
  padding: 20px;
}
</style>
