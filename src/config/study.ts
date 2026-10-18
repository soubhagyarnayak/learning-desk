const hoursPerDay = Number(process.env.STUDY_HOURS_PER_DAY ?? 4);

if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
  throw new Error('STUDY_HOURS_PER_DAY must be a positive number');
}

/** Study hours in one day; converts task hours into section days. */
export const STUDY_HOURS_PER_DAY = hoursPerDay;
