/**
 * Clinical Scoring Service
 * Handles calculation of test scores for ADAS-Cog 13, FAQ, and MMSE
 */

export interface ADASCog13Responses {
  wordRecall: number; // 0-10
  commands: number; // 0-5
  constructionalPraxis: number; // 0-5
  namingObjects: number; // 0-5
  ideationalPraxis: number; // 0-5
  orientation: number; // 0-8
  wordRecognition: number; // 0-12
  language: number; // 0-5
  comprehension: number; // 0-5
  wordFindingDifficulty: number; // 0-5
  instructionRecall: number; // 0-5
  concentration: number; // 0-5
  delayedWordRecall: number; // 0-10
}

export interface FAQResponses {
  writingChecks: number; // 0-3
  taxRecords: number; // 0-3
  shoppingAlone: number; // 0-3
  playingGames: number; // 0-3
  heatingWater: number; // 0-3
  preparingMeal: number; // 0-3
  currentEvents: number; // 0-3
  bookOrTV: number; // 0-3
  rememberingAppointments: number; // 0-3
  travelingOutside: number; // 0-3
}

export interface MMSEResponses {
  orientationYear: number; // 0-1
  orientationSeason: number; // 0-1
  orientationMonth: number; // 0-1
  orientationDate: number; // 0-1
  orientationDay: number; // 0-1
  orientationState: number; // 0-1
  orientationCounty: number; // 0-1
  orientationTown: number; // 0-1
  orientationHospital: number; // 0-1
  orientationFloor: number; // 0-1
  registrationApple: number; // 0-1
  registrationPenny: number; // 0-1
  registrationTable: number; // 0-1
  attentionSerialSevens: number; // 0-5
  recallApple: number; // 0-1
  recallPenny: number; // 0-1
  recallTable: number; // 0-1
  namingPencil: number; // 0-1
  namingWatch: number; // 0-1
  repetition: number; // 0-1
  threeStepCommand: number; // 0-3
  reading: number; // 0-1
  writing: number; // 0-1
  copying: number; // 0-1
}

export interface TestResult {
  testType: 'ADAS-Cog 13' | 'FAQ' | 'MMSE';
  score: number;
  maxScore: number;
  timestamp: Date;
  responses: ADASCog13Responses | FAQResponses | MMSEResponses;
}

export class ClinicalScoringService {
  /**
   * Calculate ADAS-Cog 13 total score
   * Range: 0-85 (higher = more impairment)
   */
  static calculateADASCog13Score(responses: ADASCog13Responses): number {
    const total =
      responses.wordRecall +
      responses.commands +
      responses.constructionalPraxis +
      responses.namingObjects +
      responses.ideationalPraxis +
      responses.orientation +
      responses.wordRecognition +
      responses.language +
      responses.comprehension +
      responses.wordFindingDifficulty +
      responses.instructionRecall +
      responses.concentration +
      responses.delayedWordRecall;

    return Math.min(Math.max(total, 0), 85);
  }

  /**
   * Calculate FAQ total score
   * Range: 0-30 (higher = more dependency)
   */
  static calculateFAQScore(responses: FAQResponses): number {
    const total =
      responses.writingChecks +
      responses.taxRecords +
      responses.shoppingAlone +
      responses.playingGames +
      responses.heatingWater +
      responses.preparingMeal +
      responses.currentEvents +
      responses.bookOrTV +
      responses.rememberingAppointments +
      responses.travelingOutside;

    return Math.min(Math.max(total, 0), 30);
  }

  /**
   * Calculate MMSE total score
   * Range: 0-30 (lower = more impairment)
   */
  static calculateMMSEScore(responses: MMSEResponses): number {
    const total =
      // Orientation Time (5 points)
      responses.orientationYear +
      responses.orientationSeason +
      responses.orientationMonth +
      responses.orientationDate +
      responses.orientationDay +
      // Orientation Place (5 points)
      responses.orientationState +
      responses.orientationCounty +
      responses.orientationTown +
      responses.orientationHospital +
      responses.orientationFloor +
      // Registration (3 points)
      responses.registrationApple +
      responses.registrationPenny +
      responses.registrationTable +
      // Attention (5 points)
      responses.attentionSerialSevens +
      // Recall (3 points)
      responses.recallApple +
      responses.recallPenny +
      responses.recallTable +
      // Naming (2 points)
      responses.namingPencil +
      responses.namingWatch +
      // Repetition (1 point)
      responses.repetition +
      // 3-Step Command (3 points)
      responses.threeStepCommand +
      // Reading (1 point)
      responses.reading +
      // Writing (1 point)
      responses.writing +
      // Copying (1 point)
      responses.copying;

    return Math.min(Math.max(total, 0), 30);
  }

  /**
   * Get severity classification for ADAS-Cog 13
   */
  static getADASCog13Severity(score: number): string {
    if (score <= 20) return 'Normal';
    if (score <= 30) return 'Mild Impairment';
    if (score <= 50) return 'Moderate Impairment';
    return 'Severe Impairment';
  }

  /**
   * Get severity classification for FAQ
   */
  static getFAQSeverity(score: number): string {
    if (score <= 9) return 'Normal';
    if (score <= 15) return 'Mild Impairment';
    if (score <= 22) return 'Moderate Impairment';
    return 'Severe Dependency';
  }

  /**
   * Get severity classification for MMSE
   */
  static getMMSESeverity(score: number): string {
    if (score >= 24) return 'Normal';
    if (score >= 18) return 'Mild Impairment';
    if (score >= 11) return 'Moderate Impairment';
    return 'Severe Impairment';
  }

  /**
   * Format test result summary
   */
  static formatTestResultSummary(testType: string, score: number, maxScore: number): {
    severity: string;
    interpretation: string;
    percentage: number;
  } {
    const percentage = (score / maxScore) * 100;

    let severity = '';
    let interpretation = '';

    if (testType === 'ADAS-Cog 13') {
      severity = this.getADASCog13Severity(score);
      interpretation = `Score of ${score}/85 indicates ${severity.toLowerCase()}`;
    } else if (testType === 'FAQ') {
      severity = this.getFAQSeverity(score);
      interpretation = `Score of ${score}/30 indicates ${severity.toLowerCase()}`;
    } else if (testType === 'MMSE') {
      severity = this.getMMSESeverity(score);
      interpretation = `Score of ${score}/30 indicates ${severity.toLowerCase()}`;
    }

    return { severity, interpretation, percentage };
  }
}

export default ClinicalScoringService;
