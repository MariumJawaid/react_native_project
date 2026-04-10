const logger = require('../config/logger');

class ScoringEngine {
  static validateFAQResponses(responses) {
    const errors = [];
    for (let i = 1; i <= 10; i++) {
      const key = `q${i}`;
      if (!(key in responses)) {
        errors.push(`Missing FAQ question ${i}`);
      } else {
        const score = parseInt(responses[key]);
        if (isNaN(score) || score < 0 || score > 3) {
          errors.push(`Invalid FAQ Q${i} score: ${responses[key]} (must be 0-3)`);
        }
      }
    }
    return errors;
  }

  static calculateFAQTotal(responses) {
    const errors = this.validateFAQResponses(responses);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const total = Object.values(responses).reduce((sum, score) => {
      return sum + parseInt(score || 0);
    }, 0);

    if (total < 0 || total > 30) {
      throw new Error(`Invalid FAQ total: ${total} (must be 0-30)`);
    }

    return {
      FAQTOTAL: total,
      severity: this.getFAQSeverity(total),
      classification: 'FAQ',
      maxScore: 30
    };
  }

  static calculateMMSETotal(responses) {
    const total = Object.values(responses).reduce((sum, score) => {
      return sum + parseInt(score || 0);
    }, 0);

    if (total < 0 || total > 30) {
      throw new Error(`Invalid MMSE total: ${total} (must be 0-30)`);
    }

    return {
      MMSCORE: total,
      severity: this.getMMSESeverity(total),
      classification: 'MMSE',
      maxScore: 30
    };
  }

  static calculateADASTotal(responses) {
    const total = Object.values(responses).reduce((sum, score) => {
      return sum + parseInt(score || 0);
    }, 0);

    if (total < 0 || total > 85) {
      throw new Error(`Invalid ADAS total: ${total} (must be 0-85)`);
    }

    return {
      TOTAL13: total,
      severity: this.getADASeverity(total),
      classification: 'ADAS-Cog 13',
      maxScore: 85
    };
  }

  static getFAQSeverity(score) {
    if (score <= 9) return 'Normal - Independent';
    if (score <= 15) return 'Mild Impairment - Some assistance needed';
    if (score <= 22) return 'Moderate Impairment - Significant assistance needed';
    return 'Severe Dependency - Complete assistance required';
  }

  static getMMSESeverity(score) {
    if (score >= 24) return 'Normal cognition';
    if (score >= 18) return 'Mild cognitive impairment';
    if (score >= 11) return 'Moderate cognitive impairment';
    return 'Severe cognitive impairment';
  }

  static getADASeverity(score) {
    if (score <= 20) return 'Normal - Minimal impairment';
    if (score <= 30) return 'Mild impairment';
    if (score <= 50) return 'Moderate impairment';
    return 'Severe impairment';
  }
}

module.exports = ScoringEngine;
