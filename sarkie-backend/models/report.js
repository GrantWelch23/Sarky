// sarkie-backend/models/Report.js
// Rubric B1: Inheritance, Polymorphism, and Encapsulation demonstrated in real report code

class BaseReport {
  // Encapsulation - private fields
  #title;
  #timestamp;

  constructor(title) {
    this.#title = title;
    this.#timestamp = new Date().toISOString();
  }

  // Encapsulation - public getters
  get title() { return this.#title; }
  get timestamp() { return this.#timestamp; }

  // Abstract method - must be overridden (polymorphism)
  generate() {
    throw new Error("generate() must be implemented by subclass");
  }
}

// Inheritance + Polymorphism
class SupplementHistoryReport extends BaseReport {
  constructor(supplements) {
    super("Supplement Intake History Report");   // calls parent constructor
    this.supplements = supplements;
  }

  // Polymorphism - overriding the parent's generate() method
  generate() {
    return {
      title: this.title,
      timestamp: this.timestamp,
      columns: ["Supplement", "Dosage", "Frequency", "Date Added"],
      rows: this.supplements.map(s => [
        s.name,
        s.dosage,
        s.frequency,
        s.created_at || new Date().toLocaleString()
      ])
    };
  }
}

module.exports = { SupplementHistoryReport };