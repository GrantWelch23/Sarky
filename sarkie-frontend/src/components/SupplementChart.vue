<template>
  <div class="chart-container">
    <div class="chart-controls">
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
    
    <div class="chart-wrapper">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Chart, registerables } from 'chart.js';
import { api } from '../Services/api';

Chart.register(...registerables);

const chartCanvas = ref(null);
let chartInstance = null;
const period = ref('weekly');
const user = JSON.parse(localStorage.getItem('user'));
const userId = user ? user.id : null;

const setPeriod = (newPeriod) => {
  period.value = newPeriod;
  fetchChartData();
};

const fetchChartData = async () => {
  if (!userId) {
    console.warn('No user logged in');
    renderEmptyChart();
    return;
  }

  try {
    console.log('Fetching chart data for userId:', userId, 'period:', period.value);
    const res = await api.get('/supplements/chart/usage-data', {
      params: { userId, period: period.value }
    });

    const { supplements, positive_effects, negative_effects } = res.data;
    console.log('Data received:', { supplements, positive_effects, negative_effects });

    // Generate all expected periods (4 weeks or 4 months)
    let periods = [];
    
    if (period.value === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        periods.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0]);
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periods.push(`${year}-${month}-01`);
      }
    }

    const labelFormatter = (dateStr) => {
      const date = new Date(dateStr);
      if (period.value === 'weekly') {
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    };

    const labels = periods.map(labelFormatter);

    // Calculate total supplements per period
    const supplementsTotals = periods.map(p => {
      const total = supplements.filter(s => s.period === p).reduce((sum, s) => sum + s.count, 0);
      return total;
    });

    // Calculate total positive effects per period
    const positiveEffectsTotals = periods.map(p => {
      const total = positive_effects.filter(e => e.period === p).reduce((sum, e) => sum + e.count, 0);
      return total;
    });

    // Calculate total negative effects per period
    const negativeEffectsTotals = periods.map(p => {
      const total = negative_effects.filter(e => e.period === p).reduce((sum, e) => sum + e.count, 0);
      return total;
    });

    console.log('Totals - supplements:', supplementsTotals, 'positive:', positiveEffectsTotals, 'negative:', negativeEffectsTotals);

    const datasets = [
      {
        label: 'Supplements',
        data: supplementsTotals,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Positive Effects',
        data: positiveEffectsTotals,
        backgroundColor: 'rgba(40, 167, 69, 0.7)',
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 1
      },
      {
        label: 'Negative Effects',
        data: negativeEffectsTotals,
        backgroundColor: 'rgba(220, 53, 69, 0.7)',
        borderColor: 'rgba(220, 53, 69, 1)',
        borderWidth: 1
      }
    ];

    renderChart(labels, datasets);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    renderEmptyChart();
  }
};

const renderChart = (labels, datasets) => {
  if (chartInstance) {
    chartInstance.destroy();
  }

  if (!chartCanvas.value) {
    console.error('Canvas ref not available');
    return;
  }

  console.log('Creating chart with labels:', labels, 'datasets:', datasets);

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        x: {
          stacked: false,
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          stacked: false,
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });

  console.log('Chart created successfully');
};

const renderEmptyChart = () => {
  if (chartInstance) {
    chartInstance.destroy();
  }

  if (!chartCanvas.value) {
    console.error('Canvas ref not available');
    return;
  }

  console.log('Rendering empty chart');

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: ['No data available'],
      datasets: [{
        label: 'No data',
        data: [0],
        backgroundColor: 'rgba(200, 200, 200, 0.3)',
        borderColor: 'rgba(200, 200, 200, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
};

onMounted(() => {
  fetchChartData();
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #e8e8e8;
  border-radius: 10px;
  box-sizing: border-box;
}

.chart-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.period-btn {
  padding: 10px 20px;
  background: #444654;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
  flex-shrink: 0;
}

.period-btn:hover {
  background: #66677a;
}

.period-btn.active {
  background: #26734d;
  box-shadow: 0 0 8px rgba(38, 115, 77, 0.5);
}

.chart-wrapper {
  flex: 1;
  position: relative;
  width: 100%;
  max-height: 100%;
  overflow: auto;
  min-height: 300px;
}

.chart-wrapper canvas {
  max-height: 100%;
  min-width: 100%;
}
</style>
