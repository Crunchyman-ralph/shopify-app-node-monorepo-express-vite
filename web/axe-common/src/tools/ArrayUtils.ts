export const ArrayUtils = {
  emptyArray: [],
  /**
   * Return first array item, handling undefined value
   */
  first: <I>(array: I[]): I | undefined => array[0],

  /**
   * Return last array item, handling undefined value
   */
  last: <I>(array: I[]): I | undefined => array[array.length - 1],

  filterNonNullable: <I>(item: I): item is NonNullable<I> =>
    item !== undefined && item !== null,

  newArrayByLength: (length: number, firstIndex = 1) =>
    Array.from({ length })
      .fill(null)
      .map((_, i) => i + firstIndex),

  unique: <I>(arr: I[]) => [...new Set(arr)],
};
