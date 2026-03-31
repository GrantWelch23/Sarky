class SupplementHistoryReport {
  constructor(supplements = []) {
    this.supplements = supplements;
    this.title = "Supplement History Report";
    this.timestamp = new Date().toISOString();
    this.columns = ["Supplement Name", "Dosage", "Frequency"];
    this.rows = [];
    this.generateRows();
  }

  generateRows() {
    this.rows = this.supplements.map((supplement) => [
      supplement.name,
      supplement.dosage,
      supplement.frequency
    ]);
  }

  generate() {
    return {
      title: this.title,
      timestamp: this.timestamp,
      columns: this.columns,
      rows: this.rows
    };
  }
}

module.exports = { SupplementHistoryReport };
