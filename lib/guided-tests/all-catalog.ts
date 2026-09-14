import { GUIDED_TESTS } from './catalog';
import { CONTEXTUAL_GUIDED_TESTS } from './contextual-catalog';
import { APG_GUIDED_TESTS } from './apg-catalog';

export const ALL_GUIDED_TESTS = [
  ...GUIDED_TESTS,
  ...CONTEXTUAL_GUIDED_TESTS,
  ...APG_GUIDED_TESTS,
];
