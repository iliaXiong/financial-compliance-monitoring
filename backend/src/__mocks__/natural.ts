/**
 * Mock for natural library to avoid ES module issues in Jest
 */

class MockTfIdf {
  private documents: string[] = [];

  addDocument(text: string): void {
    this.documents.push(text);
  }

  tfidfs(terms: string, callback: (i: number, measure: number) => void): void {
    // 简单的TF-IDF模拟：计算词频
    const termsLower = terms.toLowerCase();
    
    this.documents.forEach((doc, index) => {
      const docLower = doc.toLowerCase();
      const termCount = (docLower.match(new RegExp(termsLower, 'g')) || []).length;
      const score = termCount / Math.max(doc.length, 1) * 100;
      callback(index, score);
    });
  }
}

export default {
  TfIdf: MockTfIdf,
};
