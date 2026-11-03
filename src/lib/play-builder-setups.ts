export type SetupVariant = 'default' | 'short-yardage' | 'goal-line' | 'reverse-goal-line' | 'punt';

/** Distances include the end zones, matching the field's yard-coordinate system. */
export function setupYardPositions(variant: SetupVariant, field: { total: number; aGoal: number; bGoal: number }, standard: { lineOfScrimmage: number; lineToGain: number; quarterbackDepth: number }) {
 const { total, aGoal, bGoal } = field;
 const shortField = bGoal - aGoal < 60;
 let los = standard.lineOfScrimmage, ltg = standard.lineToGain, depth = standard.quarterbackDepth;
 if (variant === 'short-yardage') { ltg = aGoal + 20; los = ltg - 6; }
 if (variant === 'goal-line') { los = bGoal - 10; ltg = bGoal; }
 if (variant === 'reverse-goal-line') { los = aGoal + 7; ltg = aGoal + 20; }
 if (variant === 'punt') { los = aGoal + (shortField ? 15 : 30); ltg = Math.min(bGoal, los + 10); depth = 7; }
 const regularR = los - depth - 7;
 const receiver = bGoal - (shortField ? 10 : 20);
 return { los, ltg, depth, referee: variant === 'reverse-goal-line' ? 0 : Math.max(aGoal, regularR), wideReferee: variant !== 'reverse-goal-line' && regularR <= aGoal,
  fieldJudge: variant === 'goal-line' ? bGoal : variant === 'short-yardage' ? ltg : variant === 'punt' ? receiver - 5 : los + 10,
  backJudge: variant === 'goal-line' ? total : variant === 'punt' ? receiver + 3 : los + 20,
  receiver, fourthDown: variant === 'short-yardage' || variant === 'punt' };
}
